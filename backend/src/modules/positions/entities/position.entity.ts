import { Column, Entity, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('positions')
export class Position extends BaseEntity {
  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  /** Cấp bậc (1 = cao nhất) */
  @Column({ type: 'int', default: 1 })
  level!: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @OneToMany(() => Employee, (e) => e.position)
  employees?: Relation<Employee>[];
}
