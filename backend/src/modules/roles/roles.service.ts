import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction } from '../../common/enums';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, SYSTEM_ROLES } from '../../common/permissions';
import { CreateRoleDto, UpdateRoleDto } from './role.dto';
import { AppRole } from './role.entity';

/**
 * Tạo vai trò hệ thống nếu chưa có và gán vai trò cho tài khoản cũ (cột enum `role`).
 * Dùng chung cho lúc khởi động app và script seed.
 */
export async function ensureSystemRoles(ds: DataSource) {
  const repo = ds.getRepository(AppRole);
  let i = 0;
  for (const r of SYSTEM_ROLES) {
    const found = await repo.findOne({ where: { code: r.code }, withDeleted: true });
    if (!found) {
      await repo.save(repo.create({ ...r, isSystem: true, sortOrder: i, knownPermissions: ALL_PERMISSIONS }));
    } else {
      if (found.deletedAt) await repo.restore(found.id);
      // Quyền mới ra đời sau lần kiểm tra trước: cấp cho vai trò hệ thống nếu nằm trong mặc định.
      // Quyền admin đã chủ động bỏ (có trong knownPermissions) thì không cấp lại.
      const known = found.knownPermissions ?? [];
      const added = r.permissions.filter((p) => p !== '*' && !known.includes(p) && !found.permissions.includes(p));
      if (added.length || !found.knownPermissions || known.length !== ALL_PERMISSIONS.length) {
        await repo.update(found.id, {
          permissions: found.permissions.includes('*') ? found.permissions : [...found.permissions, ...added],
          knownPermissions: ALL_PERMISSIONS,
        });
      }
    }
    i++;
  }
  // Tài khoản tạo trước khi có bảng roles: map theo cột enum cũ, còn lại là Nhân viên
  await ds.query(`
    UPDATE users u SET "roleId" = r.id FROM roles r
    WHERE u."roleId" IS NULL AND r.code = COALESCE(u.role::text, 'EMPLOYEE') AND r."deletedAt" IS NULL`);

  // Lưới an toàn: không còn Quản trị nào đang hoạt động thì trả quyền Quản trị cho tài khoản hệ thống (không gắn nhân viên) tạo sớm nhất
  const [{ n }] = await ds.query(`
    SELECT COUNT(*) n FROM users u JOIN roles r ON r.id = u."roleId"
    WHERE r.code = 'ADMIN' AND u."isActive" AND u."deletedAt" IS NULL`);
  if (Number(n) === 0) {
    const rows: { email: string }[] = await ds.query(`
      UPDATE users SET "roleId" = (SELECT id FROM roles WHERE code = 'ADMIN' AND "deletedAt" IS NULL), "isActive" = true
      WHERE id = (SELECT id FROM users WHERE "deletedAt" IS NULL ORDER BY ("employeeId" IS NULL) DESC, "createdAt" ASC LIMIT 1)
      RETURNING email`).then((r: [unknown[], number] | unknown[]) => (Array.isArray(r[0]) ? r[0] : r) as { email: string }[]);
    if (rows[0]) new Logger('Roles').warn(`Không còn tài khoản Quản trị, đã gán Quản trị cho ${rows[0].email}`);
  }
}

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(AppRole) private readonly repo: Repository<AppRole>,
    private readonly ds: DataSource,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    await ensureSystemRoles(this.ds);
    this.logger.log('Đã kiểm tra vai trò hệ thống');
  }

  permissionCatalog() {
    return PERMISSION_GROUPS;
  }

  async findAll() {
    const roles = await this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    const counts: { roleId: string; n: string }[] = await this.repo.manager.query(
      `SELECT "roleId", COUNT(*) n FROM users WHERE "deletedAt" IS NULL GROUP BY "roleId"`,
    );
    const map = new Map(counts.map((c) => [c.roleId, Number(c.n)]));
    return roles.map((r) => ({ ...r, userCount: map.get(r.id) ?? 0 }));
  }

  async findOne(id: string) {
    const r = await this.repo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Không tìm thấy vai trò');
    return r;
  }

  findByCode(code: string) {
    return this.repo.findOne({ where: { code } });
  }

  private snapshot(r: AppRole) {
    const labels = new Map(PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => [i.key as string, i.label as string])));
    return {
      code: r.code,
      name: r.name,
      description: r.description ?? null,
      permissions: r.permissions.includes('*') ? 'Toàn quyền' : r.permissions.map((p) => labels.get(p) ?? p).join('; ') || null,
    };
  }

  async create(dto: CreateRoleDto) {
    if (await this.repo.exists({ where: { code: dto.code } })) throw new ConflictException('Mã vai trò đã tồn tại');
    const max = await this.repo.maximum('sortOrder');
    const saved = await this.repo.save(this.repo.create({ ...dto, sortOrder: (max ?? 0) + 1, knownPermissions: ALL_PERMISSIONS }));
    await this.audit.log({ entityType: 'Role', entityId: saved.id, action: AuditAction.CREATE, label: saved.name, after: this.snapshot(saved) });
    return saved;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const r = await this.findOne(id);
    if (r.code === 'ADMIN') throw new BadRequestException('Không chỉnh được vai trò Quản trị');
    if (r.isSystem && dto.code && dto.code !== r.code) throw new BadRequestException('Không đổi được mã của vai trò hệ thống');
    if (dto.code && dto.code !== r.code && (await this.repo.exists({ where: { code: dto.code } }))) {
      throw new ConflictException('Mã vai trò đã tồn tại');
    }
    const before = this.snapshot(r);
    Object.assign(r, dto);
    r.permissions = r.permissions.filter((p) => ALL_PERMISSIONS.includes(p));
    r.knownPermissions = ALL_PERMISSIONS;
    const saved = await this.repo.save(r);
    await this.audit.log({ entityType: 'Role', entityId: id, action: AuditAction.UPDATE, label: saved.name, before, after: this.snapshot(saved) });
    return saved;
  }

  async remove(id: string) {
    const r = await this.findOne(id);
    if (r.isSystem) throw new BadRequestException('Không xoá được vai trò hệ thống');
    const [{ n }] = await this.repo.manager.query(`SELECT COUNT(*) n FROM users WHERE "roleId" = $1 AND "deletedAt" IS NULL`, [id]);
    if (Number(n) > 0) throw new BadRequestException(`Còn ${n} tài khoản đang dùng vai trò này, hãy chuyển sang vai trò khác trước`);
    await this.repo.softDelete(id);
    await this.audit.log({ entityType: 'Role', entityId: id, action: AuditAction.DELETE, label: r.name });
    return { id };
  }
}
