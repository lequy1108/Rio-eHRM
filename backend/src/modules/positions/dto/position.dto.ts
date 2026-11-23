import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreatePositionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  level?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePositionDto extends PartialType(CreatePositionDto) {}

export class QueryPositionDto extends PaginationQueryDto {}
