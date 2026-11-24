import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { QualificationKind, RewardKind, SkillKind } from '../../../common/enums';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
/** Chuỗi rỗng → null để xoá giá trị cũ */
const emptyToNull = () => Transform(({ value }) => (value === '' ? null : typeof value === 'string' ? value.trim() : value));

export class CreateQualificationDto {
  @IsEnum(QualificationKind) kind!: QualificationKind;
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên bằng cấp/chứng chỉ' }) @MaxLength(255) @trim() name!: string;
  @IsOptional() @IsUUID() @emptyToNull() educationLevelId?: string | null;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() major?: string | null;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() institution?: string | null;
  @IsOptional() @IsString() @MaxLength(50) @emptyToNull() grade?: string | null;
  @IsOptional() @IsString() @MaxLength(100) @emptyToNull() certificateNumber?: string | null;
  @IsOptional() @IsDateString({}, { message: 'Ngày cấp không hợp lệ' }) @emptyToNull() issueDate?: string | null;
  @IsOptional() @IsDateString({}, { message: 'Ngày hết hạn không hợp lệ' }) @emptyToNull() expiryDate?: string | null;
  @IsOptional() @IsString() @emptyToNull() note?: string | null;
}
export class UpdateQualificationDto extends PartialType(CreateQualificationDto) {}

export class CreateExperienceDto {
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên công ty' }) @MaxLength(255) @trim() companyName!: string;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() position?: string | null;
  @IsOptional() @IsDateString() @emptyToNull() fromDate?: string | null;
  @IsOptional() @IsDateString() @emptyToNull() toDate?: string | null;
  @IsOptional() @IsString() @emptyToNull() description?: string | null;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() reference?: string | null;
}
export class UpdateExperienceDto extends PartialType(CreateExperienceDto) {}

export class CreateSkillDto {
  @IsEnum(SkillKind) kind!: SkillKind;
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên kỹ năng' }) @MaxLength(100) @trim() name!: string;
  @IsOptional() @IsInt() @Min(1) @Max(5, { message: 'Mức độ từ 1 đến 5' }) level?: number | null;
  @IsOptional() @IsString() @MaxLength(255) @emptyToNull() note?: string | null;
}
export class UpdateSkillDto extends PartialType(CreateSkillDto) {}

export class CreateRewardDto {
  @IsEnum(RewardKind) kind!: RewardKind;
  @IsString() @IsNotEmpty({ message: 'Vui lòng nhập nội dung' }) @MaxLength(255) @trim() title!: string;
  @IsOptional() @IsString() @MaxLength(100) @emptyToNull() form?: string | null;
  @IsOptional() @IsString() @MaxLength(100) @emptyToNull() decisionNumber?: string | null;
  @IsDateString({}, { message: 'Ngày quyết định không hợp lệ' }) decisionDate!: string;
  @IsOptional() @IsInt({ message: 'Số tiền phải là số nguyên' }) @Min(0) amount?: number | null;
  @IsOptional() @IsString() @emptyToNull() reason?: string | null;
}
export class UpdateRewardDto extends PartialType(CreateRewardDto) {}
