'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, GripVertical, Network } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CodeTag } from '@/components/code-tag';
import { SearchInput } from '@/components/data-table/search-input';
import { EmptyState } from '@/components/empty-state';
import { Forbidden } from '@/components/forbidden';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api, fileUrl } from '@/lib/api';
import type { OrgNode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';

const ROOT = '__root__';
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

interface Tree {
  byId: Map<string, OrgNode>;
  children: Map<string, OrgNode[]>;
  /** Số người dưới quyền (mọi cấp) */
  total: Map<string, number>;
}

function buildTree(list: OrgNode[]): Tree {
  const byId = new Map(list.map((e) => [e.id, e]));
  const children = new Map<string, OrgNode[]>();
  for (const e of list) {
    // Quản lý đã nghỉ việc (không có trong danh sách) thì đưa lên cấp cao nhất
    const p = e.managerId && byId.has(e.managerId) ? e.managerId : ROOT;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(e);
  }
  const total = new Map<string, number>();
  const count = (id: string): number => {
    const n = (children.get(id) ?? []).reduce((s, c) => s + 1 + count(c.id), 0);
    total.set(id, n);
    return n;
  };
  for (const r of children.get(ROOT) ?? []) count(r.id);
  // Người có nhiều cấp dưới lên trước, cùng số thì theo tên
  for (const arr of children.values())
    arr.sort((a, b) => (total.get(b.id) ?? 0) - (total.get(a.id) ?? 0) || a.fullName.localeCompare(b.fullName, 'vi'));
  return { byId, children, total };
}

/** id và mọi cấp dưới, để không cho kéo một người vào cấp dưới của chính họ */
function descendants(tree: Tree, id: string) {
  const out = new Set<string>([id]);
  const walk = (x: string) => (tree.children.get(x) ?? []).forEach((c) => (out.add(c.id), walk(c.id)));
  walk(id);
  return out;
}

export default function OrgChartPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const canEdit = can('employees.update');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['employees', 'org-chart'],
    queryFn: () => api<OrgNode[]>('/employees/org-chart'),
    enabled: can('employees.view'),
  });
  const tree = useMemo(() => buildTree(data), [data]);
  const blocked = useMemo(() => (dragId ? descendants(tree, dragId) : new Set<string>()), [tree, dragId]);

  // Khi tìm kiếm: giữ người khớp và các cấp trên của họ, mở hết nhánh
  const visible = useMemo(() => {
    const k = fold(search.trim());
    if (!k) return null;
    const keep = new Set<string>();
    for (const e of data) {
      if (!fold(`${e.fullName} ${e.code} ${e.email} ${e.position?.name ?? ''} ${e.department?.name ?? ''}`).includes(k)) continue;
      let cur: OrgNode | undefined = e;
      while (cur && !keep.has(cur.id)) {
        keep.add(cur.id);
        cur = cur.managerId ? tree.byId.get(cur.managerId) : undefined;
      }
    }
    return keep;
  }, [search, data, tree]);
  const matches = useMemo(() => {
    const k = fold(search.trim());
    return k ? new Set(data.filter((e) => fold(`${e.fullName} ${e.code} ${e.email}`).includes(k)).map((e) => e.id)) : new Set<string>();
  }, [search, data]);

  const move = useMutation({
    mutationFn: ({ id, managerId }: { id: string; managerId: string | null }) =>
      api(`/employees/${id}`, { method: 'PATCH', body: { managerId } }),
    onSuccess: (_d, v) => {
      const who = tree.byId.get(v.id)?.fullName;
      toast.success(v.managerId ? `${who} giờ báo cáo cho ${tree.byId.get(v.managerId)?.fullName}` : `${who} không còn quản lý trực tiếp`);
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const drop = async (targetId: string | null) => {
    const id = dragId;
    setDragId(null);
    setOverId(null);
    if (!id) return;
    const e = tree.byId.get(id)!;
    if ((e.managerId ?? null) === targetId || (targetId && blocked.has(targetId))) return;
    const target = targetId ? tree.byId.get(targetId) : null;
    const ok = await confirm({
      title: target ? `Chuyển ${e.fullName} sang báo cáo cho ${target.fullName}?` : `Bỏ quản lý trực tiếp của ${e.fullName}?`,
      description: (tree.total.get(id) ?? 0) > 0 ? `${tree.total.get(id)} người dưới quyền của ${e.fullName} chuyển theo` : undefined,
    });
    if (ok) move.mutate({ id, managerId: targetId });
  };

  if (!can('employees.view')) return <Forbidden />;

  const roots = (tree.children.get(ROOT) ?? []).filter((e) => !visible || visible.has(e.id));
  const withReports = [...tree.children.keys()].filter((k) => k !== ROOT);
  const allOpen = collapsed.size === 0;

  const renderNode = (e: OrgNode, depth: number): React.ReactNode => {
    const kids = (tree.children.get(e.id) ?? []).filter((c) => !visible || visible.has(c.id));
    const open = !!visible || !collapsed.has(e.id);
    const isBlocked = !!dragId && blocked.has(e.id);
    const isOver = overId === e.id && !isBlocked;
    return (
      <li key={e.id}>
        <div
          draggable={canEdit}
          onDragStart={(ev) => {
            ev.dataTransfer.effectAllowed = 'move';
            ev.dataTransfer.setData('text/plain', e.id);
            setDragId(e.id);
          }}
          onDragEnd={() => (setDragId(null), setOverId(null))}
          onDragOver={(ev) => {
            if (!dragId || isBlocked) return;
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            if (overId !== e.id) setOverId(e.id);
          }}
          onDragLeave={() => overId === e.id && setOverId(null)}
          onDrop={(ev) => (ev.preventDefault(), drop(e.id))}
          className={cn(
            'group flex h-12 items-center gap-2 rounded-lg pr-3 transition-colors',
            isOver ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted/60',
            dragId === e.id && 'opacity-50',
            isBlocked && dragId !== e.id && 'opacity-40',
          )}
          style={{ paddingLeft: depth * 24 + 4 }}
        >
          {canEdit && <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground/0 group-hover:text-muted-foreground/60" />}
          <button
            type="button"
            aria-label={open ? 'Thu gọn' : 'Mở rộng'}
            disabled={kids.length === 0}
            onClick={() => setCollapsed((s) => {
              const n = new Set(s);
              if (n.has(e.id)) n.delete(e.id); else n.add(e.id);
              return n;
            })}
            className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted disabled:invisible"
          >
            <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
          </button>
          <Avatar name={e.fullName} src={fileUrl(e.avatarUrl)} className="size-8" />
          <div className="min-w-0 flex-1">
            <Link href={`/employees/${e.id}`} className={cn('truncate text-sm font-medium hover:underline', matches.has(e.id) && 'text-primary')}>
              {e.fullName}
            </Link>
            <div className="truncate text-xs text-muted-foreground">
              {[e.position?.name, e.department?.name].filter(Boolean).join(' · ') || 'Chưa có chức vụ'}
            </div>
          </div>
          {(tree.total.get(e.id) ?? 0) > 0 && (
            <span className="text-xs text-muted-foreground" title="Số người dưới quyền, mọi cấp">
              <span className="font-mono tabular-nums">{tree.total.get(e.id)}</span> người
            </span>
          )}
          <CodeTag className="hidden sm:inline-flex">{e.code}</CodeTag>
        </div>
        {open && kids.length > 0 && (
          <ul
            className="relative before:absolute before:top-0 before:bottom-2 before:left-(--l) before:w-px before:bg-border"
            style={{ ['--l' as string]: `${depth * 24 + 16 + (canEdit ? 24 : 0)}px` }}
          >
            {kids.map((c) => renderNode(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Sơ đồ tổ chức"
        description={canEdit ? 'Ai báo cáo cho ai. Kéo một người thả vào người khác để đổi quản lý trực tiếp' : 'Ai báo cáo cho ai, theo quản lý trực tiếp trong hồ sơ'}
        breadcrumbs={[{ label: 'Nhân sự' }, { label: 'Sơ đồ tổ chức' }]}
      />
      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, mã, chức vụ, phòng ban…" />
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={!!visible}
            onClick={() => setCollapsed(allOpen ? new Set(withReports) : new Set())}
          >
            {allOpen ? <><ChevronsDownUp /> Thu gọn tất cả</> : <><ChevronsUpDown /> Mở tất cả</>}
          </Button>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" style={{ marginLeft: (i % 3) * 24 }} />)}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={Network} title="Chưa có nhân viên" />
        ) : roots.length === 0 ? (
          <EmptyState icon={Network} title="Không tìm thấy ai phù hợp" />
        ) : (
          <>
            {dragId && tree.byId.get(dragId)?.managerId && (
              <div
                onDragOver={(ev) => (ev.preventDefault(), setOverId(ROOT))}
                onDragLeave={() => setOverId(null)}
                onDrop={(ev) => (ev.preventDefault(), drop(null))}
                className={cn(
                  'mb-2 flex h-10 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground',
                  overId === ROOT && 'border-primary/50 bg-primary/10 text-foreground',
                )}
              >
                Thả vào đây để bỏ quản lý trực tiếp
              </div>
            )}
            <ul>{roots.map((r) => renderNode(r, 0))}</ul>
          </>
        )}
      </Card>
    </>
  );
}
