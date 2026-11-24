import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const emptyToNull = () => Transform(({ value }) => (value === '' ? null : typeof value === 'string' ? value.trim() : value));

export class AllowanceDto {
  @IsString() @IsNotEmpty({ message: 'Nhập tên khoản phụ cấp' }) @MaxLength(100) @trim() name!: string;
  @IsInt({ message: 'Số tiền phụ cấp phải là số nguyên' }) @Min(0) amount!: number;
}

/* ---------- Loại hợp đồng ---------- */
export class CreateContractTypeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9_-]{1,20}$/, { message: 'Mã gồm chữ in hoa không dấu, số, - hoặc _, tối đa 20 ký tự' })
  code!: string;
  @IsString() @IsNotEmpty({ message: 'Nhập tên loại hợp đồng' }) @MaxLength(150) @trim() name!: string;
  @IsBoolean() hasTerm!: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(60, { message: 'Hợp đồng xác định thời hạn tối đa 36 tháng theo luật, nhập tối đa 60' }) defaultMonths?: number | null;
  @IsOptional() @IsBoolean() isProbation?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateContractTypeDto extends PartialType(CreateContractTypeDto) {}

/* ---------- Mẫu hợp đồng ---------- */
export class CreateTemplateDto {
  @IsString() @IsNotEmpty({ message: 'Nhập tên mẫu' }) @MaxLength(150) @trim() name!: string;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() description?: string | null;
  @IsString() @IsNotEmpty({ message: 'Nội dung mẫu đang trống' }) @MaxLength(200_000) content!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

/* ---------- Hợp đồng ---------- */
export class CreateContractDto {
  @IsUUID('all', { message: 'Chọn nhân viên' }) employeeId!: string;
  @IsUUID('all', { message: 'Chọn loại hợp đồng' }) typeId!: string;
  /** Bỏ trống để tự sinh theo Cài đặt → Hợp đồng */
  @IsOptional() @IsString() @MaxLength(60) @emptyToNull() contractNumber?: string | null;
  @IsDateString({}, { message: 'Ngày ký không hợp lệ' }) signDate!: string;
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' }) startDate!: string;
  @IsOptional() @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' }) @emptyToNull() endDate?: string | null;
  @IsOptional() @IsString() @MaxLength(150) @emptyToNull() jobTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() workLocation?: string | null;
  @IsInt({ message: 'Lương cơ bản phải là số nguyên' }) @Min(0) baseSalary!: number;
  @IsOptional() @IsInt() @Min(0) insuranceSalary?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => AllowanceDto) allowances?: AllowanceDto[];
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() signerName?: string | null;
  @IsOptional() @IsString() @MaxLength(100) @emptyToNull() signerTitle?: string | null;
  @IsOptional() @IsString() @emptyToNull() note?: string | null;
  /** Gia hạn/tái ký từ hợp đồng này */
  @IsOptional() @IsUUID() @emptyToNull() previousContractId?: string | null;
}
export class UpdateContractDto extends PartialType(OmitType(CreateContractDto, ['employeeId', 'previousContractId'] as const)) {}

export class TerminateContractDto {
  @IsDateString({}, { message: 'Ngày chấm dứt không hợp lệ' }) terminatedDate!: string;
  @IsString() @IsNotEmpty({ message: 'Nhập lý do chấm dứt' }) @trim() terminationReason!: string;
}

export const CONTRACT_STATES = ['active', 'expiring', 'expired', 'upcoming', 'terminated'] as const;
export type ContractState = (typeof CONTRACT_STATES)[number];

export class QueryContractDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() typeId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsIn(CONTRACT_STATES) state?: ContractState;
  /** Với state=expiring: số ngày tới */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365) days?: number;
}

/* ---------- Phụ lục ---------- */
export class CreateAppendixDto {
  @IsOptional() @IsString() @MaxLength(80) @emptyToNull() appendixNumber?: string | null;
  @IsDateString({}, { message: 'Ngày ký không hợp lệ' }) signDate!: string;
  @IsDateString({}, { message: 'Ngày hiệu lực không hợp lệ' }) effectiveDate!: string;
  @IsOptional() @IsString() @emptyToNull() content?: string | null;
  @IsOptional() @IsString() @MaxLength(150) @emptyToNull() jobTitle?: string | null;
  @IsOptional() @IsInt() @Min(0) baseSalary?: number | null;
  @IsOptional() @IsInt() @Min(0) insuranceSalary?: number | null;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => AllowanceDto) allowances?: AllowanceDto[] | null;
}
export class UpdateAppendixDto extends PartialType(CreateAppendixDto) {}
