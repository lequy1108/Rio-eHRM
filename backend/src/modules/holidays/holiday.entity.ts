import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Ngày nghỉ lễ của công ty theo năm (dùng cho chấm công, nghỉ phép sau này) */
@Entity('holidays')
@Index(['date'], { unique: true })
export class Holiday {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ length: 150 })
  name!: string;

  /** Nghỉ có hưởng lương (Điều 112 BLLĐ). Tắt khi chỉ là ngày nghỉ bù hoặc công ty tự cho nghỉ */
  @Column({ default: true })
  paid!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
