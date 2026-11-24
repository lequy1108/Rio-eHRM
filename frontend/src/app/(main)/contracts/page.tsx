'use client';

import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { FileSignature, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CodeTag } from '@/components/code-tag';
import { ContractFormDialog } from '@/components/contracts/contract-form-dialog';
import { ContractStateBadge, fmtMoney } from '@/components/contracts/parts';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Select } from '@/components/ui/select';
import { useUrlState } from '@/hooks/use-url-state';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useContractTypes, useDepartmentOptions } from '@/lib/queries';
import type { Contract, Paginated } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const TILES = [
  { state: 'active', label: 'Đang hiệu lực', key: 'active' },
  { state: 'expiring', label: 'Sắp hết hạn', key: 'expiring', hint: '30 ngày tới, chưa gia hạn' },
  { state: 'expired', label: 'Hết hạn chưa gia hạn', key: 'expiredNotRenewed' },
  { state: 'upcoming', label: 'Chưa bắt đầu', key: 'upcoming' },
] as const;

const STATE_OPTIONS = [
  { value: 'active', label: 'Đang hiệu lực' },
  { value: 'expiring', label: 'Sắp hết hạn' },
  { value: 'expired', label: 'Đã hết hạn' },
  { value: 'upcoming', label: 'Chưa bắt đầu' },
  { value: 'terminated', label: 'Đã chấm dứt' },
];

export default function ContractsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const canManage = can('contracts.manage');
  const [q, setQ, { activeFilters, reset }] = useUrlState({ state: '', typeId: '', departmentId: '' }, { sortBy: 'startDate', order: 'DESC' });
  const [open, setOpen] = useState(false);
  const { data: types = [] } = useContractTypes(false);
  const { data: departments = [] } = useDepartmentOptions();

  const { data, isFetching } = useQuery({
    queryKey: ['contracts', 'list', q],
    queryFn: () => api<Paginated<Contract>>('/contracts', { query: { ...q } }),
    placeholderData: (p) => p,
  });
  const { data: stats } = useQuery({ queryKey: ['contracts', 'stats'], queryFn: () => api<Record<string, number>>('/contracts/stats') });

  const columns = useMemo<ColumnDef<Contract>[]>(
    () => [
      {
        id: 'contractNumber',
        header: 'Số hợp đồng',
        meta: { title: 'Số hợp đồng', sortKey: 'contractNumber', alwaysVisible: true },
        cell: ({ row }) => <CodeTag>{row.original.contractNumber}</CodeTag>,
      },
      {
        id: 'employee',
        header: 'Nhân viên',
        meta: { title: 'Nhân viên' },
        cell: ({ row }) => {
          const e = row.original.employee;
          return e ? (
            <div className="min-w-0">
              <div className="truncate font-medium">{e.fullName}</div>
              <div className="truncate text-xs text-muted-foreground">{[e.code, e.department?.name].filter(Boolean).join(' · ')}</div>
            </div>
          ) : null;
        },
      },
      {
        id: 'type',
        header: 'Loại',
        meta: { title: 'Loại' },
        cell: ({ row }) => row.original.type?.name ?? '—',
      },
      {
        id: 'startDate',
        header: 'Thời hạn',
        meta: { title: 'Thời hạn', sortKey: 'startDate' },
        cell: ({ row }) => (
          <span className="font-mono text-xs whitespace-nowrap tabular-nums">
            {formatDate(row.original.startDate)} → {row.original.endDate ? formatDate(row.original.endDate) : 'không thời hạn'}
          </span>
        ),
      },
      {
        id: 'baseSalary',
        header: 'Lương cơ bản',
        meta: { title: 'Lương cơ bản', sortKey: 'baseSalary', className: 'text-right' },
        cell: ({ row }) => <span className="font-mono tabular-nums">{fmtMoney(row.original.baseSalary)}</span>,
      },
      {
        id: 'state',
        header: 'Trạng thái',
        meta: { title: 'Trạng thái' },
        cell: ({ row }) => <ContractStateBadge contract={row.original} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Hợp đồng lao động"
        breadcrumbs={[{ label: 'Hợp đồng' }]}
        actions={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> Tạo hợp đồng
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((t) => {
          const active = q.state === t.state;
          return (
            <button key={t.key} onClick={() => setQ({ state: active ? '' : t.state })} className="text-left">
              <Card className={cn('h-full transition-colors hover:border-foreground/20', active && 'border-foreground/30 bg-muted/40')}>
                <CardContent className="space-y-1 p-5">
                  <div className="text-sm text-muted-foreground">{t.label}</div>
                  <div className="text-[28px] leading-tight font-medium tabular-nums">{stats ? stats[t.key] : '–'}</div>
                  {'hint' in t && <div className="text-xs text-muted-foreground">{t.hint}</div>}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <DataTable
        id="contracts"
        columns={columns}
        data={data}
        loading={isFetching}
        sortBy={q.sortBy}
        order={q.order}
        onSortChange={(sortBy, order) => setQ({ sortBy, order })}
        onPageChange={(page) => setQ({ page })}
        onLimitChange={(limit) => setQ({ limit })}
        onRowClick={(c) => router.push(`/contracts/${c.id}`)}
        toolbar={
          <>
            <SearchInput value={q.search} onChange={(search) => setQ({ search })} placeholder="Số hợp đồng, tên, mã NV…" />
            <Select
              className="h-8 w-full sm:w-40"
              value={q.state}
              onChange={(state) => setQ({ state })}
              options={STATE_OPTIONS}
              placeholder="Trạng thái"
              clearable
              clearLabel="Mọi trạng thái"
            />
            <Select
              className="h-8 w-full sm:w-48"
              value={q.typeId}
              onChange={(typeId) => setQ({ typeId })}
              options={types.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Loại hợp đồng"
              clearable
              clearLabel="Mọi loại"
            />
            <Combobox
              className="h-8 w-full sm:w-44"
              value={q.departmentId}
              onChange={(departmentId) => setQ({ departmentId })}
              options={departments}
              placeholder="Phòng ban"
              searchPlaceholder="Tìm phòng ban…"
            />
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Xoá lọc
              </Button>
            )}
          </>
        }
        empty={
          <EmptyState
            icon={FileSignature}
            title={activeFilters || q.search ? 'Không có hợp đồng phù hợp' : 'Chưa có hợp đồng nào'}
            description={canManage && !activeFilters ? 'Tạo hợp đồng ở đây hoặc trong tab Hợp đồng của hồ sơ nhân viên' : undefined}
            action={
              activeFilters ? undefined : canManage ? (
                <Button size="sm" onClick={() => setOpen(true)}>
                  <Plus /> Tạo hợp đồng
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link href="/employees">Xem nhân viên</Link>
                </Button>
              )
            }
          />
        }
      />

      <ContractFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
