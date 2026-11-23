import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum CustomFieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  BOOLEAN = 'BOOLEAN',
}

/**
 * Trường do admin tự thêm vào hồ sơ (hiện dùng cho nhân viên: entity = 'EMPLOYEE').
 * Giá trị lưu ở cột jsonb `customFields` của bản ghi, khoá theo `key`.
 */
@Entity('custom_fields')
@Index(['entity', 'key'], { unique: true, where: '"deletedAt" IS NULL' })
export class CustomField extends BaseEntity {
  @Column({ length: 30, default: 'EMPLOYEE' })
  entity!: string;

  /** Khoá lưu dữ liệu, sinh từ tên trường, không đổi sau khi tạo */
  @Column({ length: 50 })
  key!: string;

  @Column({ length: 100 })
  label!: string;

  @Column({ type: 'enum', enum: CustomFieldType })
  type!: CustomFieldType;

  /** Lựa chọn cho SELECT / MULTISELECT */
  @Column({ type: 'jsonb', default: [] })
  options!: string[];

  @Column({ default: false })
  required!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hint?: string | null;

  /** Tên nhóm hiển thị trong hồ sơ */
  @Column({ length: 100, default: 'Thông tin bổ sung' })
  section!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  isActive!: boolean;

  /** Hiện thành một cột trong danh sách nhân viên */
  @Column({ default: false })
  showInList!: boolean;

  /** Chỉ người có quyền xem thông tin nhạy cảm mới thấy */
  @Column({ default: false })
  sensitive!: boolean;
}
