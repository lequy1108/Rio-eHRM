'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { formatDate } from './format';
import type { CustomField } from './types';

/** Định nghĩa trường tuỳ chỉnh của hồ sơ nhân viên (mặc định chỉ trường đang dùng) */
export function useCustomFields(activeOnly = true) {
  return useQuery({
    queryKey: ['custom-fields', activeOnly],
    queryFn: () => api<CustomField[]>('/custom-fields', { query: { activeOnly } }),
    staleTime: 5 * 60_000,
  });
}

export const isEmptyValue = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** Giá trị dạng chữ để hiển thị */
export function formatCustomValue(f: CustomField, v: unknown): string | null {
  if (isEmptyValue(v)) return null;
  switch (f.type) {
    case 'DATE':
      return formatDate(String(v));
    case 'BOOLEAN':
      return v ? 'Có' : 'Không';
    case 'NUMBER':
      return new Intl.NumberFormat('vi-VN').format(Number(v));
    case 'MULTISELECT':
      return (v as string[]).join(', ');
    default:
      return String(v);
  }
}

/** Gom trường theo nhóm (section), giữ thứ tự */
export function groupBySection(fields: CustomField[]) {
  const groups: { section: string; fields: CustomField[] }[] = [];
  for (const f of fields) {
    const g = groups.find((x) => x.section === f.section);
    if (g) g.fields.push(f);
    else groups.push({ section: f.section, fields: [f] });
  }
  return groups;
}
