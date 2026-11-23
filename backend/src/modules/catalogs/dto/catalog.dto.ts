import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { CatalogType } from '../../../common/enums';

export class CreateCatalogItemDto {
  @IsEnum(CatalogType)
  type!: CatalogType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_.-]+$/, { message: 'Mã chỉ gồm chữ không dấu, số, -, _ và .' })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCatalogItemDto extends PartialType(CreateCatalogItemDto) {}

export class QueryCatalogDto {
  @IsEnum(CatalogType)
  type!: CatalogType;

  @IsOptional()
  @IsString()
  search?: string;

  /** Mặc định chỉ trả mục đang dùng; truyền false để lấy cả mục đã ẩn */
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  activeOnly?: boolean = true;
}
