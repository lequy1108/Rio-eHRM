import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, QueryDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  findAll(@Query() query: QueryDepartmentDto) {
    return this.service.findAll(query);
  }

  @Get('tree')
  tree() {
    return this.service.tree();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('organization.manage')
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Permissions('organization.manage')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('organization.manage')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
