import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { DependentsController } from './dependents/dependents.controller';
import { EmployeeDependent } from './dependents/dependent.entity';
import { DependentsService } from './dependents/dependents.service';
import { EmployeesController } from './employees.controller';
import { EmployeesScheduler } from './employees.scheduler';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User, EmployeeDependent])],
  controllers: [EmployeesController, DependentsController],
  providers: [EmployeesService, EmployeesScheduler, DependentsService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
