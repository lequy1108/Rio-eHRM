import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Toàn bộ cài đặt admin chỉnh được trên web, chia theo nhóm.
 * Mỗi nhóm lưu một dòng trong bảng `settings` (key = tên nhóm, value = jsonb).
 * Thêm cài đặt mới: thêm vào DEFAULTS + DTO của nhóm, rồi đọc bằng `settings.get('nhóm')`.
 */

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const optionalText = (max = 255) => [IsOptional(), IsString(), MaxLength(max), trim()];
const intRange = (min: number, max: number, label: string) => {
  const message = `${label} phải là số nguyên từ ${min} đến ${max}`;
  return [IsInt({ message }), Min(min, { message }), Max(max, { message })];
};
const apply = (...decorators: PropertyDecorator[]) => (target: object, key: string) =>
  decorators.forEach((d) => d(target, key));

export class CompanySettings {
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập tên công ty' })
  @MaxLength(255)
  @trim()
  name!: string;

  @apply(...optionalText(100)) shortName!: string;
  @apply(...optionalText(20)) taxCode!: string;
  @apply(...optionalText(500)) address!: string;
  @apply(...optionalText(30)) phone!: string;

  @IsOptional()
  @ValidateIf((o: CompanySettings) => !!o.email)
  @IsEmail({}, { message: 'Email công ty không hợp lệ' })
  email!: string;

  @apply(...optionalText(255)) website!: string;
}

export class BrandingSettings {
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập tên hiển thị' })
  @MaxLength(40, { message: 'Tên hiển thị tối đa 40 ký tự' })
  @trim()
  appName!: string;

  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Màu phải ở dạng #RRGGBB' })
  primaryColor!: string;

  @apply(...optionalText(120)) loginTitle!: string;
  @apply(...optionalText(255)) loginSubtitle!: string;

  /** Đường dẫn ảnh, chỉ đổi qua API tải ảnh */
  @IsOptional() @IsString() logoUrl!: string;
  @IsOptional() @IsString() faviconUrl!: string;
}

export class EmployeeSettings {
  @Matches(/^[A-Za-z0-9_-]{0,10}$/, { message: 'Tiền tố chỉ gồm chữ không dấu, số, - và _, tối đa 10 ký tự' })
  codePrefix!: string;

  @apply(...intRange(2, 10, 'Độ dài số thứ tự'))
  codeLength!: number;

  @apply(...intRange(0, 12, 'Số tháng thử việc'))
  probationMonths!: number;

  @apply(...intRange(0, 60, 'Số ngày nhắc trước'))
  probationRemindDays!: number;

  /** Giờ gửi email nhắc việc hằng ngày (giờ Việt Nam) */
  @apply(...intRange(0, 23, 'Giờ gửi nhắc'))
  reminderHour!: number;

  /** Nhắc chứng chỉ sắp hết hạn trước bao nhiêu ngày; 0 = không nhắc */
  @apply(...intRange(0, 180, 'Số ngày nhắc chứng chỉ'))
  certificateRemindDays!: number;

  @apply(...intRange(1, 20, 'Dung lượng ảnh đại diện'))
  avatarMaxMB!: number;

  @apply(...optionalText(100)) defaultNationality!: string;
}

export class MailSettings {
  @IsBoolean({ message: 'Giá trị bật/tắt không hợp lệ' })
  enabled!: boolean;

  @apply(...optionalText(255)) host!: string;

  @apply(...intRange(1, 65535, 'Cổng SMTP'))
  port!: number;

  @IsBoolean({ message: 'Giá trị bật/tắt không hợp lệ' })
  secure!: boolean;

  @apply(...optionalText(255)) user!: string;
  /** Để trống khi cập nhật = giữ mật khẩu cũ */
  @IsOptional() @IsString() @MaxLength(255) pass!: string;

  @apply(...optionalText(100)) fromName!: string;

  @IsOptional()
  @ValidateIf((o: MailSettings) => !!o.fromEmail)
  @IsEmail({}, { message: 'Email gửi đi không hợp lệ' })
  fromEmail!: string;
}

export class SecuritySettings {
  @apply(...intRange(6, 64, 'Độ dài mật khẩu tối thiểu'))
  passwordMinLength!: number;

  @IsBoolean({ message: 'Giá trị bật/tắt không hợp lệ' }) passwordRequireUpper!: boolean;
  @IsBoolean({ message: 'Giá trị bật/tắt không hợp lệ' }) passwordRequireNumber!: boolean;
  @IsBoolean({ message: 'Giá trị bật/tắt không hợp lệ' }) passwordRequireSymbol!: boolean;

  /** Thời gian giữ đăng nhập (giờ) */
  @apply(...intRange(1, 24 * 90, 'Thời gian giữ đăng nhập'))
  sessionHours!: number;

  /** Số lần nhập sai trước khi tạm khoá; 0 = không khoá */
  @apply(...intRange(0, 50, 'Số lần nhập sai'))
  maxLoginAttempts!: number;

  @apply(...intRange(1, 24 * 60, 'Thời gian tạm khoá'))
  lockMinutes!: number;
}

export const SETTING_CLASSES = {
  company: CompanySettings,
  branding: BrandingSettings,
  employee: EmployeeSettings,
  mail: MailSettings,
  security: SecuritySettings,
};

export type SettingGroup = keyof typeof SETTING_CLASSES;
export type SettingsMap = { [K in SettingGroup]: InstanceType<(typeof SETTING_CLASSES)[K]> };

export const SETTING_GROUP_LABEL: Record<SettingGroup, string> = {
  company: 'Thông tin công ty',
  branding: 'Giao diện',
  employee: 'Quy tắc nhân sự',
  mail: 'Email',
  security: 'Bảo mật',
};

export const SETTING_DEFAULTS: SettingsMap = {
  company: { name: 'Công ty của bạn', shortName: '', taxCode: '', address: '', phone: '', email: '', website: '' },
  branding: {
    appName: 'eHRM',
    primaryColor: '#0049EA',
    loginTitle: 'Đăng nhập',
    loginSubtitle: 'Dùng email công ty mà quản trị viên đã cấp',
    logoUrl: '',
    faviconUrl: '',
  },
  employee: {
    codePrefix: 'NV',
    codeLength: 4,
    probationMonths: 2,
    probationRemindDays: 7,
    reminderHour: 8,
    certificateRemindDays: 30,
    avatarMaxMB: 2,
    defaultNationality: 'Việt Nam',
  },
  mail: {
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: '',
    fromEmail: '',
  },
  security: {
    passwordMinLength: 8,
    passwordRequireUpper: false,
    passwordRequireNumber: true,
    passwordRequireSymbol: false,
    sessionHours: 24,
    maxLoginAttempts: 5,
    lockMinutes: 15,
  },
};
