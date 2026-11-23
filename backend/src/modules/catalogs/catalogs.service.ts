import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogType } from '../../common/enums';
import { CATALOG_SEED } from './catalog-seed';
import { CreateCatalogItemDto, QueryCatalogDto, UpdateCatalogItemDto } from './dto/catalog.dto';
import { CatalogItem } from './entities/catalog-item.entity';

@Injectable()
export class CatalogsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogsService.name);

  constructor(@InjectRepository(CatalogItem) private readonly repo: Repository<CatalogItem>) {}

  /** Lần đầu chạy: tự nạp danh mục mặc định cho loại nào còn trống */
  async onApplicationBootstrap() {
    for (const type of Object.values(CatalogType)) {
      if (await this.repo.exists({ where: { type }, withDeleted: true })) continue;
      const items = CATALOG_SEED[type].map((s, i) => this.repo.create({ ...s, type, sortOrder: i + 1 }));
      await this.repo.save(items);
      this.logger.log(`Đã nạp ${items.length} mục danh mục ${type}`);
    }
  }

  findAll(query: QueryCatalogDto) {
    const qb = this.repo.createQueryBuilder('c').where('c.type = :type', { type: query.type });
    if (query.activeOnly !== false) qb.andWhere('c.isActive = true');
    if (query.search) {
      qb.andWhere('(c.name ILIKE :s OR c.code ILIKE :s OR c.shortName ILIKE :s)', { s: `%${query.search}%` });
    }
    return qb.orderBy('c.sortOrder', 'ASC').addOrderBy('c.name', 'ASC').getMany();
  }

  /** Số mục theo từng loại (cho tab ở trang quản lý) */
  async counts() {
    const rows = await this.repo
      .createQueryBuilder('c')
      .select('c.type', 'type')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('c.type')
      .getRawMany<{ type: CatalogType; count: number }>();
    return Object.fromEntries(Object.values(CatalogType).map((t) => [t, rows.find((r) => r.type === t)?.count ?? 0]));
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Không tìm thấy mục danh mục');
    return item;
  }

  async create(dto: CreateCatalogItemDto) {
    await this.ensureUniqueCode(dto.type, dto.code);
    const max = await this.repo.maximum('sortOrder', { type: dto.type });
    return this.repo.save(this.repo.create({ ...dto, sortOrder: dto.sortOrder ?? (max ?? 0) + 1 }));
  }

  async update(id: string, dto: UpdateCatalogItemDto) {
    const item = await this.findOne(id);
    if (dto.type && dto.type !== item.type) throw new BadRequestException('Không đổi được loại danh mục');
    if (dto.code && dto.code !== item.code) await this.ensureUniqueCode(item.type, dto.code);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.softDelete(id);
    return { id };
  }

  private async ensureUniqueCode(type: CatalogType, code: string) {
    if (await this.repo.exists({ where: { type, code }, withDeleted: true })) {
      throw new BadRequestException(`Mã "${code}" đã có trong danh mục này`);
    }
  }
}
