'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { AppRole, CatalogItem, ContractType, CatalogType, Department, Employee, Paginated, Position } from './types';

/** Danh sách phòng ban cho ô chọn (cache 5 phút) */
export function useDepartmentOptions() {
  return useQuery({
    queryKey: ['departments', 'options'],
    queryFn: () => api<Paginated<Department>>('/departments', { query: { limit: 100, sortBy: 'name', order: 'ASC' } }),
    staleTime: 5 * 60_000,
    select: (r) => r.items.map((d) => ({ value: d.id, label: d.name, hint: d.code })),
  });
}

export function usePositionOptions() {
  return useQuery({
    queryKey: ['positions', 'options'],
    queryFn: () => api<Paginated<Position>>('/positions', { query: { limit: 100 } }),
    staleTime: 5 * 60_000,
    select: (r) => r.items.map((p) => ({ value: p.id, label: p.name, hint: p.code })),
  });
}

/** Tìm nhân viên theo tên/mã cho ô chọn có tìm kiếm */
export function useEmployeeOptions(search: string, enabled = true) {
  return useQuery({
    queryKey: ['employees', 'options', search],
    queryFn: () => api<Paginated<Employee>>('/employees', { query: { search, limit: 20, sortBy: 'fullName', order: 'ASC' } }),
    enabled,
    staleTime: 60_000,
    select: (r) => r.items.map((e) => ({ value: e.id, label: e.fullName, hint: e.code })),
  });
}

/** Danh mục dùng chung cho ô chọn (dân tộc, ngân hàng, tỉnh/thành…) */
export function useCatalogOptions(type: CatalogType) {
  return useQuery({
    queryKey: ['catalogs', type, 'options'],
    queryFn: () => api<CatalogItem[]>('/catalogs', { query: { type } }),
    staleTime: 10 * 60_000,
    select: (items) =>
      items.map((c) => ({
        value: c.id,
        label: c.shortName ? `${c.shortName} · ${c.name}` : c.name,
        hint: type === 'BANK' ? c.code : undefined,
      })),
  });
}

/** Vai trò cho ô chọn khi tạo/sửa tài khoản */
export function useRoleOptions() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api<AppRole[]>('/roles'),
    staleTime: 60_000,
    select: (roles) => roles.map((r) => ({ value: r.id, label: r.name, code: r.code })),
  });
}

/** Loại hợp đồng (đang dùng) cho ô chọn */
export function useContractTypes(activeOnly = true) {
  return useQuery({
    queryKey: ['contract-types', activeOnly],
    queryFn: () => api<ContractType[]>('/contract-types', { query: { activeOnly } }),
    staleTime: 5 * 60_000,
  });
}
