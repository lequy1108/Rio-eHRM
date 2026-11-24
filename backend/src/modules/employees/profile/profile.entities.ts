import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { QualificationKind, RewardKind, SkillKind } from '../../../common/enums';
import { CatalogItem } from '../../catalogs/entities/catalog-item.entity';
import { EmployeeChild } from './child.base';

/** Bằng cấp, chứng chỉ (chứng chỉ có hạn thì nhắc gia hạn) */
@Entity('employee_qualifications')
export class EmployeeQualification extends EmployeeChild {
  @Column({ type: 'enum', enum: QualificationKind })
  kind!: QualificationKind;

  /** Tên bằng/chứng chỉ, vd Cử nhân Kế toán, IELTS, AWS Solutions Architect */
  @Column({ length: 255 })
  name!: string;

  /** Trình độ (danh mục EDUCATION), dùng cho bằng cấp */
  @Column({ type: 'uuid', nullable: true })
  educationLevelId?: string | null;

  @ManyToOne(() => CatalogItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'educationLevelId' })
  educationLevel?: Relation<CatalogItem> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  major?: string | null;

  /** Trường hoặc đơn vị cấp */
  @Column({ type: 'varchar', length: 255, nullable: true })
  institution?: string | null;

  /** Xếp loại hoặc điểm */
  @Column({ type: 'varchar', length: 50, nullable: true })
  grade?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  certificateNumber?: string | null;

  @Column({ type: 'date', nullable: true })
  issueDate?: string | null;

  @Index()
  @Column({ type: 'date', nullable: true })
  expiryDate?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;
}

/** Kinh nghiệm làm việc trước khi vào công ty */
@Entity('employee_experiences')
export class EmployeeExperience extends EmployeeChild {
  @Column({ length: 255 })
  companyName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  position?: string | null;

  @Column({ type: 'date', nullable: true })
  fromDate?: string | null;

  @Column({ type: 'date', nullable: true })
  toDate?: string | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Người có thể xác nhận (tên, số điện thoại) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  reference?: string | null;
}

/** Kỹ năng và ngoại ngữ, mức 1–5 */
@Entity('employee_skills')
export class EmployeeSkill extends EmployeeChild {
  @Column({ type: 'enum', enum: SkillKind })
  kind!: SkillKind;

  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'smallint', nullable: true })
  level?: number | null;

  /** Vd IELTS 7.0, 5 năm kinh nghiệm */
  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;
}

/** Khen thưởng và kỷ luật */
@Entity('employee_rewards')
export class EmployeeReward extends EmployeeChild {
  @Column({ type: 'enum', enum: RewardKind })
  kind!: RewardKind;

  @Column({ length: 255 })
  title!: string;

  /** Hình thức: bằng khen, tiền thưởng, khiển trách, kéo dài thời hạn nâng lương, cách chức, sa thải… */
  @Column({ type: 'varchar', length: 100, nullable: true })
  form?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  decisionNumber?: string | null;

  @Column({ type: 'date' })
  decisionDate!: string;

  /** Số tiền thưởng hoặc bồi thường (VND) */
  @Column({ type: 'numeric', precision: 15, scale: 0, nullable: true, transformer: { to: (v?: number | null) => v, from: (v: string | null) => (v === null ? null : Number(v)) } })
  amount?: number | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;
}
