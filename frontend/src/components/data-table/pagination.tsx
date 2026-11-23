'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { Paginated } from '@/lib/types';

export function DataTablePagination({
  meta,
  onPageChange,
  onLimitChange,
}: {
  meta: Paginated<unknown>['meta'];
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  const last = Math.max(meta.totalPages, 1);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {from}–{to} trên tổng <b className="text-foreground">{meta.total}</b>
      </span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Số dòng</span>
          <Select
            className="h-8 w-[72px]"
            value={String(meta.limit)}
            onChange={(v) => onLimitChange(Number(v))}
            options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
          />
        </div>
        <span className="whitespace-nowrap">
          Trang {meta.page}/{last}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft />
            <span className="sr-only">Trang đầu</span>
          </Button>
          <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
            <ChevronLeft />
            <span className="sr-only">Trang trước</span>
          </Button>
          <Button variant="outline" size="icon-sm" disabled={meta.page >= last} onClick={() => onPageChange(meta.page + 1)}>
            <ChevronRight />
            <span className="sr-only">Trang sau</span>
          </Button>
          <Button variant="outline" size="icon-sm" disabled={meta.page >= last} onClick={() => onPageChange(last)}>
            <ChevronsRight />
            <span className="sr-only">Trang cuối</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
