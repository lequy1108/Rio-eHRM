'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CodeTag } from '@/components/code-tag';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, fileUrl } from '@/lib/api';
import { formatDate, formatMonth } from '@/lib/format';
import { GENDER_LABEL, type EmployeeStats, type EmployeeStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { HeadcountChart, type TrendPoint } from './_components/headcount-chart';

/** Thẻ số liệu: nhãn, con số, và so sánh với mốc cụ thể */
function Stat({ label, value, note, href }: { label: string; value?: number; note?: string; href?: string }) {
  const body = (
    <Card className={cn('h-full', href && 'lift')}>
      <CardContent className="space-y-2 p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        {value === undefined ? (
          <Skeleton className="h-8 w-14" />
        ) : (
          <div className="text-[28px] leading-none font-medium tabular-nums">{value}</div>
        )}
        <div className="h-4 text-xs text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const diff = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : 'Không đổi');

export default function DashboardPage() {
  const { user, can } = useAuth();
  const isStaff = !can('employees.view');
  const month = formatMonth();

  const { data: s } = useQuery({
    queryKey: ['employees', 'stats'],
    queryFn: () => api<EmployeeStats & { headcountTrend: TrendPoint[] }>('/employees/stats'),
    enabled: !isStaff,
  });

  if (isStaff) {
    return (
      <>
        <PageHeader title={user?.employee?.fullName ?? 'Trang của tôi'} description={month} />
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-muted-foreground">Chấm công, nghỉ phép và phiếu lương của bạn sẽ hiển thị ở đây</p>
            <Button asChild variant="outline">
              <Link href="/profile">Xem hồ sơ của tôi</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const count = (st: EmployeeStatus) => s?.byStatus.find((x) => x.status === st)?.count ?? 0;
  const trend = s?.headcountTrend ?? [];
  const prev = trend.length > 1 ? trend[trend.length - 2] : undefined;
  const cur = trend[trend.length - 1];
  const prevMonth = prev ? `tháng ${Number(prev.month.slice(5))}` : '';
  const pct = (n: number) => (s?.total ? Math.round((n / s.total) * 100) : 0);
  const maxDep = Math.max(...(s?.byDepartment.map((d) => d.count) ?? [1]), 1);
  const genderTotal = s?.byGender.reduce((a, g) => a + g.count, 0) || 1;
  // Giới tính: các bậc xám, không gán màu theo giới
  const GENDER_TONE = ['bg-foreground/70', 'bg-foreground/35', 'bg-foreground/12'];

  return (
    <>
      <PageHeader title={`Nhân sự ${month.toLowerCase()}`} breadcrumbs={[{ label: 'Bảng điều khiển' }]} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Tổng nhân sự"
          value={s?.total}
          note={cur && prev ? `${diff(cur.total - prev.total)} so với ${prevMonth}` : undefined}
          href="/employees"
        />
        <Stat label="Chính thức" value={s && count('ACTIVE')} note={s && `${pct(count('ACTIVE'))}% tổng nhân sự`} href="/employees?status=ACTIVE" />
        <Stat
          label="Đang thử việc"
          value={s && count('PROBATION')}
          note={s && `${pct(count('PROBATION'))}% tổng nhân sự`}
          href="/employees?status=PROBATION"
        />
        <Stat
          label="Vào làm tháng này"
          value={s?.newThisMonth}
          note={cur && prev ? `${diff(cur.hires - prev.hires)} so với ${prevMonth}` : undefined}
          href="/employees?sortBy=hireDate&order=DESC"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Biến động nhân sự 12 tháng</CardTitle>
          </CardHeader>
          <CardContent>{s ? <HeadcountChart data={trend} /> : <Skeleton className="h-72 w-full" />}</CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Theo phòng ban</CardTitle>
              <Button asChild variant="link" size="sm" className="h-auto p-0">
                <Link href="/departments">Xem tất cả</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {!s
                ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
                : s.byDepartment.map((d, i) => (
                    <div key={d.department} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{d.department}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{d.count}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-1 rounded-full', i === 0 ? 'bg-primary' : 'bg-foreground/25')}
                          style={{ width: `${(d.count / maxDep) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Giới tính</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!s ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                    {s.byGender.map((g, i) => (
                      <div key={g.gender} className={GENDER_TONE[i] ?? GENDER_TONE[2]} style={{ width: `${(g.count / genderTotal) * 100}%` }} />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {s.byGender.map((g, i) => (
                      <div key={g.gender} className="flex items-center gap-2 text-sm">
                        <span className={cn('size-2 rounded-[2px]', GENDER_TONE[i] ?? GENDER_TONE[2])} />
                        <span className="flex-1">{g.gender === 'UNKNOWN' ? 'Chưa cập nhật' : GENDER_LABEL[g.gender]}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {g.count} · {Math.round((g.count / genderTotal) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Vào làm gần đây</CardTitle>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href="/employees?sortBy=hireDate&order=DESC">Xem tất cả</Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {!s
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="my-2 h-10 w-full" />)
              : s.recentHires.map((e) => (
                  <Link
                    key={e.id}
                    href={`/employees/${e.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <Avatar name={e.fullName} src={fileUrl(e.avatarUrl)} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{e.fullName}</span>
                        <CodeTag>{e.code}</CodeTag>
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[e.position?.name, e.department?.name].filter(Boolean).join(' · ') || e.email}
                      </div>
                    </div>
                    <span className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:block">{formatDate(e.hireDate)}</span>
                    <StatusBadge status={e.status} />
                  </Link>
                ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
