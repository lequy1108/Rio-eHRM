import {
  Briefcase,
  Building2,
  FileSignature,
  LayoutDashboard,
  ListTree,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Cần MỘT trong các quyền này để thấy menu. Bỏ trống = ai đăng nhập cũng xem được */
  anyOf?: string[];
  /** Từ khoá phụ cho ô tìm kiếm nhanh Ctrl+K */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Menu chính. Thêm module mới: thêm 1 dòng vào nhóm phù hợp.
 * Quyền ở đây chỉ để ẩn menu; backend vẫn kiểm tra quyền thật.
 */
export const NAV: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [{ href: '/dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard, keywords: 'dashboard trang chu' }],
  },
  {
    label: 'Nhân sự',
    items: [
      { href: '/employees', label: 'Nhân viên', icon: Users, anyOf: ['employees.view'], keywords: 'nhan vien ho so' },
      { href: '/departments', label: 'Phòng ban', icon: Building2, keywords: 'phong ban to chuc' },
      { href: '/positions', label: 'Chức vụ', icon: Briefcase, keywords: 'chuc vu cap bac' },
      {
        href: '/contracts',
        label: 'Hợp đồng',
        icon: FileSignature,
        anyOf: ['contracts.view'],
        keywords: 'hop dong lao dong gia han het han phu luc',
      },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { href: '/catalogs', label: 'Danh mục', icon: ListTree, anyOf: ['catalogs.manage'], keywords: 'danh muc dan toc ton giao ngan hang tinh thanh' },
      { href: '/users', label: 'Tài khoản', icon: UserCog, anyOf: ['users.manage'], keywords: 'tai khoan dang nhap user' },
      {
        href: '/settings',
        label: 'Cài đặt',
        icon: Settings,
        anyOf: ['settings.manage', 'roles.manage', 'contracts.manage'],
        keywords: 'cai dat cau hinh cong ty logo mau email bao mat phan quyen vai tro truong tuy chinh',
      },
    ],
  },
];

export function canSee(item: NavItem, can: (...p: string[]) => boolean) {
  if (!item.anyOf?.length) return true;
  return item.anyOf.some((p) => can(p));
}

/** Tìm mục menu tương ứng với đường dẫn hiện tại */
export function findNavItem(pathname: string) {
  for (const g of NAV) {
    for (const i of g.items) {
      if (pathname === i.href || pathname.startsWith(i.href + '/')) return i;
    }
  }
  return undefined;
}
