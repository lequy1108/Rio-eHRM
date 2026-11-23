import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ALL_PERMISSIONS } from '../../common/permissions';

export class CreateRoleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9_]{2,50}$/, { message: 'Mã vai trò gồm 2–50 chữ in hoa không dấu, số hoặc _' })
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true, message: 'Có quyền không hợp lệ' })
  permissions!: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
