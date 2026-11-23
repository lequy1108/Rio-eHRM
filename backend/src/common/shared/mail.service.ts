import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { SettingsService } from '../../modules/settings/settings.service';

export interface MailOptions {
  to: string | string[];
  subject: string;
  /** Nội dung HTML (đã được bọc khung mẫu chung) */
  html: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Gửi email. Ưu tiên cấu hình SMTP trong trang Cài đặt → Email; chưa bật thì dùng biến MAIL_* trong .env;
 * không có cả hai thì chỉ ghi log (tiện khi dev). Dùng được Gmail (app password), Mailtrap, SendGrid SMTP…
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private from = '';

  constructor(
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
  ) {}

  onModuleInit() {
    this.build();
    this.settings.events.on('changed:mail', () => this.build());
    this.settings.events.on('changed:branding', () => this.build());
  }

  private build() {
    const m = this.settings.get('mail');
    const appName = this.settings.get('branding').appName;
    this.transporter = undefined;
    if (m.enabled && m.host) {
      this.transporter = nodemailer.createTransport({
        host: m.host,
        port: m.port,
        secure: m.secure,
        auth: m.user ? { user: m.user, pass: m.pass } : undefined,
      });
      this.from = `${m.fromName || appName} <${m.fromEmail || m.user || 'no-reply@localhost'}>`;
      return;
    }
    const host = this.config.get<string>('mail.host');
    if (host) {
      const port = this.config.get<number>('mail.port');
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: this.config.get('mail.user')
          ? { user: this.config.get<string>('mail.user'), pass: this.config.get<string>('mail.pass') }
          : undefined,
      });
      this.from = this.config.get<string>('mail.from') ?? `${appName} <no-reply@localhost>`;
    }
  }

  async send({ to, subject, html }: MailOptions, opts: { throwOnError?: boolean } = {}) {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    if (!recipients) return { sent: false };
    if (!this.transporter) {
      this.logger.log(`[Chưa cấu hình SMTP] Email tới ${recipients}: ${subject}`);
      return { sent: false };
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: recipients, subject, html: this.layout(subject, html) });
      return { sent: true };
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Gửi email thất bại tới ${recipients}: ${msg}`);
      if (opts.throwOnError) throw new BadRequestException(`Gửi email thất bại: ${msg}`);
      return { sent: false };
    }
  }

  private layout(title: string, body: string) {
    const { appName, primaryColor } = this.settings.get('branding');
    const company = this.settings.get('company').name;
    return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
<div style="background:${primaryColor};color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">${esc(appName)}</div>
<div style="padding:24px;color:#18181b;font-size:14px;line-height:1.6"><h2 style="margin-top:0;font-size:18px">${esc(title)}</h2>${body}</div>
<div style="padding:12px 24px;background:#fafafa;color:#71717a;font-size:12px">Email tự động từ ${esc(appName)} · ${esc(company)}, vui lòng không trả lời.</div>
</div></body></html>`;
  }
}
