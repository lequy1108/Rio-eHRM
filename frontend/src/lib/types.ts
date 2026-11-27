export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type EmployeeStatus = 'PROBATION' | 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type DependentRelation = 'CHILD' | 'SPOUSE' | 'FATHER' | 'MOTHER' | 'OTHER';
export type CatalogType = 'ETHNICITY' | 'RELIGION' | 'EDUCATION' | 'BANK' | 'PROVINCE' | 'DOCUMENT_TYPE';

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
  /** Chỉ có ở GET /employees/:id khi đang thử việc */
  probationEnd?: { date: string; source: 'contract' | 'estimate' } | null;
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

/* ---------- Hồ sơ đợt 2: năng lực, công tác, tài liệu ---------- */

export interface EmployeeChild extends Base {
  employeeId: string;
}

export interface Qualification extends EmployeeChild {
  kind: 'DEGREE' | 'CERTIFICATE';
  name: string;
  educationLevelId?: string | null;
  educationLevel?: CatalogItem | null;
  major?: string | null;
  institution?: string | null;
  grade?: string | null;
  certificateNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  note?: string | null;
}

export interface Experience extends EmployeeChild {
  companyName: string;
  position?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  description?: string | null;
  reference?: string | null;
}

export interface Skill extends EmployeeChild {
  kind: 'SKILL' | 'LANGUAGE';
  name: string;
  level?: number | null;
  note?: string | null;
}

export interface Reward extends EmployeeChild {
  kind: 'REWARD' | 'DISCIPLINE';
  title: string;
  form?: string | null;
  decisionNumber?: string | null;
  decisionDate: string;
  amount?: number | null;
  reason?: string | null;
}

export interface EmployeeDocument extends EmployeeChild {
  categoryId?: string | null;
  category?: CatalogItem | null;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  note?: string | null;
}

export type WorkChangeType = 'TRANSFER' | 'PROMOTION' | 'APPOINTMENT' | 'DISMISSAL' | 'DEMOTION' | 'OTHER';

export interface WorkHistory extends EmployeeChild {
  type: WorkChangeType;
  effectiveDate: string;
  decisionNumber?: string | null;
  status: 'PENDING' | 'APPLIED';
  appliedAt?: string | null;
  fromDepartmentId?: string | null;
  toDepartmentId?: string | null;
  fromPositionId?: string | null;
  toPositionId?: string | null;
  fromManagerId?: string | null;
  toManagerId?: string | null;
  fromDepartment?: Department | null;
  toDepartment?: Department | null;
  fromPosition?: Position | null;
  toPosition?: Position | null;
  fromManager?: Employee | null;
  toManager?: Employee | null;
  note?: string | null;
}

export interface UpcomingEvent {
  type: 'BIRTHDAY' | 'ANNIVERSARY';
  date: string;
  inDays: number;
  years: number;
  employee: Pick<Employee, 'id' | 'code' | 'fullName' | 'avatarUrl' | 'department'>;
}

export const QUALIFICATION_KIND_LABEL = { DEGREE: 'Bằng cấp', CERTIFICATE: 'Chứng chỉ' } as const;
export const SKILL_KIND_LABEL = { SKILL: 'Kỹ năng', LANGUAGE: 'Ngoại ngữ' } as const;
export const REWARD_KIND_LABEL = { REWARD: 'Khen thưởng', DISCIPLINE: 'Kỷ luật' } as const;
export const WORK_CHANGE_LABEL: Record<WorkChangeType, string> = {
  TRANSFER: 'Điều chuyển',
  PROMOTION: 'Thăng chức',
  APPOINTMENT: 'Bổ nhiệm',
  DISMISSAL: 'Miễn nhiệm',
  DEMOTION: 'Giáng chức',
  OTHER: 'Khác',
};
export const SKILL_LEVEL_LABEL = ['', 'Cơ bản', 'Trung bình', 'Khá', 'Tốt', 'Thành thạo'];

/* ---------- Hợp đồng lao động ---------- */

export interface Allowance {
  name: string;
  amount: number;
}

