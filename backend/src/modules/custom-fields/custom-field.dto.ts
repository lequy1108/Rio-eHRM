import { PartialType, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CustomFieldType } from './custom-field.entity';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCustomFieldDto {
  @IsString()
  @MaxLength(100)
  @trim()
  label!: string;

  /** Bỏ trống để tự sinh từ tên trường */
  @IsOptional()
  @Matches(/^[a-z][a-z0-9_]{0,49}$/, { message: 'Khoá gồm chữ thường không dấu, số và _, bắt đầu bằng chữ' })
  key?: string;

  @IsEnum(CustomFieldType)
  type!: CustomFieldType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique({ message: 'Các lựa chọn không được trùng nhau' })
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : value))
  options?: string[];

  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsString() @MaxLength(255) @trim() hint?: string;
  @IsOptional() @IsString() @MaxLength(100) @trim() section?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() showInList?: boolean;
  @IsOptional() @IsBoolean() sensitive?: boolean;
}

/** Không đổi được khoá và kiểu dữ liệu sau khi tạo (dữ liệu cũ phụ thuộc vào chúng) */
export class UpdateCustomFieldDto extends PartialType(OmitType(CreateCustomFieldDto, ['key', 'type'] as const)) {}

export class ReorderCustomFieldsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
