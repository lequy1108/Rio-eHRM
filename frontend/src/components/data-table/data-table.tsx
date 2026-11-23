'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Paginated } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DataTablePagination } from './pagination';

/** Thông tin thêm cho cột: tiêu đề, có sắp xếp được không, có ẩn được không */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    title?: string;
    /** Tên trường gửi lên API khi sắp xếp */
    sortKey?: string;
    className?: string;
    /** Không cho ẩn cột này */
    alwaysVisible?: boolean;
  }
}

export interface DataTableProps<T extends { id: string }> {
  /** Khoá lưu cột đang ẩn/hiện vào trình duyệt */
  id: string;
  columns: ColumnDef<T>[];
  data?: Paginated<T>;
  loading?: boolean;
  /** Sắp xếp phía server */
  sortBy?: string;
  order?: 'ASC' | 'DESC';
  onSortChange?: (sortBy: string, order: 'ASC' | 'DESC') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  /** Bật cột chọn nhiều dòng */
  selectable?: boolean;
  /** Thanh thao tác khi đã chọn dòng */
  bulkActions?: (rows: T[], clear: () => void) => React.ReactNode;
  /** Ô tìm kiếm, bộ lọc… hiển thị trên bảng */
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  id,
  columns,
  data,
  loading,
  sortBy,
  order,
  onSortChange,
  onPageChange,
  onLimitChange,
  selectable,
  bulkActions,
  toolbar,
  onRowClick,
  empty,
}: DataTableProps<T>) {
  const [visibility, setVisibility] = useLocalStorage<VisibilityState>(`ehrm_cols_${id}`, {});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Đổi trang/bộ lọc thì bỏ chọn
  useEffect(() => setRowSelection({}), [data]);

  const selectColumn: ColumnDef<T> = {
    id: '__select',
    meta: { alwaysVisible: true, className: 'w-10' },
    header: ({ table }) => (
      <Checkbox
        aria-label="Chọn tất cả"
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label="Chọn dòng"
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  };

  const table = useReactTable({
    data: data?.items ?? [],
    columns: selectable ? [selectColumn, ...columns] : columns,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: selectable,
    state: { columnVisibility: visibility, rowSelection },
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setRowSelection,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const hideable = table.getAllLeafColumns().filter((c) => !c.columnDef.meta?.alwaysVisible && c.id !== '__select');
  const colCount = table.getVisibleLeafColumns().length;

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    if (sortBy !== key) onSortChange(key, 'ASC');
    else if (order === 'ASC') onSortChange(key, 'DESC');
    else onSortChange('', 'DESC'); // bấm lần 3: bỏ sắp xếp
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <AnimatePresence mode="popLayout" initial={false}>
        {selected.length > 0 && bulkActions ? (
          <motion.div
            key="bulk"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="flex w-full flex-wrap items-center gap-2"
          >
            <span className="text-sm font-medium">
              Đã chọn <span className="tabular-nums">{selected.length}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
              <X /> Bỏ chọn
            </Button>
            <div className="ml-auto flex flex-wrap gap-2">{bulkActions(selected, () => setRowSelection({}))}</div>
          </motion.div>
        ) : (
          <motion.div
            key="toolbar"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="flex w-full flex-wrap items-center gap-2"
          >
            <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
            {hideable.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns3 /> <span className="hidden sm:inline">Cột</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ẩn/hiện cột</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideable.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={c.getIsVisible()}
                      onCheckedChange={(v) => c.toggleVisibility(!!v)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {c.columnDef.meta?.title ?? c.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => {
                const meta = h.column.columnDef.meta;
                const sortKey = meta?.sortKey;
                const active = sortKey && sortBy === sortKey;
                return (
                  <TableHead key={h.id} className={meta?.className}>
                    {sortKey && onSortChange ? (
                      <button
                        className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted hover:text-foreground"
                        onClick={() => toggleSort(sortKey)}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {active ? (
                          order === 'ASC' ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading && !data ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                className={cn(onRowClick && 'cursor-pointer', loading && 'opacity-60')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount}>{empty ?? <EmptyState />}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {data && data.meta.total > 0 && (
        <DataTablePagination meta={data.meta} onPageChange={onPageChange} onLimitChange={onLimitChange} />
      )}
    </Card>
  );
}
