import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, Repository } from 'typeorm';
import { AuditService } from '../../../common/audit/audit.service';
import { Employee } from '../entities/employee.entity';
import { dateOrder, EmployeeChildService } from './child.base';
import { EmployeeExperience, EmployeeQualification, EmployeeReward, EmployeeSkill } from './profile.entities';

export const QUALIFICATION_KIND_LABEL = { DEGREE: 'Bằng cấp', CERTIFICATE: 'Chứng chỉ' };
export const SKILL_KIND_LABEL = { SKILL: 'Kỹ năng', LANGUAGE: 'Ngoại ngữ' };
export const REWARD_KIND_LABEL = { REWARD: 'Khen thưởng', DISCIPLINE: 'Kỷ luật' };

@Injectable()
export class QualificationsService extends EmployeeChildService<EmployeeQualification> {
  protected readonly entityType = 'EmployeeQualification';
  protected readonly notFoundMessage = 'Không tìm thấy bằng cấp/chứng chỉ';
  protected readonly order: FindOptionsOrder<EmployeeQualification> = { kind: 'ASC', issueDate: 'DESC', createdAt: 'ASC' };
  protected readonly relations = ['educationLevel'];

  constructor(
    @InjectRepository(EmployeeQualification) repo: Repository<EmployeeQualification>,
    @InjectRepository(Employee) employees: Repository<Employee>,
    audit: AuditService,
  ) {
    super(repo, employees, audit);
  }

  protected label(e: EmployeeQualification) {
    return e.name;
  }
  protected validate(e: EmployeeQualification) {
    dateOrder(e.issueDate, e.expiryDate, 'Ngày hết hạn phải sau ngày cấp');
  }
  protected snapshot(e: EmployeeQualification) {
    return {
      kind: QUALIFICATION_KIND_LABEL[e.kind],
      name: e.name,
      educationLevel: e.educationLevel?.name ?? null,
      major: e.major ?? null,
      institution: e.institution ?? null,
      grade: e.grade ?? null,
      certificateNumber: e.certificateNumber ?? null,
      issueDate: e.issueDate ?? null,
      expiryDate: e.expiryDate ?? null,
      note: e.note ?? null,
    };
  }
}

@Injectable()
export class ExperiencesService extends EmployeeChildService<EmployeeExperience> {
  protected readonly entityType = 'EmployeeExperience';
  protected readonly notFoundMessage = 'Không tìm thấy kinh nghiệm làm việc';
  protected readonly order: FindOptionsOrder<EmployeeExperience> = { fromDate: 'DESC', createdAt: 'ASC' };

  constructor(
    @InjectRepository(EmployeeExperience) repo: Repository<EmployeeExperience>,
    @InjectRepository(Employee) employees: Repository<Employee>,
    audit: AuditService,
  ) {
    super(repo, employees, audit);
  }

  protected label(e: EmployeeExperience) {
    return e.companyName;
  }
  protected validate(e: EmployeeExperience) {
    dateOrder(e.fromDate, e.toDate);
  }
  protected snapshot(e: EmployeeExperience) {
    return {
      companyName: e.companyName,
      position: e.position ?? null,
      fromDate: e.fromDate ?? null,
      toDate: e.toDate ?? null,
      description: e.description ?? null,
      reference: e.reference ?? null,
    };
  }
}

@Injectable()
export class SkillsService extends EmployeeChildService<EmployeeSkill> {
  protected readonly entityType = 'EmployeeSkill';
  protected readonly notFoundMessage = 'Không tìm thấy kỹ năng';
  protected readonly order: FindOptionsOrder<EmployeeSkill> = { kind: 'ASC', level: 'DESC', name: 'ASC' };

  constructor(
    @InjectRepository(EmployeeSkill) repo: Repository<EmployeeSkill>,
    @InjectRepository(Employee) employees: Repository<Employee>,
    audit: AuditService,
  ) {
    super(repo, employees, audit);
  }

  protected label(e: EmployeeSkill) {
    return e.name;
  }
  protected snapshot(e: EmployeeSkill) {
    return { kind: SKILL_KIND_LABEL[e.kind], name: e.name, level: e.level ?? null, note: e.note ?? null };
  }
}

@Injectable()
export class RewardsService extends EmployeeChildService<EmployeeReward> {
  protected readonly entityType = 'EmployeeReward';
  protected readonly notFoundMessage = 'Không tìm thấy quyết định khen thưởng/kỷ luật';
  protected readonly order: FindOptionsOrder<EmployeeReward> = { decisionDate: 'DESC', createdAt: 'DESC' };

  constructor(
    @InjectRepository(EmployeeReward) repo: Repository<EmployeeReward>,
    @InjectRepository(Employee) employees: Repository<Employee>,
    audit: AuditService,
  ) {
    super(repo, employees, audit);
  }

  protected label(e: EmployeeReward) {
    return `${REWARD_KIND_LABEL[e.kind]}: ${e.title}`;
  }
  protected snapshot(e: EmployeeReward) {
    return {
      kind: REWARD_KIND_LABEL[e.kind],
      title: e.title,
      form: e.form ?? null,
      decisionNumber: e.decisionNumber ?? null,
      decisionDate: e.decisionDate,
      amount: e.amount ?? null,
      reason: e.reason ?? null,
    };
  }
}
