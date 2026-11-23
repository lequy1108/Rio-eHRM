import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from '../../employees/entities/employee.entity';

@Entity('departments')
export class Department extends BaseEntity {
  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  /** Phòng ban cha (để dựng cây tổ chức) */
  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => Department, (d) => d.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: Relation<Department> | null;

  @OneToMany(() => Department, (d) => d.parent)
  children?: Relation<Department>[];

  /** Trưởng phòng */
  @Column({ type: 'uuid', nullable: true })
  managerId?: string | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managerId' })
  manager?: Relation<Employee> | null;

  @OneToMany(() => Employee, (e) => e.department)
  employees?: Relation<Employee>[];
}
