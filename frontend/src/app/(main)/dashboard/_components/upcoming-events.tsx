'use client';

import { useQuery } from '@tanstack/react-query';
import { Cake, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/empty-state';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, fileUrl } from '@/lib/api';
import type { UpcomingEvent } from '@/lib/types';

const DAYS = 30;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const when = (n: number) => (n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : `${n} ngày nữa`);

/** Sinh nhật và kỷ niệm ngày vào làm trong 30 ngày tới */
export function UpcomingEvents() {
  const { data, isLoading } = useQuery({
    queryKey: ['employees', 'upcoming-events', DAYS],
    queryFn: () => api<UpcomingEvent[]>('/employees/upcoming-events', { query: { days: DAYS } }),
    staleTime: 10 * 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sinh nhật và kỷ niệm</CardTitle>
        <p className="text-sm text-muted-foreground">{DAYS} ngày tới</p>
      </CardHeader>
      <CardContent className="divide-y">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-10 w-full" />)
        ) : !data?.length ? (
          <EmptyState icon={Cake} title="Không có sự kiện nào" className="py-6" />
        ) : (
          data.slice(0, 8).map((ev) => {
            const birthday = ev.type === 'BIRTHDAY';
            const Icon = birthday ? Cake : PartyPopper;
            return (
              <Link
                key={`${ev.type}-${ev.employee.id}`}
                href={`/employees/${ev.employee.id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
              >
                <Avatar name={ev.employee.fullName} src={fileUrl(ev.employee.avatarUrl)} className="size-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{ev.employee.fullName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="size-3.5" />
                    {birthday ? `Sinh nhật ${ev.years} tuổi` : `Tròn ${ev.years} năm làm việc`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs tabular-nums">{dm(ev.date)}</div>
                  <div className={ev.inDays === 0 ? 'text-xs font-medium text-primary' : 'text-xs text-muted-foreground'}>{when(ev.inDays)}</div>
                </div>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
