import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Employee } from '../employees/entities/employee.entity';

/** numeric (Postgres trả về chuỗi) ↔ number */
export const money = {
  to: (v?: number | null) => v,
  from: (v: string | null) => (v === null || v === undefined ? null : Number(v)),
};

export interface Allowance {
  name: string;
  amount: number;
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  TERMINATED = 'TERMINATED',
}

/** Loại hợp đồng do admin cấu hình (Cài đặt → Hợp đồng) */
@Entity('contract_types')
export class ContractType extends BaseEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 20 })
  code!: string;

  @Column({ length: 150 })
  name!: string;

  /** Có thời hạn (có ngày kết thúc) */
  @Column({ default: true })
  hasTerm!: boolean;

  /** Thời hạn mặc định (tháng) để tự điền ngày kết thúc */
  @Column({ type: 'smallint', nullable: true })
  defaultMonths?: number | null;

  /** Hợp đồng thử việc: ký loại khác (chính thức) thì nhân viên chuyển sang Chính thức */
  @Column({ default: false })
  isProbation!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  isActive!: boolean;
}

/** Mẫu hợp đồng (HTML có biến {{ten_bien}}) để in */
@Entity('contract_templates')
export class ContractTemplate extends BaseEntity {
  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ default: false })
  isDefault!: boolean;
}

@Entity('contracts')
@Index(['employeeId', 'startDate'])
export class Contract extends BaseEntity {
  @Column({ type: 'uuid' })
  employeeId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Relation<Employee>;

  @Column({ type: 'uuid', nullable: true })
  typeId?: string | null;

  @ManyToOne(() => ContractType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'typeId' })
  type?: Relation<ContractType> | null;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 60 })
  contractNumber!: string;

  /** Năm và số thứ tự dùng để sinh số tiếp theo */
  @Column({ type: 'smallint', nullable: true })
  seqYear?: number | null;

  @Column({ type: 'int', nullable: true })
  seqNo?: number | null;

  @Column({ type: 'date' })
  signDate!: string;

  @Column({ type: 'date' })
  startDate!: string;

  @Index()
  @Column({ type: 'date', nullable: true })
  endDate?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  jobTitle?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workLocation?: string | null;

  @Column({ type: 'numeric', precision: 15, scale: 0, default: 0, transformer: money })
  baseSalary!: number;

  /** Mức lương đóng BHXH (để trống = bằng lương cơ bản) */
  @Column({ type: 'numeric', precision: 15, scale: 0, nullable: true, transformer: money })
  insuranceSalary?: number | null;

  @Column({ type: 'jsonb', default: [] })
  allowances!: Allowance[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  signerName?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  signerTitle?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  /** Hợp đồng trước (khi gia hạn/tái ký) */
  @Column({ type: 'uuid', nullable: true })
  previousContractId?: string | null;

  @ManyToOne(() => Contract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'previousContractId' })
  previousContract?: Relation<Contract> | null;

  @Index()
  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.ACTIVE })
  status!: ContractStatus;

  @Column({ type: 'date', nullable: true })
  terminatedDate?: string | null;

  @Column({ type: 'text', nullable: true })
  terminationReason?: string | null;

  /** Bản scan đã ký (lưu riêng tư) */
  @Column({ type: 'varchar', length: 500, nullable: true, select: false })
  signedFilePath?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signedFileName?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  signedFileMime?: string | null;

  @Column({ type: 'int', nullable: true })
  signedFileSize?: number | null;

  @OneToMany(() => ContractAppendix, (a) => a.contract)
  appendices?: Relation<ContractAppendix>[];
}

/** Phụ lục hợp đồng: thay đổi lương, phụ cấp, chức danh có ngày hiệu lực */
@Entity('contract_appendices')
export class ContractAppendix extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  contractId!: string;

  @ManyToOne(() => Contract, (c) => c.appendices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractId' })
  contract?: Relation<Contract>;

  @Column({ length: 80 })
  appendixNumber!: string;

  @Column({ type: 'date' })
  signDate!: string;

  @Column({ type: 'date' })
  effectiveDate!: string;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  /** null = không đổi */
  @Column({ type: 'varchar', length: 150, nullable: true })
  jobTitle?: string | null;

  @Column({ type: 'numeric', precision: 15, scale: 0, nullable: true, transformer: money })
  baseSalary?: number | null;

  @Column({ type: 'numeric', precision: 15, scale: 0, nullable: true, transformer: money })
  insuranceSalary?: number | null;

  @Column({ type: 'jsonb', nullable: true })
  allowances?: Allowance[] | null;
}
