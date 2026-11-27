import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { EmployeeStatus } from '../../common/enums';
import { MailService } from '../../common/shared/mail.service';
import { Employee } from '../employees/entities/employee.entity';
import { AppRole } from '../roles/role.entity';
import { SettingsService } from '../settings/settings.service';
import { User } from './entities/user.entity';
import { UserToken, UserTokenType } from './entities/user-token.entity';

const INVITE_HOURS = 72;
const RESET_MINUTES = 60;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface InviteResult {
  employeeId?: string;
  userId?: string;
  email: string;
  fullName?: string;
  /** sent: đã gửi email; link: chưa cấu hình email, trả link để quản trị gửi tay; skipped: bỏ qua */
  status: 'sent' | 'link' | 'skipped';
  reason?: string;
  link?: string;
}

/**
 * Lời mời tạo tài khoản và quên mật khẩu bằng link có hạn trong email.
 * Link dạng <appUrl>/set-password?token=...; token dùng một lần.
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(UserToken) private readonly tokens: Repository<UserToken>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(AppRole) private readonly roles: Repository<AppRole>,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  /** Tạo token mới, vô hiệu token cùng loại chưa dùng */
  private async issue(userId: string, type: UserTokenType, minutes: number) {
    await this.tokens.update({ userId, type, usedAt: IsNull() }, { usedAt: new Date() });
    const raw = randomBytes(32).toString('base64url');
    await this.tokens.save(
      this.tokens.create({ userId, type, tokenHash: sha(raw), expiresAt: new Date(Date.now() + minutes * 60_000) }),
    );
    return `${this.settings.appUrl()}/set-password?token=${raw}`;
  }

  private async find(raw: string) {
    if (!raw || raw.length < 20) return null;
    return this.tokens.findOne({ where: { tokenHash: sha(raw) }, relations: { user: { employee: true } } });
  }

  /** Thông tin hiển thị trên trang đặt mật khẩu (không lộ gì nếu token sai) */
  async info(raw: string) {
    const t = await this.find(raw);
    if (!t || t.usedAt || t.expiresAt < new Date() || !t.user?.isActive) {
      throw new BadRequestException('Link không hợp lệ hoặc đã hết hạn. Hãy yêu cầu gửi lại');
    }
    return { type: t.type, email: t.user.email, fullName: t.user.employee?.fullName ?? null, expiresAt: t.expiresAt };
  }

  /** Đặt mật khẩu bằng token; trả email để trang đăng nhập điền sẵn */
  async setPassword(raw: string, password: string) {
    const t = await this.find(raw);
    if (!t || t.usedAt || t.expiresAt < new Date() || !t.user?.isActive) {
      throw new BadRequestException('Link không hợp lệ hoặc đã hết hạn. Hãy yêu cầu gửi lại');
    }
    this.settings.assertPassword(password);
    await this.users.update(t.userId, {
      password: await bcrypt.hash(password, 10),
      mustSetPassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    });
    await this.tokens.update({ userId: t.userId, usedAt: IsNull() }, { usedAt: new Date() });
    return { email: t.user.email };
  }

  private mailInvite(email: string, name: string, link: string) {
    const app = this.settings.get('branding').appName;
    const company = this.settings.get('company').name;
    return this.mail.send({
      to: email,
      subject: `Mời bạn sử dụng ${app}`,
      html: `<p>Chào ${esc(name)},</p>
<p>${esc(company)} đã tạo tài khoản ${esc(app)} cho bạn với email <b>${esc(email)}</b>. Bấm nút dưới để đặt mật khẩu và đăng nhập:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:${this.settings.get('branding').primaryColor};color:#fff;text-decoration:none">Đặt mật khẩu</a></p>
<p style="color:#71717a;font-size:12px">Link dùng một lần và hết hạn sau ${INVITE_HOURS} giờ. Nếu nút không bấm được, mở link: ${link}</p>`,
    });
  }

  /** Nhân viên có email, chưa có tài khoản, chưa nghỉ việc */
  candidates() {
    return this.employees
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.department', 'd')
      .leftJoin(User, 'u', 'u.employeeId = e.id AND u.deletedAt IS NULL')
      .where('u.id IS NULL')
      .andWhere('e.status != :s', { s: EmployeeStatus.RESIGNED })
      .andWhere("e.email IS NOT NULL AND e.email != ''")
      .orderBy('e.code', 'ASC')
      .getMany();
  }

  /** Tạo tài khoản cho các nhân viên và gửi lời mời */
  async invite(employeeIds: string[], roleId?: string): Promise<InviteResult[]> {
    const role =
      (roleId && (await this.roles.findOne({ where: { id: roleId } }))) || (await this.roles.findOne({ where: { code: 'EMPLOYEE' } }));
    if (!role) throw new BadRequestException('Vai trò không tồn tại');
    const list = await this.employees.find({ where: { id: In(employeeIds) } });
    const out: InviteResult[] = [];
    for (const e of list) {
      const base = { employeeId: e.id, email: e.email, fullName: e.fullName };
      if (await this.users.exists({ where: { employeeId: e.id } })) {
        out.push({ ...base, status: 'skipped', reason: 'Đã có tài khoản' });
        continue;
      }
      if (await this.users.exists({ where: { email: e.email.toLowerCase() } })) {
        out.push({ ...base, status: 'skipped', reason: 'Email đã dùng cho tài khoản khác' });
        continue;
      }
      const user = await this.users.save(
        this.users.create({
          email: e.email.toLowerCase(),
          employeeId: e.id,
          roleId: role.id,
          // Mật khẩu ngẫu nhiên không ai biết; người dùng tự đặt qua link
          password: await bcrypt.hash(randomBytes(24).toString('hex'), 10),
          mustSetPassword: true,
        }),
      );
      out.push({ ...(await this.send(user, e.fullName)), employeeId: e.id });
    }
    return out;
  }

  private async send(user: User, name: string): Promise<InviteResult> {
    const link = await this.issue(user.id, UserTokenType.INVITE, INVITE_HOURS * 60);
    const { sent } = await this.mailInvite(user.email, name, link);
    return { userId: user.id, email: user.email, fullName: name, status: sent ? 'sent' : 'link', link: sent ? undefined : link };
  }

  /** Gửi lại lời mời (hoặc link đặt mật khẩu mới) cho một tài khoản */
  async resend(userId: string) {
    const user = await this.users.findOne({ where: { id: userId }, relations: { employee: true } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (!user.isActive) throw new BadRequestException('Tài khoản đang bị khoá');
    return this.send(user, user.employee?.fullName ?? user.email);
  }

  /** Quên mật khẩu: luôn trả cùng một thông báo để không lộ email nào có tài khoản */
  async forgot(email: string) {
    const user = await this.users.findOne({ where: { email: email.trim().toLowerCase(), isActive: true }, relations: { employee: true } });
    if (user) {
      // Chống gửi liên tục: mỗi 2 phút tối đa một email
      const recent = await this.tokens.exists({
        where: { userId: user.id, createdAt: MoreThan(new Date(Date.now() - 2 * 60_000)), type: Not(IsNull()) },
      });
      if (!recent) {
        const name = user.employee?.fullName ?? user.email;
        if (user.mustSetPassword) {
          await this.send(user, name);
        } else {
          const link = await this.issue(user.id, UserTokenType.RESET, RESET_MINUTES);
          const app = this.settings.get('branding').appName;
          const { sent } = await this.mail.send({
            to: user.email,
            subject: `Đặt lại mật khẩu ${app}`,
            html: `<p>Chào ${esc(name)},</p>
<p>Có yêu cầu đặt lại mật khẩu cho tài khoản <b>${esc(user.email)}</b>. Bấm nút dưới để đặt mật khẩu mới:</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:${this.settings.get('branding').primaryColor};color:#fff;text-decoration:none">Đặt lại mật khẩu</a></p>
<p style="color:#71717a;font-size:12px">Link hết hạn sau ${RESET_MINUTES} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này, mật khẩu cũ vẫn dùng được.</p>`,
          });
          if (!sent) this.logger.warn(`[Chưa cấu hình email] Link đặt lại mật khẩu cho ${user.email}: ${link}`);
        }
      }
    }
    return { message: 'Nếu email có tài khoản, hệ thống đã gửi link đặt lại mật khẩu. Kiểm tra hộp thư (cả mục Spam)' };
  }
}
