import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CreateDependentDto, UpdateDependentDto } from './dependent.dto';
import { DependentsService } from './dependents.service';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees/:employeeId/dependents')
export class DependentsController {
  constructor(private readonly service: DependentsService) {}

  @Get()
  @Permissions('employees.view', 'employees.sensitive')
  findAll(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.findAll(employeeId);
  }

  @Post()
  @Permissions('employees.update', 'employees.sensitive')
  create(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() dto: CreateDependentDto) {
    return this.service.create(employeeId, dto);
  }

  @Patch(':id')
  @Permissions('employees.update', 'employees.sensitive')
  update(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDependentDto,
  ) {
    return this.service.update(employeeId, id, dto);
  }

  @Delete(':id')
  @Permissions('employees.update', 'employees.sensitive')
  remove(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(employeeId, id);
  }
}
