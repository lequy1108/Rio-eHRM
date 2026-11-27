import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CreateUserDto, InviteDto, QueryUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { InvitationsService } from './invitations.service';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Permissions('users.manage')
@Controller('users')
export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly invitations: InvitationsService,
  ) {}

  /** Nhân viên có email nhưng chưa có tài khoản */
  @Get('invite-candidates')
  candidates() {
    return this.invitations.candidates();
  }

  /** Tạo tài khoản cho nhân viên và gửi email mời đặt mật khẩu */
  @Post('invite')
  @HttpCode(200)
  invite(@Body() dto: InviteDto) {
    return this.invitations.invite(dto.employeeIds, dto.roleId);
  }

  @Post(':id/resend-invite')
  @HttpCode(200)
  resend(@Param('id', ParseUUIDPipe) id: string) {
    return this.invitations.resend(id);
  }

  @Get()
  findAll(@Query() query: QueryUserDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') me: string,
  ) {
    return this.service.update(id, dto, me);
  }

  /** Admin đặt lại mật khẩu cho tài khoản */
  @Patch(':id/password')
  async resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    await this.service.findOne(id);
    await this.service.setPassword(id, dto.password);
    return { message: 'Đã đặt lại mật khẩu' };
  }

  /** Mở khoá tài khoản bị tạm khoá do đăng nhập sai nhiều lần */
  @Patch(':id/unlock')
  unlock(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unlock(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') me: string) {
    return this.service.remove(id, me);
  }
}
