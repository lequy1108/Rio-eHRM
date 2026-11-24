'use client';

import { useQuery } from '@tanstack/react-query';
import { FileSignature, Plus, Printer } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CodeTag } from '@/components/code-tag';
import { ContractFormDialog } from '@/components/contracts/contract-form-dialog';
import { ContractStateBadge, fmtMoney } from '@/components/contracts/parts';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Contract, Employee, Paginated } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Các hợp đồng của một nhân viên, mới nhất trước */
export function ContractsTab({ employee, canManage }: { employee: Employee; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'list', { employeeId: employee.id }],
    queryFn: () =>
      api<Paginated<Contract>>('/contracts', { query: { employeeId: employee.id, limit: 100, sortBy: 'startDate', order: 'DESC' } }),
  });
  const list = data?.items ?? [];
  const current = list.find((c) => c.state === 'active' || c.state === 'expiring');

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Hợp đồng lao động</CardTitle>
          <CardDescription>
            {current ? (
              <>
                Đang áp dụng <span className="font-mono">{current.contractNumber}</span>
                {current.endDate ? <> đến {formatDate(current.endDate)}</> : ', không xác định thời hạn'}
              </>
            ) : list.length ? (
              'Không có hợp đồng đang hiệu lực'
            ) : undefined}
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus /> Tạo hợp đồng
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn(list.length > 0 && 'px-0 pb-2')}>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : !list.length ? (
          <EmptyState icon={FileSignature} title="Chưa có hợp đồng" className="py-8" />
        ) : (
          <ul className="divide-y">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-6 py-3">
                <Link href={`/contracts/${c.id}`} className="group min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CodeTag>{c.contractNumber}</CodeTag>
                    <span className="text-sm font-medium group-hover:underline">{c.type?.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">
                      {formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : 'không thời hạn'}
                    </span>
                    <span>
                      Lương <span className="font-mono tabular-nums">{fmtMoney(c.baseSalary)} đ</span>
                    </span>
                    {c.jobTitle && <span>{c.jobTitle}</span>}
                  </div>
                </Link>
                <ContractStateBadge contract={c} />
                <Button asChild variant="ghost" size="icon-sm" aria-label="In hợp đồng">
                  <Link href={`/print/contracts/${c.id}`} target="_blank">
                    <Printer />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ContractFormDialog open={open} onOpenChange={setOpen} employee={employee} />
    </Card>
  );
}
