import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { unlink } from 'fs/promises';
import { hasPermission } from '../../common/permissions';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { SettingsService } from '../settings/settings.service';
import { CurrentUser, type JwtUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { IdsDto } from '../../common/dto/ids.dto';
import { FILE_TYPES, publicPath, uploadOptions } from '../../common/shared/upload';
import { CreateEmployeeDto, QueryEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { EmployeesService } from './employees.service';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const fileBody = { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } };

function sendFile(res: Response, buffer: Buffer, filename: string, type = XLSX) {
  res.set({
    'Content-Type': type,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
  });
  res.end(buffer);
}

const SENSITIVE_FIELDS = [
  'personalTaxCode',
  'socialInsuranceNumber',
  'healthInsurancePlace',
  'bankId',
  'bank',
  'bankAccountNumber',
  'bankAccountName',
  'bankBranch',
] as const;

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly service: EmployeesService,
    private readonly settings: SettingsService,
    private readonly customFields: CustomFieldsService,
  ) {}

  /** Bỏ thông tin nhạy cảm (thuế, BHXH, ngân hàng, trường tuỳ chỉnh đánh dấu nhạy cảm) */
  private async sensitiveKeys() {
    const defs = await this.customFields.findAll('EMPLOYEE');
    return defs.filter((d) => d.sensitive);
  }

  @Get()
  @Permissions('employees.view')
  async findAll(@Query() query: QueryEmployeeDto, @CurrentUser() user: JwtUser) {
    const res = await this.service.findAll(query);
    if (!hasPermission(user.permissions, 'employees.sensitive')) {
      const hidden = await this.sensitiveKeys();
      for (const e of res.items) for (const d of hidden) delete e.customFields?.[d.key];
    }
    return res;
  }

  /** Sinh nhật, kỷ niệm ngày vào làm sắp tới (cho bảng điều khiển) */
  @Get('upcoming-events')
  @Permissions('employees.view')
  upcomingEvents(@Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number) {
    return this.service.upcomingEvents(Math.min(Math.max(days, 1), 366));
  }

  @Get('org-chart')
  @Permissions('employees.view')
  orgChart() {
    return this.service.orgChart();
  }

  @Get('stats')
  @Permissions('employees.view')
  stats() {
    return this.service.stats();
  }

  /** Xuất Excel theo bộ lọc hiện tại */
  @Get('export')
  @Permissions('employees.export')
  async export(@Query() query: QueryEmployeeDto, @Res() res: Response, @CurrentUser() user: JwtUser) {
    const buffer = await this.service.exportExcel(query, hasPermission(user.permissions, 'employees.sensitive'));
    const date = new Date().toISOString().slice(0, 10);
    sendFile(res, buffer, `nhan-vien_${date}.xlsx`);
  }

  /** File Excel mẫu để nhập */
  @Get('import/template')
  @Permissions('employees.import')
  async template(@Res() res: Response) {
    sendFile(res, await this.service.importTemplate(), 'mau-nhap-nhan-vien.xlsx');
  }

  /** Nhập từ Excel. dryRun=true: chỉ kiểm tra và trả về lỗi theo dòng */
  @Post('import')
  @Permissions('employees.import', 'employees.create')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', uploadOptions({ types: FILE_TYPES.excel, maxSizeMB: 10 })))
  import(
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun', new ParseBoolPipe({ optional: true })) dryRun = true,
  ) {
    if (!file) throw new BadRequestException('Chưa chọn file');
    return this.service.importExcel(file.buffer, dryRun);
  }

  @Post('bulk-delete')
  @Permissions('employees.delete')
  bulkRemove(@Body() dto: IdsDto) {
    return this.service.bulkRemove(dto.ids);
  }

  @Get(':id/history')
  @Permissions('employees.view')
  async history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @CurrentUser() user: JwtUser,
  ) {
    const res = await this.service.history(id, page, Math.min(limit, 100));
    if (!hasPermission(user.permissions, 'employees.sensitive')) {
      const labels = (await this.sensitiveKeys()).map((d) => d.label);
      for (const a of res.items) for (const k of [...SENSITIVE_FIELDS, ...labels]) delete a.changes?.[k];
    }
    return res;
  }

  @Get(':id')
  @Permissions('employees.view')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    const emp = await this.service.findOne(id);
    // Không có quyền 'employees.sensitive' thì ẩn thông tin thuế, BHXH, ngân hàng
    if (!hasPermission(user.permissions, 'employees.sensitive')) {
      for (const k of SENSITIVE_FIELDS) (emp as unknown as Record<string, unknown>)[k] = undefined;
      for (const d of await this.sensitiveKeys()) delete emp.customFields?.[d.key];
    }
    return { ...emp, probationEnd: await this.service.probationEnd(emp) };
  }

  @Post()
  @Permissions('employees.create')
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('employees.update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: JwtUser) {
    return this.service.update(id, dto, { canSensitive: hasPermission(user.permissions, 'employees.sensitive') });
  }

  @Post(':id/avatar')
  @Permissions('employees.update')
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileBody)
  @UseInterceptors(FileInterceptor('file', uploadOptions({ folder: 'avatars', types: FILE_TYPES.image, maxSizeMB: 20 })))
  avatar(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn ảnh');
    // Giới hạn dung lượng theo Cài đặt → Quy tắc nhân sự (multer chặn trần 20 MB)
    const max = this.settings.get('employee').avatarMaxMB;
    if (file.size > max * 1024 * 1024) {
      void unlink(file.path).catch(() => undefined);
      throw new BadRequestException(`Ảnh vượt quá ${max} MB`);
    }
    return this.service.setAvatar(id, publicPath('avatars', file.filename));
  }

  @Delete(':id')
  @Permissions('employees.delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
