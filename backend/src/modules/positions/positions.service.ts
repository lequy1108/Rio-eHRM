import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { paginate, safeSort } from '../../common/dto/pagination-query.dto';
import { CreatePositionDto, QueryPositionDto, UpdatePositionDto } from './dto/position.dto';
import { Position } from './entities/position.entity';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position) private readonly repo: Repository<Position>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  async findAll(query: QueryPositionDto) {
    const qb = this.repo.createQueryBuilder('p');
    if (query.search) qb.where('(p.name ILIKE :s OR p.code ILIKE :s)', { s: `%${query.search}%` });
    qb.orderBy(`p.${safeSort(query, ['code', 'name', 'level', 'createdAt'], 'level')}`, query.sortBy ? query.order : 'ASC')
      .addOrderBy('p.name', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    const rows = items.length
      ? await this.employees
          .createQueryBuilder('e')
          .select('e.positionId', 'id')
          .addSelect('COUNT(*)::int', 'count')
          .where({ positionId: In(items.map((p) => p.id)) })
          .groupBy('e.positionId')
          .getRawMany<{ id: string; count: number }>()
      : [];
    const counts = new Map(rows.map((r) => [r.id, r.count]));
    return paginate(
      items.map((p) => Object.assign(p, { employeeCount: counts.get(p.id) ?? 0 })),
      total,
      query,
    );
  }

  async findOne(id: string) {
    const pos = await this.repo.findOne({ where: { id } });
    if (!pos) throw new NotFoundException('Không tìm thấy chức vụ');
    return pos;
  }

  create(dto: CreatePositionDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdatePositionDto) {
    const pos = await this.findOne(id);
    Object.assign(pos, dto);
    return this.repo.save(pos);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.softDelete(id);
    return { id };
  }
}
