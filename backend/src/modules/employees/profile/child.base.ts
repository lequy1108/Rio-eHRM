import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Column, FindOptionsOrder, FindOptionsRelations, FindOptionsWhere, Index, JoinColumn, ManyToOne, Relation, Repository } from 'typeorm';
import { AuditService } from '../../../common/audit/audit.service';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AuditAction } from '../../../common/enums';
import type { Permission } from '../../../common/permissions';
import { Employee } from '../entities/employee.entity';

/** Bản ghi con thuộc một nhân viên (bằng cấp, kinh nghiệm, kỹ năng, khen thưởng…) */
export abstract class EmployeeChild extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Relation<Employee>;
}

/**
 * CRUD dùng chung cho bản ghi con: kiểm tra nhân viên tồn tại, ghi lịch sử thay đổi
 * (hiện trong tab Lịch sử của nhân viên qua parentType/parentId).
 * Lớp con chỉ cần khai báo tên, cách sắp xếp, ảnh chụp để ghi log và kiểm tra riêng nếu có.
 */
export abstract class EmployeeChildService<T extends EmployeeChild> {
  /** Tên loại bản ghi trong audit log, vd 'EmployeeSkill' */
  protected abstract readonly entityType: string;
  protected abstract readonly notFoundMessage: string;
  protected abstract readonly order: FindOptionsOrder<T>;
  protected abstract snapshot(e: T): Record<string, unknown>;
  protected abstract label(e: T): string;
  /** Quan hệ cần nạp kèm khi đọc */
  protected readonly relations: string[] = [];
  private relationMap() {
    return Object.fromEntries(this.relations.map((r) => [r, true])) as FindOptionsRelations<T>;
  }
  /** Kiểm tra nghiệp vụ trước khi lưu (vd ngày kết thúc sau ngày bắt đầu) */
  protected validate(_e: T): void {}

  constructor(
    protected readonly repo: Repository<T>,
    protected readonly employees: Repository<Employee>,
    protected readonly audit: AuditService,
  ) {}

  protected async ensureEmployee(employeeId: string) {
    if (!(await this.employees.exists({ where: { id: employeeId } }))) {
      throw new NotFoundException('Không tìm thấy nhân viên');
    }
  }

  async findAll(employeeId: string) {
    await this.ensureEmployee(employeeId);
    return this.repo.find({
      where: { employeeId } as FindOptionsWhere<T>,
      order: this.order,
      relations: this.relationMap(),
    });
  }

  async findOne(employeeId: string, id: string) {
    const e = await this.repo.findOne({ where: { id, employeeId } as FindOptionsWhere<T>, relations: this.relationMap() });
    if (!e) throw new NotFoundException(this.notFoundMessage);
    return e;
  }

  /** Bỏ object quan hệ cũ để TypeORM lưu theo cột *Id mới */
  protected detachRelations(e: T) {
    for (const r of this.relations) delete (e as Record<string, unknown>)[r];
  }

  protected log(action: AuditAction, e: T, before?: Record<string, unknown>) {
    return this.audit.log({
      entityType: this.entityType,
      entityId: e.id,
      parentType: 'Employee',
      parentId: e.employeeId,
      action,
      label: this.label(e),
      before,
      after: action === AuditAction.DELETE ? undefined : this.snapshot(e),
    });
  }

  async create(employeeId: string, dto: object) {
    await this.ensureEmployee(employeeId);
    const entity = this.repo.create({ ...dto, employeeId } as T);
    this.validate(entity);
    const saved = await this.repo.save(entity);
    const full = await this.findOne(employeeId, saved.id);
    await this.log(AuditAction.CREATE, full);
    return full;
  }

  async update(employeeId: string, id: string, dto: object) {
    const e = await this.findOne(employeeId, id);
    const before = this.snapshot(e);
    Object.assign(e, dto);
    this.validate(e);
    this.detachRelations(e);
    await this.repo.save(e);
    const full = await this.findOne(employeeId, id);
    await this.log(AuditAction.UPDATE, full, before);
    return full;
  }

  async remove(employeeId: string, id: string) {
    const e = await this.findOne(employeeId, id);
    await this.repo.softDelete(id);
    await this.log(AuditAction.DELETE, e);
    return { id };
  }
}

export const dateOrder = (from?: string | null, to?: string | null, msg = 'Ngày kết thúc phải sau ngày bắt đầu') => {
  if (from && to && to < from) throw new BadRequestException(msg);
};

const pipe = (expectedType: Type) =>
  new ValidationPipe({ expectedType, whitelist: true, forbidNonWhitelisted: true, transform: true });

/**
 * Sinh controller CRUD `/employees/:employeeId/<path>` cho một loại bản ghi con.
 * Xem cần `view`, thêm/sửa/xoá cần `edit` (đủ tất cả quyền liệt kê).
 */
export function employeeChildController(opts: {
  path: string;
  service: Type<EmployeeChildService<EmployeeChild>>;
  createDto: Type;
  updateDto: Type;
  view: Permission[];
  edit: Permission[];
}) {
  @ApiTags('Employees')
  @ApiBearerAuth()
  @Controller(`employees/:employeeId/${opts.path}`)
  class ChildController {
    constructor(@Inject(opts.service) readonly service: EmployeeChildService<EmployeeChild>) {}

    @Get()
    @Permissions(...opts.view)
    findAll(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
      return this.service.findAll(employeeId);
    }

    @Post()
    @Permissions(...opts.edit)
    create(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Body(pipe(opts.createDto)) dto: object) {
      return this.service.create(employeeId, dto);
    }

    @Patch(':id')
    @Permissions(...opts.edit)
    update(
      @Param('employeeId', ParseUUIDPipe) employeeId: string,
      @Param('id', ParseUUIDPipe) id: string,
      @Body(pipe(opts.updateDto)) dto: object,
    ) {
      return this.service.update(employeeId, id, dto);
    }

    @Delete(':id')
    @Permissions(...opts.edit)
    remove(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string) {
      return this.service.remove(employeeId, id);
    }
  }
  Object.defineProperty(ChildController, 'name', { value: `${opts.service.name.replace('Service', '')}Controller` });
  return ChildController;
}
