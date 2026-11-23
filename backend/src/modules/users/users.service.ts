import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { ILike, Not, Repository } from 'typeorm';
import { paginate, safeSort } from '../../common/dto/pagination-query.dto';
import { AppRole } from '../roles/role.entity';
import { SettingsService } from '../settings/settings.service';
import { CreateUserDto, QueryUserDto, UpdateUserDto } from './dto/user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(AppRole) private readonly roles: Repository<AppRole>,
    private readonly settings: SettingsService,
  ) {}

  async findAll(query: QueryUserDto) {
    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.employee', 'employee')
      .leftJoinAndSelect('u.role', 'role');
    if (query.search) {
      qb.andWhere('(u.email ILIKE :s OR employee.fullName ILIKE :s OR employee.code ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.roleId) qb.andWhere('u.roleId = :roleId', { roleId: query.roleId });
    if (query.isActive !== undefined) qb.andWhere('u.isActive = :a', { a: query.isActive });
    const sort = safeSort(query, ['email', 'role', 'lastLoginAt', 'createdAt']);
    qb.orderBy(sort === 'role' ? 'role.sortOrder' : `u.${sort}`, query.order, 'NULLS LAST')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, query);
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id }, relations: { employee: true } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  /** Lấy user kèm password để xác thực */
  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .addSelect('u.failedLoginCount')
      .leftJoinAndSelect('u.role', 'role')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  findByIdWithPassword(id: string) {
    return this.repo.createQueryBuilder('u').addSelect('u.password').where('u.id = :id', { id }).getOne();
  }

  private async ensureRole(roleId: string) {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Vai trò không tồn tại');
    return role;
  }

  /** Không để hệ thống mất hết tài khoản Quản trị đang hoạt động */
  private async ensureOtherAdmin(exceptUserId: string) {
    const n = await this.repo.count({
      where: { id: Not(exceptUserId), isActive: true, role: { code: 'ADMIN' } },
    });
    if (n === 0) throw new BadRequestException('Cần giữ lại ít nhất một tài khoản Quản trị đang hoạt động');
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.exists({ where: { email: ILike(dto.email) } });
    if (exists) throw new ConflictException('Email đã được sử dụng');
    if (dto.employeeId && (await this.repo.exists({ where: { employeeId: dto.employeeId } }))) {
      throw new ConflictException('Nhân viên này đã có tài khoản');
    }
    await this.ensureRole(dto.roleId);
    this.settings.assertPassword(dto.password);
    const user = this.repo.create({
      ...dto,
      email: dto.email.toLowerCase(),
      password: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.repo.save(user);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId?: string) {
    const user = await this.findOne(id);
    if (id === currentUserId) {
      if (dto.isActive === false) throw new BadRequestException('Bạn không thể tự khoá tài khoản của mình');
      if (dto.roleId && dto.roleId !== user.roleId) throw new BadRequestException('Bạn không thể tự đổi vai trò của mình');
    }
    if (dto.employeeId) {
      const taken = await this.repo.findOne({ where: { employeeId: dto.employeeId } });
      if (taken && taken.id !== id) throw new ConflictException('Nhân viên này đã có tài khoản khác');
    }
    if (dto.roleId) await this.ensureRole(dto.roleId);
    const losingAdmin =
      user.role?.code === 'ADMIN' &&
      ((dto.roleId && dto.roleId !== user.roleId) || dto.isActive === false);
    if (losingAdmin) await this.ensureOtherAdmin(id);

    Object.assign(user, dto);
    delete user.employee;
    delete user.role;
    await this.repo.save(user);
    return this.findOne(id);
  }

  async setPassword(id: string, password: string) {
    this.settings.assertPassword(password);
    await this.repo.update(id, { password: await bcrypt.hash(password, 10), failedLoginCount: 0, lockedUntil: null });
  }

  async unlock(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { failedLoginCount: 0, lockedUntil: null });
    return this.findOne(id);
  }

  /** Ghi nhận đăng nhập sai; đủ số lần cấu hình thì tạm khoá */
  async recordFailedLogin(user: User) {
    const { maxLoginAttempts, lockMinutes } = this.settings.get('security');
    if (!maxLoginAttempts) return null;
    const count = (user.failedLoginCount ?? 0) + 1;
    if (count >= maxLoginAttempts) {
      const until = new Date(Date.now() + lockMinutes * 60_000);
      await this.repo.update(user.id, { failedLoginCount: 0, lockedUntil: until });
      return until;
    }
    await this.repo.update(user.id, { failedLoginCount: count });
    return null;
  }

  async touchLastLogin(id: string) {
    await this.repo.update(id, { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null });
  }

  async remove(id: string, currentUserId?: string) {
    if (id === currentUserId) throw new BadRequestException('Bạn không thể xoá tài khoản của chính mình');
    const user = await this.findOne(id);
    if (user.role?.code === 'ADMIN') await this.ensureOtherAdmin(id);
    await this.repo.softDelete(id);
    return { id };
  }
}
