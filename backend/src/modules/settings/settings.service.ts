import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EventEmitter } from 'events';
import { Repository } from 'typeorm';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction } from '../../common/enums';
import { Setting } from './setting.entity';
import { SETTING_CLASSES, SETTING_DEFAULTS, SETTING_GROUP_LABEL, type SettingGroup, type SettingsMap } from './settings.schema';

const SECRET_FIELDS: Partial<Record<SettingGroup, string[]>> = { mail: ['pass'] };

/**
 * Đọc/ghi cài đặt hệ thống. Toàn bộ cài đặt nằm trong bộ nhớ (cache), đọc đồng bộ:
 *   this.settings.get('employee').probationMonths
 * Khi một nhóm thay đổi sẽ phát sự kiện `changed:<nhóm>` để nơi khác cập nhật (vd MailService).
 */
@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cache: SettingsMap = structuredClone(SETTING_DEFAULTS);
  readonly events = new EventEmitter();

  constructor(
    @InjectRepository(Setting) private readonly repo: Repository<Setting>,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    const rows = await this.repo.find();
    for (const row of rows) {
      const group = row.key as SettingGroup;
      if (group in SETTING_DEFAULTS) {
        // Gộp với mặc định để cài đặt mới thêm sau vẫn có giá trị
        this.cache[group] = { ...SETTING_DEFAULTS[group], ...row.value } as never;
      }
    }
    this.logger.log(`Đã nạp ${rows.length} nhóm cài đặt`);
  }

  get<K extends SettingGroup>(group: K): SettingsMap[K] {
    return this.cache[group];
  }

  isGroup(group: string): group is SettingGroup {
    return group in SETTING_DEFAULTS;
  }

  /** Bản cho trang quản trị: ẩn mật khẩu SMTP */
  all() {
    const out = structuredClone(this.cache) as unknown as Record<string, Record<string, unknown>>;
    for (const [g, fields] of Object.entries(SECRET_FIELDS)) {
      for (const f of fields) {
        out[g][`${f}Set`] = !!out[g][f];
        out[g][f] = '';
      }
    }
    return out;
  }

  /** Bản công khai cho trang đăng nhập và giao diện (không cần đăng nhập) */
  publicInfo() {
    const { company, branding, security } = this.cache;
    return {
      companyName: company.name,
      companyShortName: company.shortName,
      ...branding,
      password: {
        minLength: security.passwordMinLength,
        requireUpper: security.passwordRequireUpper,
        requireNumber: security.passwordRequireNumber,
        requireSymbol: security.passwordRequireSymbol,
      },
    };
  }

  async update<K extends SettingGroup>(group: K, patch: Record<string, unknown>) {
    const before = this.cache[group] as unknown as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...before, ...patch };
    // Trường bí mật để trống = giữ giá trị cũ
    for (const f of SECRET_FIELDS[group] ?? []) {
      if (patch[f] === '' || patch[f] === undefined) merged[f] = before[f];
    }
    for (const k of Object.keys(merged)) if (!(k in SETTING_DEFAULTS[group])) delete merged[k];

    const instance = plainToInstance(SETTING_CLASSES[group] as new () => object, merged);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length) {
      const msg = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new BadRequestException(msg);
    }
    const value = { ...instance } as Record<string, unknown>;
    await this.repo.save({ key: group, value });
    this.cache[group] = value as never;

    const mask = (o: Record<string, unknown>) => {
      const c = { ...o };
      for (const f of SECRET_FIELDS[group] ?? []) c[f] = c[f] ? '••••••' : null;
      return c;
    };
    await this.audit.log({
      entityType: 'Setting',
      entityId: group,
      action: AuditAction.UPDATE,
      label: SETTING_GROUP_LABEL[group],
      before: mask(before),
      after: mask(value),
    });
    this.events.emit(`changed:${group}`, value);
    return this.all()[group];
  }

  /** Địa chỉ frontend để tạo link trong email: Cài đặt → Giao diện, rồi biến FRONTEND_URL, rồi CORS_ORIGIN */
  appUrl() {
    const url = this.cache.branding.appUrl || process.env.FRONTEND_URL || (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(',')[0];
    return url.replace(/\/+$/, '');
  }

  /** Kiểm tra mật khẩu theo chính sách trong mục Bảo mật */
  assertPassword(password: string) {
    const s = this.cache.security;
    const errs: string[] = [];
    if (password.length < s.passwordMinLength) errs.push(`ít nhất ${s.passwordMinLength} ký tự`);
    if (s.passwordRequireUpper && !/[A-Z]/.test(password)) errs.push('có chữ hoa');
    if (s.passwordRequireNumber && !/\d/.test(password)) errs.push('có chữ số');
    if (s.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) errs.push('có ký tự đặc biệt');
    if (errs.length) throw new BadRequestException(`Mật khẩu cần ${errs.join(', ')}`);
  }
}
