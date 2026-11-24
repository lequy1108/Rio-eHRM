import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, relative } from 'path';
import { FindOptionsOrder, Repository } from 'typeorm';
import { AuditService } from '../../../common/audit/audit.service';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { AuditAction } from '../../../common/enums';
import { FILE_TYPES, PRIVATE_ROOT, uploadOptions } from '../../../common/shared/upload';
import { Employee } from '../entities/employee.entity';
import { EmployeeChildService } from './child.base';
import { EmployeeDocument } from './document.entity';

const emptyToNull = () => Transform(({ value }) => (value === '' || value === 'null' ? null : typeof value === 'string' ? value.trim() : value));

export class UploadDocumentDto {
  @IsOptional() @IsUUID() @emptyToNull() categoryId?: string | null;
  /** Tên hiển thị; bỏ trống thì dùng tên file */
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() name?: string | null;
  @IsOptional() @IsString() @emptyToNull() note?: string | null;
}

export class UpdateDocumentDto extends UploadDocumentDto {}

/** Tên file gốc từ multer là latin1, đổi lại UTF-8 để giữ tiếng Việt */
const fixName = (s: string) => Buffer.from(s, 'latin1').toString('utf8');
const fmtSize = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

@Injectable()
export class DocumentsService extends EmployeeChildService<EmployeeDocument> {
  protected readonly entityType = 'EmployeeDocument';
  protected readonly notFoundMessage = 'Không tìm thấy tài liệu';
  protected readonly order: FindOptionsOrder<EmployeeDocument> = { createdAt: 'DESC' };
  protected readonly relations = ['category'];

  constructor(
    @InjectRepository(EmployeeDocument) repo: Repository<EmployeeDocument>,
    @InjectRepository(Employee) employees: Repository<Employee>,
    audit: AuditService,
  ) {
    super(repo, employees, audit);
  }

  protected label(e: EmployeeDocument) {
    return e.name;
  }
  protected snapshot(e: EmployeeDocument) {
    return {
      category: e.category?.name ?? null,
      name: e.name,
      fileName: `${e.originalName} (${fmtSize(e.size)})`,
      note: e.note ?? null,
    };
  }

  async upload(employeeId: string, file: Express.Multer.File, dto: UploadDocumentDto) {
    try {
      await this.ensureEmployee(employeeId);
    } catch (e) {
      void unlink(file.path).catch(() => undefined);
      throw e;
    }
    const originalName = fixName(file.originalname);
    const saved = await this.repo.save(
      this.repo.create({
        employeeId,
        categoryId: dto.categoryId ?? null,
        name: dto.name || originalName.replace(/\.[^.]+$/, ''),
        note: dto.note ?? null,
        originalName,
        mimeType: file.mimetype,
        size: file.size,
        filePath: relative(PRIVATE_ROOT, file.path).replace(/\\/g, '/'),
      }),
    );
    const full = await this.findOne(employeeId, saved.id);
    await this.log(AuditAction.CREATE, full);
    return full;
  }

  /** Đường dẫn file trên đĩa (đã kiểm tra quyền ở controller) */
  async file(employeeId: string, id: string) {
    const doc = await this.findOne(employeeId, id);
    const row = await this.repo.findOne({ where: { id }, select: { id: true, filePath: true } });
    const abs = join(PRIVATE_ROOT, row!.filePath);
    if (!abs.startsWith(PRIVATE_ROOT) || !existsSync(abs)) throw new BadRequestException('File không còn trên máy chủ');
    return { doc, abs };
  }
}

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees/:employeeId/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @Permissions('employees.view', 'employees.documents')
  findAll(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.findAll(employeeId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @Permissions('employees.update', 'employees.documents')
  @UseInterceptors(FileInterceptor('file', uploadOptions({ folder: 'documents', types: FILE_TYPES.document, maxSizeMB: 10, private: true })))
  upload(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    return this.service.upload(employeeId, file, dto);
  }

  /** Xem (inline) hoặc tải về (?download=1) */
  @Get(':id/file')
  @Permissions('employees.view', 'employees.documents')
  async file(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { doc, abs } = await this.service.file(employeeId, id);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(abs));
  }

  @Patch(':id')
  @Permissions('employees.update', 'employees.documents')
  update(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.service.update(employeeId, id, dto);
  }

  @Delete(':id')
  @Permissions('employees.update', 'employees.documents')
  remove(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(employeeId, id);
  }
}
