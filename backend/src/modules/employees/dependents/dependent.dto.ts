import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { DependentRelation } from '../../../common/enums';

export class CreateDependentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  @IsEnum(DependentRelation)
  relationship!: DependentRelation;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @Matches(/^(\d{12}|\d{10}(-?\d{3})?)$/, { message: 'Số định danh gồm 12 chữ số (hoặc MST cũ 10, 13 số)' })
  identityNumber?: string;

  @IsDateString()
  deductionFrom!: string;

  @IsOptional()
  @IsDateString()
  deductionTo?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateDependentDto extends PartialType(CreateDependentDto) {}
