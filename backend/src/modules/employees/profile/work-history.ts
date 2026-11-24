import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Column, Entity, FindOptionsOrder, Index, JoinColumn, LessThanOrEqual, ManyToOne, Relation, Repository } from 'typeorm';
import { AuditService } from '../../../common/audit/audit.service';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { AuditAction, WorkChangeStatus, WorkChangeType } from '../../../common/enums';
import { Department } from '../../departments/entities/department.entity';
import { Position } from '../../positions/entities/position.entity';
import { Employee } from '../entities/employee.entity';
import { EmployeesService } from '../employees.service';
import { EmployeeChild, EmployeeChildService } from './child.base';

export const WORK_CHANGE_LABEL: Record<WorkChangeType, string> = {
  TRANSFER: 'Điều chuyển',
  PROMOTION: 'Thăng chức',
  APPOINTMENT: 'Bổ nhiệm',
  DISMISSAL: 'Miễn nhiệm',
  DEMOTION: 'Giáng chức',
  OTHER: 'Khác',
};
const STATUS_LABEL: Record<WorkChangeStatus, string> = { PENDING: 'Chờ hiệu lực', APPLIED: 'Đã áp dụng' };

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD */
export const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

/**
 * Quá trình công tác: điều chuyển, thăng chức, bổ nhiệm… có ngày hiệu lực.
 * Đến ngày hiệu lực thì tự cập nhật phòng ban / chức vụ / quản lý trong hồ sơ.
 */
@Entity('employee_work_history')
export class EmployeeWorkHistory extends EmployeeChild {
  @Column({ type: 'enum', enum: WorkChangeType })
  type!: WorkChangeType;

  @Index()
  @Column({ type: 'date' })
  effectiveDate!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  decisionNumber?: string | null;

  @Index()
  @Column({ type: 'enum', enum: WorkChangeStatus, default: WorkChangeStatus.PENDING })
  status!: WorkChangeStatus;

  @Column({ type: 'timestamptz', nullable: true })
  appliedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true }) fromDepartmentId?: string | null;
  @Column({ type: 'uuid', nullable: true }) toDepartmentId?: string | null;
  @Column({ type: 'uuid', nullable: true }) fromPositionId?: string | null;
  @Column({ type: 'uuid', nullable: true }) toPositionId?: string | null;
  @Column({ type: 'uuid', nullable: true }) fromManagerId?: string | null;
  @Column({ type: 'uuid', nullable: true }) toManagerId?: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromDepartmentId' })
  fromDepartment?: Relation<Department> | null;
  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toDepartmentId' })
  toDepartment?: Relation<Department> | null;
  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromPositionId' })
  fromPosition?: Relation<Position> | null;
  @ManyToOne(() => Position, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toPositionId' })
  toPosition?: Relation<Position> | null;
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromManagerId' })
  fromManager?: Relation<Employee> | null;
  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toManagerId' })
  toManager?: Relation<Employee> | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}

const emptyToNull = () => Transform(({ value }) => (value === '' ? null : typeof value === 'string' ? value.trim() : value));

export class CreateWorkHistoryDto {
  @IsEnum(WorkChangeType) type!: WorkChangeType;
  @IsDateString({}, { message: 'Ngày hiệu lực không hợp lệ' }) effectiveDate!: string;
  @IsOptional() @IsString() @MaxLength(100) @emptyToNull() decisionNumber?: string | null;
  /** Bỏ trống = giữ như hiện tại; null = bỏ trống trong hồ sơ */
  @IsOptional() @IsUUID() @emptyToNull() toDepartmentId?: string | null;
  @IsOptional() @IsUUID() @emptyToNull() toPositionId?: string | null;
  @IsOptional() @IsUUID() @emptyToNull() toManagerId?: string | null;
  @IsOptional() @IsString() @emptyToNull() note?: string | null;
}
export class UpdateWorkHistoryDto extends PartialType(CreateWorkHistoryDto) {}

const TARGETS = ['Department', 'Position', 'Manager'] as const;

