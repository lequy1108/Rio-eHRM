import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/entities/department.entity';
import { Position } from '../positions/entities/position.entity';
import { User } from '../users/entities/user.entity';
import { DependentsController } from './dependents/dependents.controller';
import { EmployeeDependent } from './dependents/dependent.entity';
import { DependentsService } from './dependents/dependents.service';
import { EmployeesController } from './employees.controller';
import { EmployeesScheduler } from './employees.scheduler';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { EmployeeDocument } from './profile/document.entity';
import { DocumentsController, DocumentsService } from './profile/documents';
import { ExperiencesController, QualificationsController, RewardsController, SkillsController } from './profile/profile.controllers';
import { EmployeeExperience, EmployeeQualification, EmployeeReward, EmployeeSkill } from './profile/profile.entities';
import { ExperiencesService, QualificationsService, RewardsService, SkillsService } from './profile/profile.services';
import { EmployeeWorkHistory, WorkHistoryController, WorkHistoryService } from './profile/work-history';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      User,
      Department,
      Position,
      EmployeeDependent,
      EmployeeQualification,
      EmployeeExperience,
      EmployeeSkill,
      EmployeeReward,
      EmployeeDocument,
      EmployeeWorkHistory,
    ]),
  ],
  controllers: [
    EmployeesController,
    DependentsController,
    QualificationsController,
    ExperiencesController,
    SkillsController,
    RewardsController,
    DocumentsController,
    WorkHistoryController,
  ],
  providers: [
    EmployeesService,
    EmployeesScheduler,
    DependentsService,
    QualificationsService,
    ExperiencesService,
    SkillsService,
    RewardsService,
    DocumentsService,
    WorkHistoryService,
  ],
  exports: [EmployeesService],
})
export class EmployeesModule {}
