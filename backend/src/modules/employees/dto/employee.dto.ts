import { PartialType } from '@nestjs/swagger';
import {
  Matches,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EmployeeStatus, Gender, MaritalStatus } from '../../../common/enums';

export class CreateEmployeeDto {
  /** Bỏ trống để hệ thống tự sinh (NV0001, NV0002...) */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  identityNumber?: string;

  @IsOptional()
  @IsDateString()
  identityIssuedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  identityIssuedPlace?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  /** Giá trị trường tuỳ chỉnh: { khoá: giá trị }, rỗng = xoá */
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  ethnicityId?: string;

  @IsOptional()
  @IsUUID()
  religionId?: string;

  @IsOptional()
  @IsUUID()
  educationLevelId?: string;

  @IsOptional()
  @IsUUID()
  hometownProvinceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  /** 12 số (CCCD, từ 01/07/2025), hoặc MST cũ 10 số / 10-3 số */
  @IsOptional()
  @Matches(/^(\d{12}|\d{10}(-?\d{3})?)$/, { message: 'MST cá nhân là số CCCD 12 số, hoặc MST cũ 10 hay 13 số' })
  personalTaxCode?: string;

  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Mã số BHXH gồm 10 chữ số' })
  socialInsuranceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  healthInsurancePlace?: string;

  @IsOptional()
  @IsUUID()
  bankId?: string;

  @IsOptional()
  @Matches(/^\d{6,19}$/, { message: 'Số tài khoản gồm 6 đến 19 chữ số' })
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankBranch?: string;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class QueryEmployeeDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
