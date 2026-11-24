'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { FIELD_LABEL, type AuditLog, type Paginated } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE = 30;
// Hiển thị các trường theo đúng thứ tự trên hồ sơ, không theo thứ tự lưu trong DB
const ORDER = Object.keys(FIELD_LABEL);
const rank = (f: string) => (ORDER.indexOf(f) + 1 || 999);

const ENTITY_LABEL: Record<string, string> = {
  Employee: 'hồ sơ',
  EmployeeDependent: 'người phụ thuộc',
  EmployeeQualification: 'bằng cấp, chứng chỉ',
  EmployeeExperience: 'kinh nghiệm',
  EmployeeSkill: 'kỹ năng',
  EmployeeReward: 'khen thưởng, kỷ luật',
  EmployeeDocument: 'tài liệu',
  EmployeeWorkHistory: 'quyết định công tác',
};

function verb(a: AuditLog) {
  const what = ENTITY_LABEL[a.entityType] ?? a.entityType;
  if (a.action === 'CREATE') return a.entityType === 'Employee' ? 'Tạo hồ sơ' : `Thêm ${what}`;
  if (a.action === 'DELETE') return a.entityType === 'Employee' ? 'Xoá hồ sơ' : `Xoá ${what}`;
  return a.entityType === 'Employee' ? 'Cập nhật hồ sơ' : `Cập nhật ${what}`;
}

function Value({ v }: { v: unknown }) {
  if (v === null || v === undefined || v === '') return <span className="text-muted-foreground">trống</span>;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return <span className="font-mono tabular-nums">{formatDate(s)}</span>;
  if (/^[\d\s.-]+$/.test(s)) return <span className="font-mono tabular-nums">{s}</span>;
  return <span>{s}</span>;
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA');
const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function HistoryTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['employees', 'detail', employeeId, 'history'],
    queryFn: ({ pageParam }) =>
      api<Paginated<AuditLog>>(`/employees/${employeeId}/history`, { query: { page: pageParam, limit: PAGE } }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];
  const groups: { day: string; items: AuditLog[] }[] = [];
  for (const a of items) {
    const k = dayKey(a.createdAt);
    if (groups.at(-1)?.day === k) groups.at(-1)!.items.push(a);
    else groups.push({ day: k, items: [a] });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử thay đổi</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={History} title="Chưa có thay đổi nào" className="py-8" />
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.day}>
                <h4 className="mb-3 font-mono text-xs text-muted-foreground tabular-nums">{formatDate(g.day)}</h4>
                <ol className="relative space-y-4 border-l pl-5">
                  {g.items.map((a) => {
                    const changes = Object.entries(a.changes ?? {}).sort(([x], [y]) => rank(x) - rank(y));
                    const showValues = a.action === 'UPDATE';
                    return (
                      <li key={a.id} className="relative">
                        <span
                          className={cn(
                            'absolute top-1.5 -left-[24.5px] size-2 rounded-full ring-4 ring-card',
                            a.action === 'DELETE' ? 'bg-destructive' : a.action === 'CREATE' ? 'bg-primary' : 'bg-muted-foreground/50',
                          )}
                        />
                        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <span className="font-medium">{verb(a)}</span>
                          {a.entityType !== 'Employee' && a.label && <span>{a.label}</span>}
                          <span className="text-xs text-muted-foreground">
                            <span className="font-mono tabular-nums">{time(a.createdAt)}</span>
                            {a.userEmail && ` · ${a.userEmail}`}
                          </span>
                        </div>
                        {showValues && changes.length > 0 && (
                          <dl className="mt-2 grid gap-1 text-sm">
                            {changes.map(([field, c]) => (
                              <div key={field} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3">
                                <dt className="truncate text-muted-foreground">{FIELD_LABEL[field] ?? field}</dt>
                                <dd className="min-w-0 break-words">
                                  <Value v={c.from} />
                                  <span className="mx-1.5 text-muted-foreground">→</span>
                                  <Value v={c.to} />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {a.action === 'CREATE' && changes.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {changes.length} trường: {changes.slice(0, 4).map(([f]) => (FIELD_LABEL[f] ?? f).toLowerCase()).join(', ')}
                            {changes.length > 4 && '…'}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
            {hasNextPage && (
              <Button variant="outline" size="sm" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                Xem thêm
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
