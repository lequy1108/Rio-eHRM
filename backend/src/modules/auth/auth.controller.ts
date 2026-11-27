import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, SetPasswordDto } from './dto/auth.dto';
import { InvitationsService } from '../users/invitations.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationsService,
  ) {}

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.invitations.forgot(dto.email);
  }

  /** Kiểm tra link mời / đặt lại mật khẩu trước khi hiện form */
  @Public()
  @Get('token-info')
  tokenInfo(@Query('token') token: string) {
    return this.invitations.info(token ?? '');
  }

  @Public()
  @Post('set-password')
  @HttpCode(200)
  setPassword(@Body() dto: SetPasswordDto) {
    return this.invitations.setPassword(dto.token, dto.password);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.auth.me(userId);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(200)
  changePassword(@CurrentUser('sub') userId: string, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto);
  }
}
