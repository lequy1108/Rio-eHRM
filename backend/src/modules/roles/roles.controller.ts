import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateRoleDto, UpdateRoleDto } from './role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  /** Danh sách vai trò (cho ô chọn vai trò khi tạo tài khoản) */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('permissions')
  @Permissions('roles.manage')
  permissions() {
    return this.service.permissionCatalog();
  }

  @Post()
  @Permissions('roles.manage')
  create(@Body() dto: CreateRoleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('roles.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('roles.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
