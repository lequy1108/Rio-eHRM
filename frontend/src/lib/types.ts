export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type EmployeeStatus = 'PROBATION' | 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type DependentRelation = 'CHILD' | 'SPOUSE' | 'FATHER' | 'MOTHER' | 'OTHER';
export type CatalogType = 'ETHNICITY' | 'RELIGION' | 'EDUCATION' | 'BANK' | 'PROVINCE';

interface Base {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department extends Base {
  code: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  parent?: Department | null;
  managerId?: string | null;
  manager?: Employee | null;
  children?: Department[];
  employeeCount?: number;
}

export interface Position extends Base {
  code: string;
  name: string;
  level: number;
  description?: string | null;
  employeeCount?: number;
}

export interface Employee extends Base {
  code: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  identityNumber?: string | null;
  identityIssuedDate?: string | null;
  identityIssuedPlace?: string | null;
  address?: string | null;
  permanentAddress?: string | null;
  maritalStatus?: MaritalStatus | null;
  nationality?: string | null;
  ethnicityId?: string | null;
  ethnicity?: CatalogItem | null;
  religionId?: string | null;
  religion?: CatalogItem | null;
  educationLevelId?: string | null;
  educationLevel?: CatalogItem | null;
  hometownProvinceId?: string | null;
  hometownProvince?: CatalogItem | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  personalTaxCode?: string | null;
  socialInsuranceNumber?: string | null;
  healthInsurancePlace?: string | null;
  bankId?: string | null;
  bank?: CatalogItem | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankBranch?: string | null;
  customFields?: Record<string, unknown>;
  hireDate: string;
  status: EmployeeStatus;
  departmentId?: string | null;
  department?: Department | null;
  positionId?: string | null;
  position?: Position | null;
  managerId?: string | null;
  manager?: Employee | null;
}

export interface CatalogItem extends Base {
  type: CatalogType;
  code: string;
  name: string;
  shortName?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export type CustomFieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'BOOLEAN';

export interface CustomField extends Base {
  entity: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  required: boolean;
  hint?: string | null;
  section: string;
  sortOrder: number;
  isActive: boolean;
  showInList: boolean;
  sensitive: boolean;
}

export const CUSTOM_TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: 'Chữ (một dòng)',
  TEXTAREA: 'Đoạn văn',
  NUMBER: 'Số',
  DATE: 'Ngày',
  SELECT: 'Chọn một',
  MULTISELECT: 'Chọn nhiều',
  BOOLEAN: 'Có/Không',
};

/** Cài đặt công khai: tên, logo, màu, chính sách mật khẩu */
export interface PublicSettings {
  companyName: string;
  companyShortName: string;
  appName: string;
  primaryColor: string;
  loginTitle: string;
  loginSubtitle: string;
  logoUrl: string;
  faviconUrl: string;
  password: { minLength: number; requireUpper: boolean; requireNumber: boolean; requireSymbol: boolean };
}

export interface Dependent extends Base {
  employeeId: string;
  fullName: string;
  relationship: DependentRelation;
  dateOfBirth?: string | null;
  identityNumber?: string | null;
  deductionFrom: string;
  deductionTo?: string | null;
  note?: string | null;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  parentType?: string | null;
  parentId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  label?: string | null;
  changes: Record<string, { from: unknown; to: unknown }>;
  userEmail?: string | null;
  createdAt: string;
}

export interface AppRole extends Base {
  code: string;
  name: string;
  description?: string | null;
  /** Mã quyền; '*' = toàn quyền */
  permissions: string[];
  isSystem: boolean;
  sortOrder: number;
  userCount?: number;
}

export interface PermissionGroup {
  key: string;
  label: string;
  items: { key: string; label: string }[];
}

export interface User extends Base {
  email: string;
  roleId?: string | null;
  role?: AppRole | null;
  /** Có trong /auth/me */
  permissions?: string[];
  isActive: boolean;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  employeeId?: string | null;
  employee?: Employee | null;
}

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  PROBATION: 'Thử việc',
  ACTIVE: 'Chính thức',
  ON_LEAVE: 'Nghỉ dài hạn',
  RESIGNED: 'Đã nghỉ việc',
};