export interface ContractType extends Base {
  code: string;
  name: string;
  hasTerm: boolean;
  defaultMonths?: number | null;
  isProbation: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface ContractTemplate extends Base {
  name: string;
  description?: string | null;
  content?: string;
  isDefault: boolean;
}

export interface ContractAppendix extends Base {
  contractId: string;
  appendixNumber: string;
  signDate: string;
  effectiveDate: string;
  content?: string | null;
  jobTitle?: string | null;
  baseSalary?: number | null;
  insuranceSalary?: number | null;
  allowances?: Allowance[] | null;
}

export type ContractState = 'upcoming' | 'active' | 'expiring' | 'expired' | 'terminated';

export interface Contract extends Base {
  employeeId: string;
  employee?: Employee;
  typeId?: string | null;
  type?: ContractType | null;
  contractNumber: string;
  signDate: string;
  startDate: string;
  endDate?: string | null;
  jobTitle?: string | null;
  workLocation?: string | null;
  baseSalary: number;
  insuranceSalary?: number | null;
  allowances: Allowance[];
  signerName?: string | null;
  signerTitle?: string | null;
  note?: string | null;
  previousContractId?: string | null;
  previousContract?: Contract | null;
  status: 'ACTIVE' | 'TERMINATED';
  terminatedDate?: string | null;
  terminationReason?: string | null;
  signedFileName?: string | null;
  signedFileMime?: string | null;
  signedFileSize?: number | null;
  appendices?: ContractAppendix[];
  state: ContractState;
  daysLeft: number | null;
  renewedBy?: { id: string; contractNumber: string } | null;
  current?: { jobTitle?: string | null; baseSalary: number; insuranceSalary?: number | null; allowances: Allowance[] };
}

export const CONTRACT_STATE: Record<ContractState, { label: string; dot: string }> = {
  active: { label: 'Đang hiệu lực', dot: 'bg-success' },
  expiring: { label: 'Sắp hết hạn', dot: 'bg-warning' },
  expired: { label: 'Đã hết hạn', dot: 'bg-destructive' },
  upcoming: { label: 'Chưa bắt đầu', dot: 'bg-primary' },
  terminated: { label: 'Đã chấm dứt', dot: 'bg-muted-foreground/40' },
};

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
  /** Tạo qua lời mời, chưa tự đặt mật khẩu */
  mustSetPassword?: boolean;
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
  DOCUMENT_TYPE: 'Loại tài liệu',
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
  kind: 'Loại',
  name: 'Tên',
  major: 'Chuyên ngành',
  institution: 'Nơi cấp',
  grade: 'Xếp loại',
  certificateNumber: 'Số hiệu',
  issueDate: 'Ngày cấp',
  expiryDate: 'Ngày hết hạn',
  companyName: 'Công ty',
  fromDate: 'Từ ngày',
  toDate: 'Đến ngày',
  description: 'Mô tả',
  reference: 'Người tham chiếu',
  level: 'Mức độ',
  title: 'Nội dung',
  form: 'Hình thức',
  decisionNumber: 'Số quyết định',
  decisionDate: 'Ngày quyết định',
  amount: 'Số tiền',
  reason: 'Lý do',
  category: 'Loại tài liệu',
  fileName: 'File',
  type: 'Loại',
  effectiveDate: 'Ngày hiệu lực',
  toDepartment: 'Phòng ban mới',
  toPosition: 'Chức vụ mới',
  toManager: 'Quản lý mới',
  contractNumber: 'Số hợp đồng',
  contractType: 'Loại hợp đồng',
  signDate: 'Ngày ký',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  jobTitle: 'Chức danh',
  workLocation: 'Địa điểm làm việc',
  baseSalary: 'Lương cơ bản',
  insuranceSalary: 'Lương đóng BHXH',
  allowances: 'Phụ cấp',
  signerName: 'Người ký',
  contractStatus: 'Trạng thái hợp đồng',
  signedFile: 'Bản scan đã ký',
  appendixNumber: 'Số phụ lục',
  content: 'Nội dung',
};


/** Chuyển object enum-label thành danh sách lựa chọn cho Select */
export const toOptions = <K extends string>(map: Record<K, string>) =>
  (Object.keys(map) as K[]).map((value) => ({ value, label: map[value] }));

export interface Holiday {
  id: string;
  date: string;
  name: string;
  paid: boolean;
  note?: string | null;
}

export interface OrgNode {
  id: string;
  code: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  managerId?: string | null;
  status: EmployeeStatus;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
}
