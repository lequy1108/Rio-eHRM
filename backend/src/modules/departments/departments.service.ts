import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { paginate, safeSort } from '../../common/dto/pagination-query.dto';
import { CreateDepartmentDto, QueryDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { Department } from './entities/department.entity';

const SORTABLE = ['code', 'name', 'createdAt'];

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly repo: Repository<Department>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  /** Gắn employeeCount (số nhân viên đang thuộc phòng) vào từng phòng ban */
  private async withCounts<T extends Department>(items: T[]) {
    if (!items.length) return items as Array<T & { employeeCount: number }>;
    const rows = await this.employees
      .createQueryBuilder('e')
      .select('e.departmentId', 'id')
      .addSelect('COUNT(*)::int', 'count')
      .where({ departmentId: In(items.map((d) => d.id)) })
      .groupBy('e.departmentId')
      .getRawMany<{ id: string; count: number }>();
    const map = new Map(rows.map((r) => [r.id, r.count]));
    return items.map((d) => Object.assign(d, { employeeCount: map.get(d.id) ?? 0 }));
  }

  async findAll(query: QueryDepartmentDto) {
    const qb = this.repo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.parent', 'parent')
      .leftJoinAndSelect('d.manager', 'manager');
    if (query.search) qb.where('(d.name ILIKE :s OR d.code ILIKE :s)', { s: `%${query.search}%` });
    qb.orderBy(`d.${safeSort(query, SORTABLE, 'code')}`, query.sortBy ? query.order : 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(await this.withCounts(items), total, query);
  }

  /** Toàn bộ phòng ban dạng cây */
  async tree() {
    const all = await this.withCounts(
      await this.repo.find({ relations: { manager: true }, order: { name: 'ASC' } }),
    );
    type Node = Department & { employeeCount: number; children: Node[] };
    const map = new Map<string, Node>(all.map((d) => [d.id, { ...d, children: [] }]));
    const roots: Node[] = [];
    for (const node of map.values()) {
      const parent = node.parentId ? map.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  async findOne(id: string) {
    const dep = await this.repo.findOne({
      where: { id },
      relations: { parent: true, manager: true, children: true },
    });
    if (!dep) throw new NotFoundException('Không tìm thấy phòng ban');
    return dep;
  }

  async create(dto: CreateDepartmentDto) {
    const saved = await this.repo.save(this.repo.create(dto));
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    if (dto.parentId && (await this.isDescendant(dto.parentId, id))) {
      throw new BadRequestException('Không thể chọn chính phòng ban này hoặc phòng ban con của nó làm cấp trên');
    }
    const dep = await this.findOne(id);
    Object.assign(dep, dto);
    delete dep.parent;
    delete dep.manager;
    delete dep.children;
    await this.repo.save(dep);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const [employeeCount, childCount] = await Promise.all([
      this.employees.count({ where: { departmentId: id } }),
      this.repo.count({ where: { parentId: id } }),
    ]);
    if (childCount > 0) throw new BadRequestException(`Phòng ban còn ${childCount} phòng ban con, hãy chuyển hoặc xoá trước`);
    if (employeeCount > 0) throw new BadRequestException(`Phòng ban còn ${employeeCount} nhân viên, hãy chuyển họ sang phòng khác trước`);
    await this.repo.softDelete(id);
    return { id };
  }

  /** candidateId có phải là id hoặc phòng ban con (mọi cấp) của rootId không */
  private async isDescendant(candidateId: string, rootId: string) {
    if (candidateId === rootId) return true;
    const rows: { id: string }[] = await this.repo.query(
      `WITH RECURSIVE sub AS (
         SELECT id FROM departments WHERE "parentId" = $1 AND "deletedAt" IS NULL
         UNION SELECT d.id FROM departments d JOIN sub ON d."parentId" = sub.id WHERE d."deletedAt" IS NULL
       ) SELECT id FROM sub`,
      [rootId],
    );
    return rows.some((r) => r.id === candidateId);
  }
}
