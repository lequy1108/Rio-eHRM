import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { JwtUser } from '../../common/decorators/current-user.decorator';
import { SettingsService } from '../settings/settings.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

/** Thông tin người dùng gắn vào request sau khi xác thực token */
export function toJwtUser(user: User): JwtUser {
  return {
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    roleCode: user.role?.code ?? null,
    permissions: user.role?.permissions ?? [],
    employeeId: user.employeeId,
  };
}

const minutesLeft = (d: Date) => Math.max(1, Math.ceil((d.getTime() - Date.now()) / 60_000));

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly settings: SettingsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Tài khoản tạm khoá do đăng nhập sai nhiều lần, thử lại sau ${minutesLeft(user.lockedUntil)} phút`,
      );
    }
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      if (user) {
        const until = await this.users.recordFailedLogin(user);
        if (until) {
          throw new UnauthorizedException(
            `Sai mật khẩu quá nhiều lần, tài khoản tạm khoá ${minutesLeft(until)} phút`,
          );
        }
      }
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!user.isActive) throw new UnauthorizedException('Tài khoản đã bị khoá');

    // Token chỉ mang id; quyền được đọc lại mỗi request nên đổi quyền có hiệu lực ngay
    const payload = { sub: user.id, email: user.email };
    await this.users.touchLastLogin(user.id);
    const hours = this.settings.get('security').sessionHours;
    return {
      accessToken: await this.jwt.signAsync(payload, { expiresIn: hours * 3600 }),
      expiresIn: hours * 3600,
      user: await this.me(user.id),
    };
  }

  async me(userId: string) {
    const user = await this.users.findOne(userId);
    return { ...user, permissions: user.role?.permissions ?? [] };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.password))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    await this.users.setPassword(userId, dto.newPassword);
    return { message: 'Đổi mật khẩu thành công' };
  }
}
