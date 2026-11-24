import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesModule } from '../employees/employees.module';
import { User } from '../users/entities/user.entity';
import { ContractTemplatesController, ContractTypesController, ContractsController } from './contracts.controller';
import { ContractsScheduler } from './contracts.scheduler';
import { ContractsService } from './contracts.service';
import { Contract, ContractAppendix, ContractTemplate, ContractType } from './contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contract, ContractType, ContractTemplate, ContractAppendix, User]), EmployeesModule],
  controllers: [ContractTypesController, ContractTemplatesController, ContractsController],
  providers: [ContractsService, ContractsScheduler],
  exports: [ContractsService],
})
export class ContractsModule {}
