import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** Vai trò người dùng: tập hợp quyền theo chức năng */
@Entity('roles')
export class AppRole extends BaseEntity {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ length: 50 })
  code!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  /** Mã quyền, xem common/permissions.ts. '*' = toàn quyền */
  @Column({ type: 'jsonb', default: [] })
  permissions!: string[];

  /** Vai trò có sẵn, không xoá được */
  @Column({ default: false })
  isSystem!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}
