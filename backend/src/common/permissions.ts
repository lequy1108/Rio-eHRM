/**
 * Danh sách quyền theo chức năng. Vai trò (bảng `roles`) lưu mảng mã quyền; '*' = toàn quyền.
 * Thêm chức năng mới: thêm nhóm/quyền ở đây, gắn @Permissions('mã') lên route, rồi tích quyền
 * cho vai trò trong trang Cài đặt → Vai trò và quyền (frontend tự lấy danh sách này từ API).
 */
export const PERMISSION_GROUPS = [
  {
    key: 'employees',
    label: 'Nhân viên',
    items: [
      { key: 'employees.view', label: 'Xem danh sách, hồ sơ và lịch sử thay đổi' },
      { key: 'employees.create', label: 'Thêm nhân viên' },
      { key: 'employees.update', label: 'Sửa hồ sơ, ảnh đại diện' },
      { key: 'employees.delete', label: 'Xoá nhân viên' },
      { key: 'employees.sensitive', label: 'Xem và sửa thuế, BHXH, ngân hàng, người phụ thuộc' },
      { key: 'employees.documents', label: 'Xem, tải lên tài liệu đính kèm (CV, CCCD, bằng cấp…)' },
      { key: 'employees.import', label: 'Nhập từ Excel' },
      { key: 'employees.export', label: 'Xuất Excel' },
    ],
  },
  {
    key: 'organization',
    label: 'Tổ chức',
    items: [{ key: 'organization.manage', label: 'Thêm, sửa, xoá phòng ban và chức vụ' }],
  },
  {
    key: 'system',
    label: 'Hệ thống',
    items: [
      { key: 'catalogs.manage', label: 'Quản lý danh mục dùng chung' },
      { key: 'users.manage', label: 'Quản lý tài khoản đăng nhập' },
      { key: 'roles.manage', label: 'Quản lý vai trò và phân quyền' },
      { key: 'settings.manage', label: 'Cài đặt hệ thống, trường tuỳ chỉnh' },
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]['items'][number]['key'];
export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export function hasPermission(perms: readonly string[] | undefined, ...required: string[]) {
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return required.every((p) => perms.includes(p));
}

/** Vai trò hệ thống, tạo sẵn khi khởi động (không xoá được) */
export const SYSTEM_ROLES: { code: string; name: string; description: string; permissions: string[] }[] = [
  { code: 'ADMIN', name: 'Quản trị', description: 'Toàn quyền, không chỉnh được', permissions: ['*'] },
  {
    code: 'HR',
    name: 'Nhân sự',
    description: 'Quản lý hồ sơ nhân viên và cơ cấu tổ chức',
    permissions: [
      'employees.view',
      'employees.create',
      'employees.update',
      'employees.delete',
      'employees.sensitive',
      'employees.documents',
      'employees.import',
      'employees.export',
      'organization.manage',
      'catalogs.manage',
    ],
  },
  {
    code: 'MANAGER',
    name: 'Quản lý',
    description: 'Xem hồ sơ nhân viên, không xem thông tin thuế và ngân hàng',
    permissions: ['employees.view', 'employees.export'],
  },
  { code: 'EMPLOYEE', name: 'Nhân viên', description: 'Chỉ xem thông tin của mình', permissions: [] },
];
