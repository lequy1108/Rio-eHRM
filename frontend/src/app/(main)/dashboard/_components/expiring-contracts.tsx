'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Contract, Paginated } from '@/lib/types';

/** Hợp đồng sắp hết hạn (30 ngày) chưa gia hạn */
export function ExpiringContracts() {
  const { data, isLoading } = useQuery({
    queryKey: ['contracts', 'list', { state: 'expiring', dashboard: true }],
    queryFn: () => api<Paginated<Contract>>('/contracts', { query: { state: 'expiring', limit: 5, sortBy: 'endDate', order: 'ASC' } }),
  });
  const total = data?.meta.total ?? 0;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Hợp đồng sắp hết hạn</CardTitle>
        {total > 0 && (
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/contracts?state=expiring">Xem {total}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="divide-y">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : !total ? (
          <p className="text-sm text-muted-foreground">Không có hợp đồng nào hết hạn trong 30 ngày tới</p>
        ) : (
          data!.items.map((c) => (
            <Link
              key={c.id}
              href={`/contracts/${c.id}`}
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.employee?.fullName}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{c.contractNumber}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs tabular-nums">{formatDate(c.endDate)}</div>
                <div className="text-xs text-muted-foreground">{c.daysLeft === 0 ? 'Hôm nay' : `còn ${c.daysLeft} ngày`}</div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