@Injectable()
export class WorkHistoryService extends EmployeeChildService<EmployeeWorkHistory> implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkHistoryService.name);
  protected readonly entityType = 'EmployeeWorkHistory';
  protected readonly notFoundMessage = 'Không tìm thấy quyết định công tác';
  protected readonly order: FindOptionsOrder<EmployeeWorkHistory> = { effectiveDate: 'DESC', createdAt: 'DESC' };
  protected readonly relations = ['fromDepartment', 'toDepartment', 'fromPosition', 'toPosition', 'fromManager', 'toManager'];

  constructor(
    @InjectRepository(EmployeeWorkHistory) repo: Repository<EmployeeWorkHistory>,
    @InjectRepository(Employee) employees: Repository<Employee>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Position) private readonly positions: Repository<Position>,
    audit: AuditService,
    @Inject(forwardRef(() => EmployeesService)) private readonly employeeService: EmployeesService,
  ) {
    super(repo, employees, audit);
  }

  protected label(e: EmployeeWorkHistory) {
    return WORK_CHANGE_LABEL[e.type];
  }
  protected snapshot(e: EmployeeWorkHistory) {
    return {
      type: WORK_CHANGE_LABEL[e.type],
      effectiveDate: e.effectiveDate,
      decisionNumber: e.decisionNumber ?? null,
      toDepartment: e.toDepartment?.name ?? null,
      toPosition: e.toPosition?.name ?? null,
      toManager: e.toManager?.fullName ?? null,
      status: STATUS_LABEL[e.status],
      note: e.note ?? null,
    };
  }

  /** Nếu server tắt qua đêm, áp dụng bù các quyết định đã đến hạn khi khởi động */
  async onApplicationBootstrap() {
    await this.applyDue();
  }

  @Cron('5 0 * * *', { name: 'work-history-apply', timeZone: 'Asia/Ho_Chi_Minh' })
  async applyDue() {
    const due = await this.repo.find({
      where: { status: WorkChangeStatus.PENDING, effectiveDate: LessThanOrEqual(todayVN()) },
      order: { effectiveDate: 'ASC', createdAt: 'ASC' },
    });
    for (const r of due) {
      try {
        await this.apply(r.employeeId, r.id);
      } catch (err) {
        this.logger.error(`Không áp dụng được quyết định ${r.id}: ${(err as Error).message}`);
      }
    }
    if (due.length) this.logger.log(`Đã áp dụng ${due.length} quyết định công tác đến hạn`);
  }

  private async checkTargets(employeeId: string, dto: Partial<CreateWorkHistoryDto>) {
    if (dto.toDepartmentId && !(await this.departments.exists({ where: { id: dto.toDepartmentId } }))) {
      throw new BadRequestException('Phòng ban không tồn tại');
    }
    if (dto.toPositionId && !(await this.positions.exists({ where: { id: dto.toPositionId } }))) {
      throw new BadRequestException('Chức vụ không tồn tại');
    }
    if (dto.toManagerId) {
      if (dto.toManagerId === employeeId) throw new BadRequestException('Nhân viên không thể là quản lý của chính mình');
      if (!(await this.employees.exists({ where: { id: dto.toManagerId } }))) {
        throw new BadRequestException('Người quản lý không tồn tại');
      }
    }
  }

  /** Gán giá trị đích: trường không gửi lên thì giữ như hiện tại */
  private resolveTargets(r: EmployeeWorkHistory, emp: Employee, dto: Partial<CreateWorkHistoryDto>) {
    for (const t of TARGETS) {
      const key = `to${t}Id` as const;
      const cur = (t === 'Department' ? emp.departmentId : t === 'Position' ? emp.positionId : emp.managerId) ?? null;
      r[`from${t}Id`] = cur;
      // undefined = không gửi lên (giữ hiện tại); null = bỏ trống
      if (dto[key] !== undefined) r[key] = dto[key];
      else if (r[key] === undefined) r[key] = cur;
    }
    const changed = TARGETS.some((t) => (r[`from${t}Id`] ?? null) !== (r[`to${t}Id`] ?? null));
    if (!changed && r.type !== WorkChangeType.OTHER) {
      throw new BadRequestException('Chọn phòng ban, chức vụ hoặc quản lý mới (khác hiện tại)');
    }
  }

  async create(employeeId: string, dto: CreateWorkHistoryDto) {
    const emp = await this.employeeService.findOne(employeeId);
    await this.checkTargets(employeeId, dto);
    const r = this.repo.create({
      employeeId,
      type: dto.type,
      effectiveDate: dto.effectiveDate,
      decisionNumber: dto.decisionNumber ?? null,
      note: dto.note ?? null,
      status: WorkChangeStatus.PENDING,
    });
    this.resolveTargets(r, emp, dto);
    const saved = await this.repo.save(r);
    await this.log(AuditAction.CREATE, await this.findOne(employeeId, saved.id));
    if (saved.effectiveDate <= todayVN()) await this.apply(employeeId, saved.id);
    return this.findOne(employeeId, saved.id);
  }

  async update(employeeId: string, id: string, dto: UpdateWorkHistoryDto) {
    const r = await this.findOne(employeeId, id);
    const before = this.snapshot(r);
    if (r.status === WorkChangeStatus.APPLIED) {
      const allowed = ['decisionNumber', 'note'];
      if (Object.entries(dto).some(([k, v]) => v !== undefined && !allowed.includes(k))) {
        throw new BadRequestException('Quyết định đã áp dụng vào hồ sơ, chỉ sửa được số quyết định và ghi chú');
      }
    } else {
      await this.checkTargets(employeeId, dto);
      const emp = await this.employeeService.findOne(employeeId);
      if (dto.type) r.type = dto.type;
      if (dto.effectiveDate) r.effectiveDate = dto.effectiveDate;
      this.resolveTargets(r, emp, dto);
    }
    if (dto.decisionNumber !== undefined) r.decisionNumber = dto.decisionNumber;
    if (dto.note !== undefined) r.note = dto.note;
    this.detachRelations(r);
    await this.repo.save(r);
    await this.log(AuditAction.UPDATE, await this.findOne(employeeId, id), before);
    if (r.status === WorkChangeStatus.PENDING && r.effectiveDate <= todayVN()) await this.apply(employeeId, id);
    return this.findOne(employeeId, id);
  }

  /** Áp dụng vào hồ sơ: cập nhật phòng ban / chức vụ / quản lý theo giá trị đích */
  private async apply(employeeId: string, id: string) {
    const r = await this.findOne(employeeId, id);
    if (r.status !== WorkChangeStatus.PENDING) return;
    const emp = await this.employeeService.findOne(employeeId);
    // Ghi lại giá trị ngay trước khi áp dụng (có thể đã đổi kể từ lúc tạo quyết định)
    r.fromDepartmentId = emp.departmentId ?? null;
    r.fromPositionId = emp.positionId ?? null;
    r.fromManagerId = emp.managerId ?? null;
    await this.employeeService.update(employeeId, {
      departmentId: r.toDepartmentId ?? null,
      positionId: r.toPositionId ?? null,
      managerId: r.toManagerId ?? null,
    } as never);
    r.status = WorkChangeStatus.APPLIED;
    r.appliedAt = new Date();
    this.detachRelations(r);
    await this.repo.save(r);
  }
}

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees/:employeeId/work-history')
export class WorkHistoryController {
  constructor(private readonly service: WorkHistoryService) {}

  @Get()
  @Permissions('employees.view')
  findAll(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.findAll(employeeId);
  }

  @Post()
  @Permissions('employees.update')
  create(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() dto: CreateWorkHistoryDto) {
    return this.service.create(employeeId, dto);
  }

  @Patch(':id')
  @Permissions('employees.update')
  update(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkHistoryDto,
  ) {
    return this.service.update(employeeId, id, dto);
  }

  @Delete(':id')
  @Permissions('employees.update')
  remove(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(employeeId, id);
  }
}
