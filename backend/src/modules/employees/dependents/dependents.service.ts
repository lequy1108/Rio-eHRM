import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../../common/audit/audit.service';
import { AuditAction, DependentRelation } from '../../../common/enums';
import { Employee } from '../entities/employee.entity';
import { CreateDependentDto, UpdateDependentDto } from './dependent.dto';
import { EmployeeDependent } from './dependent.entity';

export const RELATION_LABEL: Record<DependentRelation, string> = {
  CHILD: 'Con',
  SPOUSE: 'Vợ/chồng',
  FATHER: 'Bố',
  MOTHER: 'Mẹ',
  OTHER: 'Khác',
};

const snapshot = (d: EmployeeDependent) => ({
  fullName: d.fullName,
  relationship: RELATION_LABEL[d.relationship],
  dateOfBirth: d.dateOfBirth ?? null,
  identityNumber: d.identityNumber ?? null,
  deductionFrom: d.deductionFrom,
  deductionTo: d.deductionTo ?? null,
  note: d.note ?? null,
});

@Injectable()
export class DependentsService {
  constructor(
    @InjectRepository(EmployeeDependent) private readonly repo: Repository<EmployeeDependent>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly audit: AuditService,
  ) {}

  private async ensureEmployee(employeeId: string) {
    if (!(await this.employees.exists({ where: { id: employeeId } }))) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
  }

  private checkDates(from?: string | null, to?: string | null) {
    if (from && to && to < from) throw new BadRequestException('Ngày kết thúc giảm trừ phải sau ngày bắt đầu');
  }

  async findAll(employeeId: string) {
    await this.ensureEmployee(employeeId);
    return this.repo.find({ where: { employeeId }, order: { deductionFrom: 'ASC', createdAt: 'ASC' } });
  }

  private async findOne(employeeId: string, id: string) {
    const d = await this.repo.findOne({ where: { id, employeeId } });
    if (!d) throw new NotFoundException('Không tìm thấy người phụ thuộc');
    return d;
  }

  async create(employeeId: string, dto: CreateDependentDto) {
    await this.ensureEmployee(employeeId);
    this.checkDates(dto.deductionFrom, dto.deductionTo);
    const saved = await this.repo.save(this.repo.create({ ...dto, employeeId }));
    await this.audit.log({
      entityType: 'EmployeeDependent',
      entityId: saved.id,
      parentType: 'Employee',
      parentId: employeeId,
      action: AuditAction.CREATE,
      label: saved.fullName,
      after: snapshot(saved),
    });
    return saved;
  }

  async update(employeeId: string, id: string, dto: UpdateDependentDto) {
    const d = await this.findOne(employeeId, id);
    const before = snapshot(d);
    Object.assign(d, dto);
    this.checkDates(d.deductionFrom, d.deductionTo);
    const saved = await this.repo.save(d);
    await this.audit.log({
      entityType: 'EmployeeDependent',
      entityId: id,
      parentType: 'Employee',
      parentId: employeeId,
      action: AuditAction.UPDATE,
      label: saved.fullName,
      before,
      after: snapshot(saved),
    });
    return saved;
  }

  async remove(employeeId: string, id: string) {
    const d = await this.findOne(employeeId, id);
    await this.repo.softDelete(id);
    await this.audit.log({
      entityType: 'EmployeeDependent',
      entityId: id,
      parentType: 'Employee',
      parentId: employeeId,
      action: AuditAction.DELETE,
      label: d.fullName,
    });
    return { id };
  }
}
