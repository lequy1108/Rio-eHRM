import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction } from '../enums';

export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

/** Nhật ký thay đổi dữ liệu. Không xoá mềm, không sửa. */
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['parentType', 'parentId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Loại đối tượng, vd 'Employee', 'EmployeeDependent' */
  @Column({ length: 50 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  /** Đối tượng cha để gom lịch sử, vd người phụ thuộc thuộc nhân viên nào */
  @Column({ type: 'varchar', length: 50, nullable: true })
  parentType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  /** Mô tả ngắn để hiển thị, vd tên người phụ thuộc */
  @Column({ type: 'varchar', length: 255, nullable: true })
  label?: string | null;

  /** { field: { from, to } } — giá trị đã đổi sang dạng hiển thị (tên thay vì id) */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  changes!: AuditChanges;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  userEmail?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
