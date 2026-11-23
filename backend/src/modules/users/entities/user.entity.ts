import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../../common/enums';
import { Employee } from '../../employees/entities/employee.entity';
import { AppRole } from '../../roles/role.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email!: string;

  @Exclude()
  @Column({ select: false })
  password!: string;

  /** Cột vai trò cũ (enum), chỉ giữ để chuyển dữ liệu sang `roleId`. Không dùng trong code mới */
  @Exclude()
  @Column({ name: 'role', type: 'enum', enum: Role, nullable: true, select: false })
  legacyRole?: Role | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  roleId?: string | null;

  @ManyToOne(() => AppRole, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roleId' })
  role?: Relation<AppRole> | null;

  /** Số lần đăng nhập sai liên tiếp */
  @Exclude()
  @Column({ type: 'int', default: 0 })
  failedLoginCount!: number;

  /** Tạm khoá đăng nhập đến thời điểm này */
  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  employeeId?: string | null;

  /** Tài khoản đăng nhập gắn với hồ sơ nhân viên (có thể không có, vd: tài khoản admin hệ thống) */
  @OneToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee?: Relation<Employee> | null;
}
