import { PartialType, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsUUID('all', { message: 'Vui lòng chọn vai trò' })
  roleId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryUserDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  password!: string;
}

export class InviteDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Chọn ít nhất một nhân viên' })
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  employeeIds!: string[];

  /** Bỏ trống = vai trò Nhân viên */
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
