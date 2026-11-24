import { employeeChildController } from './child.base';
import {
  CreateExperienceDto,
  CreateQualificationDto,
  CreateRewardDto,
  CreateSkillDto,
  UpdateExperienceDto,
  UpdateQualificationDto,
  UpdateRewardDto,
  UpdateSkillDto,
} from './profile.dto';
import { ExperiencesService, QualificationsService, RewardsService, SkillsService } from './profile.services';

const view = ['employees.view'] as const;
const edit = ['employees.update'] as const;

export const QualificationsController = employeeChildController({
  path: 'qualifications',
  service: QualificationsService as never,
  createDto: CreateQualificationDto,
  updateDto: UpdateQualificationDto,
  view: [...view],
  edit: [...edit],
});

export const ExperiencesController = employeeChildController({
  path: 'experiences',
  service: ExperiencesService as never,
  createDto: CreateExperienceDto,
  updateDto: UpdateExperienceDto,
  view: [...view],
  edit: [...edit],
});

export const SkillsController = employeeChildController({
  path: 'skills',
  service: SkillsService as never,
  createDto: CreateSkillDto,
  updateDto: UpdateSkillDto,
  view: [...view],
  edit: [...edit],
});

export const RewardsController = employeeChildController({
  path: 'rewards',
  service: RewardsService as never,
  createDto: CreateRewardDto,
  updateDto: UpdateRewardDto,
  view: [...view],
  edit: [...edit],
});
