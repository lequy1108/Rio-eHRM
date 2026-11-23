import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CatalogType } from '../../../common/enums';

/** Một mục trong danh mục dùng chung (dân tộc, tôn giáo, ngân hàng, tỉnh/thành…) */
@Entity('catalog_items')
@Index(['type', 'code'], { unique: true })
export class CatalogItem extends BaseEntity {
  @Column({ type: 'enum', enum: CatalogType })
  type!: CatalogType;

  @Column({ length: 50 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  /** Tên viết tắt, vd tên giao dịch ngân hàng */
  @Column({ type: 'varchar', length: 100, nullable: true })
  shortName?: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: true })
  isActive!: boolean;
}
