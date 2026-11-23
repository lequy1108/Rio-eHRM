import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EmployeeStatus, Gender, MaritalStatus } from '../../../common/enums';
import { CatalogItem } from '../../catalogs/entities/catalog-item.entity';
import { Department } from '../../departments/entities/department.entity';
import { Position } from '../../positions/entities/position.entity';

@Entity('employees')
export class Employee extends BaseEntity {
  /** Mã nhân viên, vd: NV0001 */
  @Column({ unique: true, length: 50 })
  code!: string;

  @Index()
  @Column({ length: 255 })
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  /** Đường dẫn ảnh đại diện, vd /uploads/avatars/xxx.png */
  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth?: string | null;

  /** Số CCCD (số định danh cá nhân) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  identityNumber?: string | null;

  @Column({ type: 'date', nullable: true })
  identityIssuedDate?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  identityIssuedPlace?: string | null;

  /** Nơi ở hiện tại (tạm trú) */
  @Column({ type: 'text', nullable: true })
  address?: string | null;

  /** Địa chỉ thường trú */
  @Column({ type: 'text', nullable: true })
  permanentAddress?: string | null;

  @Column({ type: 'enum', enum: MaritalStatus, nullable: true })
  maritalStatus?: MaritalStatus | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Việt Nam' })
  nationality?: string | null;

  /** Giá trị các trường tuỳ chỉnh do admin định nghĩa (khoá = CustomField.key) */
  @Column({ type: 'jsonb', default: {} })
  customFields!: Record<string, unknown>;

  // ---- Danh mục ----
  @Column({ type: 'uuid', nullable: true })
  ethnicityId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ethnicityId' })
  ethnicity?: Relation<CatalogItem> | null;

  @Column({ type: 'uuid', nullable: true })
  religionId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'religionId' })
  religion?: Relation<CatalogItem> | null;

  @Column({ type: 'uuid', nullable: true })
  educationLevelId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'educationLevelId' })
  educationLevel?: Relation<CatalogItem> | null;

  /** Quê quán (tỉnh/thành) */
  @Column({ type: 'uuid', nullable: true })
  hometownProvinceId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hometownProvinceId' })
  hometownProvince?: Relation<CatalogItem> | null;

  // ---- Liên hệ khẩn cấp ----
  @Column({ type: 'varchar', length: 255, nullable: true })
  emergencyContactName?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  emergencyContactRelation?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  emergencyContactPhone?: string | null;

  // ---- Thuế, bảo hiểm ----
  /** MST cá nhân. Từ 01/07/2025 là số định danh cá nhân (số CCCD) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  personalTaxCode?: string | null;

  /** Mã số BHXH (10 số) */
  @Column({ type: 'varchar', length: 20, nullable: true })
  socialInsuranceNumber?: string | null;

  /** Nơi đăng ký khám chữa bệnh ban đầu */
  @Column({ type: 'varchar', length: 255, nullable: true })
  healthInsurancePlace?: string | null;

  // ---- Ngân hàng nhận lương ----
  @Column({ type: 'uuid', nullable: true })
  bankId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bankId' })
  bank?: Relation<CatalogItem> | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  bankAccountNumber?: string | null;

  /** Tên chủ tài khoản (thường viết hoa không dấu) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  bankAccountName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bankBranch?: string | null;

  /** Ngày vào làm */
  @Column({ type: 'date' })
  hireDate!: string;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.PROBATION })
  status!: EmployeeStatus;

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string | null;

  @ManyToOne(() => Department, (d) => d.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' })
  department?: Relation<Department> | null;

  @Column({ type: 'uuid', nullable: true })
  positionId?: string | null;

  @ManyToOne(() => Position, (p) => p.employees, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'positionId' })
  position?: Relation<Position> | null;

  /** Quản lý trực tiếp */
  @Column({ type: 'uuid', nullable: true })
  managerId?: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managerId' })
  manager?: Relation<Employee> | null;
}
