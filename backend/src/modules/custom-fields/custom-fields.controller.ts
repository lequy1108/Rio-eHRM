import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateCustomFieldDto, ReorderCustomFieldsDto, UpdateCustomFieldDto } from './custom-field.dto';
import { CustomFieldsService } from './custom-fields.service';

@ApiTags('Custom fields')
@ApiBearerAuth()
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  /** Định nghĩa trường để vẽ form/hiển thị; activeOnly=false để lấy cả trường ngừng dùng */
  @Get()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.service.findAll('EMPLOYEE', activeOnly !== 'false');
  }

  @Post()
  @Permissions('settings.manage')
  create(@Body() dto: CreateCustomFieldDto) {
    return this.service.create(dto);
  }

  @Put('order')
  @Permissions('settings.manage')
  reorder(@Body() dto: ReorderCustomFieldsDto) {
    return this.service.reorder(dto.ids);
  }

  @Patch(':id')
  @Permissions('settings.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomFieldDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('settings.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
