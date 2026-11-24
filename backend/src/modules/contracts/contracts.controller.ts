import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { FILE_TYPES, uploadOptions } from '../../common/shared/upload';
import { ContractsService } from './contracts.service';
import {
  CreateAppendixDto,
  CreateContractDto,
  CreateContractTypeDto,
  CreateTemplateDto,
  QueryContractDto,
  TerminateContractDto,
  UpdateAppendixDto,
  UpdateContractDto,
  UpdateContractTypeDto,
  UpdateTemplateDto,
} from './dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contract-types')
export class ContractTypesController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Permissions('contracts.view')
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.service.findTypes(activeOnly === 'true');
  }

  @Post()
  @Permissions('contracts.manage')
  create(@Body() dto: CreateContractTypeDto) {
    return this.service.createType(dto);
  }

  @Patch(':id')
  @Permissions('contracts.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractTypeDto) {
    return this.service.updateType(id, dto);
  }

  @Delete(':id')
  @Permissions('contracts.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeType(id);
  }
}

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contract-templates')
export class ContractTemplatesController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Permissions('contracts.view')
  findAll() {
    return this.service.findTemplates();
  }

  /** Danh sách biến dùng được trong mẫu */
  @Get('placeholders')
  @Permissions('contracts.view')
  placeholders() {
    return this.service.placeholders();
  }

  @Get(':id')
  @Permissions('contracts.manage')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findTemplate(id);
  }

  @Post()
  @Permissions('contracts.manage')
  create(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Patch(':id')
  @Permissions('contracts.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.updateTemplate(id, dto);
  }

  @Delete(':id')
  @Permissions('contracts.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeTemplate(id);
  }
}

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @Permissions('contracts.view')
  findAll(@Query() q: QueryContractDto) {
    return this.service.findAll(q);
  }

  @Get('stats')
  @Permissions('contracts.view')
  stats() {
    return this.service.stats();
  }

  /** Xem trước số hợp đồng sẽ được cấp */
  @Get('next-number')
  @Permissions('contracts.manage')
  nextNumber(@Query('signDate') signDate?: string, @Query('employeeCode') code?: string, @Query('typeCode') type?: string) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(signDate ?? '') ? signDate! : new Date().toISOString().slice(0, 10);
    return this.service.nextNumber(d, code ?? '', type ?? '');
  }

  @Get(':id')
  @Permissions('contracts.view')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /** HTML đã điền dữ liệu theo mẫu, dùng cho trang in */
  @Get(':id/render')
  @Permissions('contracts.view')
  render(@Param('id', ParseUUIDPipe) id: string, @Query('templateId') templateId?: string) {
    return this.service.render(id, templateId || undefined);
  }

  @Post()
  @Permissions('contracts.manage')
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('contracts.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/terminate')
  @HttpCode(200)
  @Permissions('contracts.manage')
  terminate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TerminateContractDto) {
    return this.service.terminate(id, dto);
  }

  @Delete(':id')
  @Permissions('contracts.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/signed-file')
  @ApiConsumes('multipart/form-data')
  @Permissions('contracts.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions({ folder: 'contracts', types: FILE_TYPES.document, maxSizeMB: 15, private: true })))
  attach(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    return this.service.attachSigned(id, file);
  }

  @Get(':id/signed-file')
  @Permissions('contracts.view')
  async signed(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const f = await this.service.signedFile(id);
    res.set({
      'Content-Type': f.mime,
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(createReadStream(f.abs));
  }

  @Post(':id/appendices')
  @Permissions('contracts.manage')
  addAppendix(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateAppendixDto) {
    return this.service.addAppendix(id, dto);
  }

  @Patch(':id/appendices/:aid')
  @Permissions('contracts.manage')
  updateAppendix(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('aid', ParseUUIDPipe) aid: string,
    @Body() dto: UpdateAppendixDto,
  ) {
    return this.service.updateAppendix(id, aid, dto);
  }

  @Delete(':id/appendices/:aid')
  @Permissions('contracts.manage')
  removeAppendix(@Param('id', ParseUUIDPipe) id: string, @Param('aid', ParseUUIDPipe) aid: string) {
    return this.service.removeAppendix(id, aid);
  }
}
