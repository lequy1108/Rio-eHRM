import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DependentRelation } from '../../../common/enums';
import { Employee } from '../entities/employee.entity';

/** Người phụ thuộc, dùng để giảm trừ gia cảnh khi tính thuế TNCN */
@Entity('employee_dependents')
export class EmployeeDependent extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Relation<Employee>;

  @Column({ length: 255 })
  fullName!: string;

  @Column({ type: 'enum', enum: DependentRelation })
  relationship!: DependentRelation;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string | null;

  /** Số định danh cá nhân, cũng là MST của người phụ thuộc */
  @Column({ type: 'varchar', length: 20, nullable: true })
  identityNumber?: string | null;

  /** Thời điểm bắt đầu giảm trừ (ngày đầu tháng) */
  @Column({ type: 'date' })
  deductionFrom!: string;

  /** Thời điểm kết thúc giảm trừ; để trống = đang giảm trừ */
  @Column({ type: 'date', nullable: true })
  deductionTo?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
