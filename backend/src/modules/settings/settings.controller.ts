import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MailService } from '../../common/shared/mail.service';
import { FILE_TYPES, publicPath, uploadOptions } from '../../common/shared/upload';
import { SettingsService } from './settings.service';

class TestMailDto {
  @IsEmail({}, { message: 'Email nhận không hợp lệ' })
  to!: string;
}

const BRANDING_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  /** Tên, logo, màu… dùng cho trang đăng nhập và khung giao diện */
  @Public()
  @Get('public')
  publicInfo() {
    return this.settings.publicInfo();
  }

  @ApiBearerAuth()
  @Get()
  @Permissions('settings.manage')
  all() {
    return this.settings.all();
  }

  /** Cài đặt hợp đồng: người quản lý hợp đồng tự chỉnh được, không cần quyền cài đặt hệ thống */
  @ApiBearerAuth()
  @Get('contract')
  @Permissions('contracts.manage')
  contract() {
    return this.settings.get('contract');
  }

  @ApiBearerAuth()
  @Put('contract')
  @Permissions('contracts.manage')
  updateContract(@Body() body: Record<string, unknown>) {
    return this.settings.update('contract', body ?? {});
  }

  @ApiBearerAuth()
  @Put(':group')
  @Permissions('settings.manage')
  update(@Param('group') group: string, @Body() body: Record<string, unknown>) {
    if (!this.settings.isGroup(group)) throw new BadRequestException('Nhóm cài đặt không tồn tại');
    return this.settings.update(group, body ?? {});
  }

  @ApiBearerAuth()
  @Post('branding/:kind')
  @Permissions('settings.manage')
  @UseInterceptors(FileInterceptor('file', uploadOptions({ folder: 'branding', types: BRANDING_IMAGE, maxSizeMB: 2 })))
  async uploadImage(@Param('kind') kind: string, @UploadedFile() file?: Express.Multer.File) {
    if (kind !== 'logo' && kind !== 'favicon') throw new BadRequestException('Loại ảnh không hợp lệ');
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    const url = publicPath('branding', file.filename);
    await this.settings.update('branding', { [`${kind}Url`]: url });
    return this.settings.publicInfo();
  }

  @ApiBearerAuth()
  @Delete('branding/:kind')
  @Permissions('settings.manage')
  async removeImage(@Param('kind') kind: string) {
    if (kind !== 'logo' && kind !== 'favicon') throw new BadRequestException('Loại ảnh không hợp lệ');
    await this.settings.update('branding', { [`${kind}Url`]: '' });
    return this.settings.publicInfo();
  }

  /** Gửi email thử với cấu hình SMTP đang lưu */
  @ApiBearerAuth()
  @Post('mail/test')
  @HttpCode(200)
  @Permissions('settings.manage')
  async testMail(@Body() dto: TestMailDto, @CurrentUser('email') email: string) {
    const res = await this.mail.send(
      {
        to: dto.to || email,
        subject: 'Email thử từ hệ thống',
        html: '<p>Cấu hình gửi email đang hoạt động.</p>',
      },
      { throwOnError: true },
    );
    if (!res.sent) throw new BadRequestException('Chưa bật gửi email hoặc chưa nhập máy chủ SMTP');
    return { message: `Đã gửi email thử tới ${dto.to}` };
  }
}
