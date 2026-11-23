import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Một nhóm cài đặt (company, branding, employee, mail, security) */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 50 })
  key!: string;

  @Column({ type: 'jsonb', default: {} })
  value!: Record<string, unknown>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
