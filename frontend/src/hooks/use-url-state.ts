'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface TableQuery {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  order: 'ASC' | 'DESC';
  [filter: string]: string | number;
}

/**
 * Lưu trạng thái bảng (trang, tìm kiếm, sắp xếp, bộ lọc) trên URL.
 * F5 hoặc gửi link cho người khác vẫn giữ nguyên bộ lọc.
 *   const [q, setQ] = useUrlState({ status: '' });
 *   setQ({ status: 'ACTIVE' })   // tự về trang 1
 */
export function useUrlState<F extends Record<string, string>>(filters: F, defaults?: Partial<TableQuery>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const state = useMemo(() => {
    const get = (k: string, d: string) => params.get(k) ?? d;
    const base = {
      page: Number(get('page', String(defaults?.page ?? 1))) || 1,
      limit: Number(get('limit', String(defaults?.limit ?? 10))) || 10,
      search: get('search', ''),
      sortBy: get('sortBy', defaults?.sortBy ?? ''),
      order: (get('order', defaults?.order ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC',
    };
    const f = Object.fromEntries(Object.entries(filters).map(([k, d]) => [k, get(k, d)])) as F;
    return { ...base, ...f };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setState = useCallback(
    (patch: Partial<TableQuery & F>) => {
      const next = new URLSearchParams(params.toString());
      // Đổi bất kỳ thứ gì ngoài trang thì quay về trang 1
      if (!('page' in patch)) next.delete('page');
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '' || (k === 'page' && v === 1)) next.delete(k);
        else next.set(k, String(v));
      });
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  /** Số bộ lọc đang bật (không tính tìm kiếm/phân trang) */
  const activeFilters = Object.keys(filters).filter((k) => !!params.get(k)).length;

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  return [state as typeof state, setState, { activeFilters, reset }] as const;
}
