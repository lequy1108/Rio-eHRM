'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CodeTag } from '@/components/code-tag';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { AppRole, PermissionGroup } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';

type Draft = { id?: string; code: string; name: string; description: string; permissions: string[] };
const EMPTY: Draft = { code: '', name: '', description: '', permissions: [] };

export default function RolesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { refreshUser } = useAuth();
  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => api<AppRole[]>('/roles') });
  const { data: groups = [] } = useQuery({
    queryKey: ['roles', 'permissions'],
    queryFn: () => api<PermissionGroup[]>('/roles/permissions'),
    staleTime: Infinity,
  });
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const selected = selectedId === 'new' ? null : roles.find((r) => r.id === selectedId) ?? null;
  const isAdmin = selected?.code === 'ADMIN';

  useEffect(() => {
    if (selectedId === null && roles.length) setSelectedId(roles.find((r) => r.code === 'HR')?.id ?? roles[0].id);
  }, [roles, selectedId]);

  useEffect(() => {
    setError(null);
    if (selectedId === 'new') setDraft(EMPTY);
    else if (selected)
      setDraft({
        id: selected.id,
        code: selected.code,
        name: selected.name,
        description: selected.description ?? '',
        permissions: selected.permissions,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.updatedAt]);

  const dirty = useMemo(() => {
    if (selectedId === 'new') return !!(draft.code || draft.name || draft.permissions.length);
    if (!selected) return false;
    return (
      draft.name !== selected.name ||
      draft.description !== (selected.description ?? '') ||
      draft.code !== selected.code ||
      [...draft.permissions].sort().join() !== [...selected.permissions].sort().join()
    );
  }, [draft, selected, selectedId]);

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (d: Draft) => {
      const body = { code: d.code, name: d.name.trim(), description: d.description.trim() || undefined, permissions: d.permissions };
      return d.id ? api<AppRole>(`/roles/${d.id}`, { method: 'PATCH', body }) : api<AppRole>('/roles', { method: 'POST', body });
    },
    onSuccess: (r) => {
      toast.success(draft.id ? `Đã lưu vai trò ${r.name}` : `Đã tạo vai trò ${r.name}`);
      qc.invalidateQueries({ queryKey: ['roles'] });
      setSelectedId(r.id);
      refreshUser().catch(() => undefined);
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá vai trò');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setSelectedId(null);
    },
  });

  const toggle = (keys: string[], on: boolean) =>
    setDraft((d) => ({
      ...d,
      permissions: on ? [...new Set([...d.permissions, ...keys])] : d.permissions.filter((p) => !keys.includes(p)),
    }));

  const submit = () => {
    if (!draft.name.trim()) return setError('Vui lòng nhập tên vai trò');
    if (!/^[A-Z0-9_]{2,50}$/.test(draft.code)) return setError('Mã vai trò gồm 2–50 chữ in hoa không dấu, số hoặc _');
    save.mutate(draft);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      <Card className="self-start">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Vai trò</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setSelectedId('new')}>
            <Plus /> Thêm
          </Button>
        </CardHeader>
        <CardContent className="grid gap-1 px-2 pb-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            : roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                    r.id === selectedId ? 'bg-card' : 'border-transparent hover:bg-muted',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      <span className="font-mono tabular-nums">{r.userCount ?? 0}</span> tài khoản
                    </span>
                  </span>
                  {r.isSystem && <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Vai trò hệ thống" />}
                </button>
              ))}
          {selectedId === 'new' && (
            <div className="rounded-lg border bg-card px-3 py-2 text-sm font-medium">{draft.name || 'Vai trò mới'}</div>
          )}
        </CardContent>
      </Card>

      {(selected || selectedId === 'new') && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>{selectedId === 'new' ? 'Vai trò mới' : selected!.name}</CardTitle>
              {selected && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CodeTag>{selected.code}</CodeTag>
                  {selected.isSystem && 'Vai trò hệ thống, không xoá được'}
                </p>
              )}
            </div>
            {selected && !selected.isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={async () => {
                  if (await confirm({ title: `Xoá vai trò ${selected.name}?`, destructive: true })) remove.mutate(selected.id);
                }}
              >
                <Trash2 /> Xoá
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-6">
            {isAdmin ? (
              <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Quản trị luôn có toàn quyền và không chỉnh được, để hệ thống không bao giờ mất người quản lý
              </p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <FormField label="Tên vai trò" htmlFor="role-name" required>
                    <Input id="role-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </FormField>
                  <FormField label="Mã" htmlFor="role-code" required hint={selected?.isSystem ? 'Không đổi được' : 'Vd KE_TOAN'}>
                    <Input
                      id="role-code"
                      className="font-mono uppercase"
                      disabled={selected?.isSystem}
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    />
                  </FormField>
                  <FormField label="Mô tả" htmlFor="role-desc" className="sm:col-span-2">
                    <Input id="role-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                  </FormField>
                </div>

                <div className="grid gap-4">
                  {groups.map((g) => {
                    const keys = g.items.map((i) => i.key);
                    const on = keys.filter((k) => draft.permissions.includes(k)).length;
                    return (
                      <section key={g.key} className="rounded-lg border">
                        <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
                          <Checkbox
                            checked={on === keys.length ? true : on ? 'indeterminate' : false}
                            onCheckedChange={(c) => toggle(keys, c === true)}
                          />
                          <span className="text-sm font-medium">{g.label}</span>
                          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
                            {on}/{keys.length}
                          </span>
                        </label>
                        <div className="grid gap-x-6 gap-y-2.5 p-4 sm:grid-cols-2">
                          {g.items.map((i) => (
                            <label key={i.key} className="flex cursor-pointer items-start gap-3 text-sm">
                              <Checkbox
                                className="mt-0.5"
                                checked={draft.permissions.includes(i.key)}
                                onCheckedChange={(c) => toggle([i.key], c === true)}
                              />
                              {i.label}
                            </label>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </>
            )}
          </CardContent>
          {!isAdmin && (
            <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
              {dirty && <span className="mr-auto text-xs text-muted-foreground">Có thay đổi chưa lưu</span>}
              <Button
                variant="ghost"
                disabled={!dirty || save.isPending}
                onClick={() => (selectedId === 'new' ? setSelectedId(null) : setDraft({ ...draft, ...(selected && { name: selected.name, code: selected.code, description: selected.description ?? '', permissions: selected.permissions }) }))}
              >
                {selectedId === 'new' ? 'Huỷ' : 'Hoàn tác'}
              </Button>
              <Button disabled={!dirty} loading={save.isPending} onClick={submit}>
                {selectedId === 'new' ? 'Tạo vai trò' : 'Lưu thay đổi'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
