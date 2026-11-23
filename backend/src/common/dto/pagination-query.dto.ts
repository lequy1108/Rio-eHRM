import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /** Từ khoá tìm kiếm */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResult<T> {
  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

/** Chỉ cho sắp xếp theo các cột trong danh sách, tránh lỗi SQL khi client gửi tên cột lạ */
export function safeSort(query: PaginationQueryDto, allowed: string[], fallback = 'createdAt') {
  return allowed.includes(query.sortBy ?? '') ? query.sortBy! : fallback;
}
