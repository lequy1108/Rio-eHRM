import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { toJwtUser } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: string }): Promise<JwtUser> {
    // Kiểm tra tài khoản còn tồn tại & đang hoạt động
    const user = await this.users.findOne(payload.sub).catch(() => null);
    if (!user || !user.isActive) throw new UnauthorizedException('Tài khoản không hợp lệ');
    return toJwtUser(user);
  }
}
