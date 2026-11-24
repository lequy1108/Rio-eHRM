import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { CatalogItem } from '../../catalogs/entities/catalog-item.entity';
import { EmployeeChild } from './child.base';

/** Tài liệu đính kèm hồ sơ. File nằm trong thư mục riêng tư (PRIVATE_ROOT), chỉ tải qua API */
@Entity('employee_documents')
export class EmployeeDocument extends EmployeeChild {
  /** Loại tài liệu (danh mục DOCUMENT_TYPE) */
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Relation<CatalogItem> | null;

  @Column({ length: 255 })
  name!: string;

  /** Đường dẫn tương đối trong PRIVATE_ROOT, vd documents/abc.pdf */
  @Column({ length: 500, select: false })
  filePath!: string;

  @Column({ length: 255 })
  originalName!: string;

  @Column({ length: 150 })
  mimeType!: string;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}