export const GENDER_LABEL: Record<Gender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

export const STATUS_VARIANT: Record<EmployeeStatus, 'warning' | 'success' | 'default' | 'secondary'> = {
  PROBATION: 'warning',
  ACTIVE: 'success',
  ON_LEAVE: 'default',
  RESIGNED: 'secondary',
};

export interface EmployeeStats {
  total: number;
  newThisMonth: number;
  byStatus: { status: EmployeeStatus; count: number }[];
  byDepartment: { department: string; count: number }[];
  byGender: { gender: Gender | 'UNKNOWN'; count: number }[];
  recentHires: Employee[];
}

export interface ImportResult {
  total: number;
  valid: number;
  created: number;
  errors: { row: number; messages: string[] }[];
  preview: { row: number; code?: string; fullName: string; email: string; department?: string }[];
}

export const MARITAL_LABEL: Record<MaritalStatus, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Ly hôn',
  WIDOWED: 'Goá',
};

export const RELATION_LABEL: Record<DependentRelation, string> = {
  CHILD: 'Con',
  SPOUSE: 'Vợ/chồng',
  FATHER: 'Bố',
  MOTHER: 'Mẹ',
  OTHER: 'Khác',
};

export const CATALOG_TYPE_LABEL: Record<CatalogType, string> = {
  ETHNICITY: 'Dân tộc',
  RELIGION: 'Tôn giáo',
  EDUCATION: 'Trình độ học vấn',
  BANK: 'Ngân hàng',
  PROVINCE: 'Tỉnh/thành phố',
};

/** Nhãn tiếng Việt cho các trường trong lịch sử thay đổi */
export const FIELD_LABEL: Record<string, string> = {
  code: 'Mã nhân viên',
  fullName: 'Họ tên',
  email: 'Email',
  phone: 'Số điện thoại',
  gender: 'Giới tính',
  dateOfBirth: 'Ngày sinh',
  nationality: 'Quốc tịch',
  maritalStatus: 'Hôn nhân',
  ethnicity: 'Dân tộc',
  religion: 'Tôn giáo',
  educationLevel: 'Trình độ',
  hometownProvince: 'Quê quán',
  identityNumber: 'Số CCCD',
  identityIssuedDate: 'Ngày cấp CCCD',
  identityIssuedPlace: 'Nơi cấp CCCD',
  permanentAddress: 'Thường trú',
  address: 'Nơi ở hiện tại',
  emergencyContactName: 'Người liên hệ khẩn cấp',
  emergencyContactRelation: 'Quan hệ (liên hệ khẩn cấp)',
  emergencyContactPhone: 'SĐT liên hệ khẩn cấp',
  personalTaxCode: 'MST cá nhân',
  socialInsuranceNumber: 'Mã số BHXH',
  healthInsurancePlace: 'Nơi KCB ban đầu',
  bank: 'Ngân hàng',
  bankAccountNumber: 'Số tài khoản',
  bankAccountName: 'Chủ tài khoản',
  bankBranch: 'Chi nhánh',
  hireDate: 'Ngày vào làm',
  status: 'Trạng thái',
  department: 'Phòng ban',
  position: 'Chức vụ',
  manager: 'Quản lý trực tiếp',
  avatar: 'Ảnh đại diện',
  relationship: 'Quan hệ',
  deductionFrom: 'Giảm trừ từ',
  deductionTo: 'Giảm trừ đến',
  note: 'Ghi chú',
};


/** Chuyển object enum-label thành danh sách lựa chọn cho Select */
export const toOptions = <K extends string>(map: Record<K, string>) =>
  (Object.keys(map) as K[]).map((value) => ({ value, label: map[value] }));
