import { Building2, FileSignature, FormInput, Mail, Palette, ShieldCheck, UserCheck, Users } from 'lucide-react';

/** Các mục trong trang Cài đặt và quyền cần có */
export const SETTINGS_NAV = [
  { href: '/settings/company', label: 'Thông tin công ty', icon: Building2, perm: 'settings.manage' },
  { href: '/settings/branding', label: 'Giao diện', icon: Palette, perm: 'settings.manage' },
  { href: '/settings/employee', label: 'Quy tắc nhân sự', icon: UserCheck, perm: 'settings.manage' },
  { href: '/settings/contracts', label: 'Hợp đồng', icon: FileSignature, perm: 'contracts.manage' },
  { href: '/settings/custom-fields', label: 'Trường tuỳ chỉnh', icon: FormInput, perm: 'settings.manage' },
  { href: '/settings/roles', label: 'Vai trò và quyền', icon: Users, perm: 'roles.manage' },
  { href: '/settings/security', label: 'Bảo mật', icon: ShieldCheck, perm: 'settings.manage' },
  { href: '/settings/mail', label: 'Email', icon: Mail, perm: 'settings.manage' },
] as const;
