export enum Role {
  ADMIN = 'ADMIN',
  HR = 'HR',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum EmployeeStatus {
  PROBATION = 'PROBATION', // Thử việc
  ACTIVE = 'ACTIVE', // Chính thức
  ON_LEAVE = 'ON_LEAVE', // Nghỉ dài hạn
  RESIGNED = 'RESIGNED', // Đã nghỉ việc
}

export enum MaritalStatus {
  SINGLE = 'SINGLE', // Độc thân
  MARRIED = 'MARRIED', // Đã kết hôn
  DIVORCED = 'DIVORCED', // Ly hôn
  WIDOWED = 'WIDOWED', // Goá
}

/** Quan hệ của người phụ thuộc với nhân viên */
export enum DependentRelation {
  CHILD = 'CHILD',
  SPOUSE = 'SPOUSE',
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  OTHER = 'OTHER',
}

/** Các loại danh mục dùng chung */
export enum CatalogType {
  ETHNICITY = 'ETHNICITY', // Dân tộc
  RELIGION = 'RELIGION', // Tôn giáo
  EDUCATION = 'EDUCATION', // Trình độ học vấn
  BANK = 'BANK', // Ngân hàng
  PROVINCE = 'PROVINCE', // Tỉnh/thành phố
  DOCUMENT_TYPE = 'DOCUMENT_TYPE', // Loại tài liệu hồ sơ
}

export enum QualificationKind {
  DEGREE = 'DEGREE', // Bằng cấp
  CERTIFICATE = 'CERTIFICATE', // Chứng chỉ
}

export enum SkillKind {
  SKILL = 'SKILL',
  LANGUAGE = 'LANGUAGE',
}

export enum RewardKind {
  REWARD = 'REWARD', // Khen thưởng
  DISCIPLINE = 'DISCIPLINE', // Kỷ luật
}

/** Loại biến động công tác */
export enum WorkChangeType {
  TRANSFER = 'TRANSFER', // Điều chuyển
  PROMOTION = 'PROMOTION', // Thăng chức
  APPOINTMENT = 'APPOINTMENT', // Bổ nhiệm
  DISMISSAL = 'DISMISSAL', // Miễn nhiệm
  DEMOTION = 'DEMOTION', // Giáng chức
  OTHER = 'OTHER',
}

export enum WorkChangeStatus {
  PENDING = 'PENDING', // Chờ đến ngày hiệu lực
  APPLIED = 'APPLIED', // Đã áp dụng vào hồ sơ
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
