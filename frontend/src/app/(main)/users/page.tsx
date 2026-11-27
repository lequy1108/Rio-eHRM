'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { KeyRound, Lock, LockOpen, MailPlus, MoreHorizontal, Pencil, Plus, Send, Trash2, UserCog, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { EmployeePicker } from '@/components/employee-picker';
import { EmptyState } from '@/components/empty-state';
import { InviteResultsDialog, type InviteResult } from '@/components/invite-results';
import { Checkbox } from '@/components/ui/checkbox';
import { CodeTag } from '@/components/code-tag';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { PasswordInput } from '@/components/password-input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useUrlState } from '@/hooks/use-url-state';
import { api, fileUrl } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { checkPassword, passwordHint, useBranding } from '@/lib/branding';
import { useRoleOptions } from '@/lib/queries';
import type { Employee, Paginated, User } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';

const isLocked = (u: User) => !!u.lockedUntil && new Date(u.lockedUntil) > new Date();
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

const createSchema = z.object({
  email: z.string().trim().pipe(z.email('Email không hợp lệ')),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  roleId: z.string().min(1, 'Vui lòng chọn vai trò'),
  employeeId: z.string(),
});
const editSchema = createSchema.omit({ password: true });
type CreateValues = z.infer<typeof createSchema>;

function UserDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (o: boolean) => void; user: User | null }) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const { data: roles = [] } = useRoleOptions();
  const { password: policy } = useBranding();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<CreateValues>({
    resolver: zodResolver(isEdit ? (editSchema as unknown as typeof createSchema) : createSchema),
  });

  useEffect(() => {
    if (open)
      reset({
        email: user?.email ?? '',
        password: '',
        roleId: user?.roleId ?? roles.find((r) => r.code === 'EMPLOYEE')?.value ?? '',
        employeeId: user?.employeeId ?? '',
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, reset, roles.length]);

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: CreateValues) => {
      if (isEdit) {
        const { password: _p, ...rest } = v;
        return api(`/users/${user!.id}`, { method: 'PATCH', body: { ...rest, employeeId: rest.employeeId || null } });
      }
      return api('/users', { method: 'POST', body: { ...v, employeeId: v.employeeId || undefined } });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản');
      qc.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (/email/i.test(err.message)) setError('email', { message: err.message });
      else if (/^Mật khẩu/.test(err.message)) setError('password', { message: err.message });
      else if (/vai trò/i.test(err.message)) setError('roleId', { message: err.message });
      else if (/nhân viên/i.test(err.message)) setError('employeeId', { message: err.message });
      else toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa tài khoản' : 'Tạo tài khoản'}</DialogTitle>
          <DialogDescription>Gắn tài khoản với hồ sơ nhân viên để họ xem được thông tin của mình</DialogDescription>
        </DialogHeader>
        <DialogBody>
        <form id="user-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <FormField label="Email đăng nhập" htmlFor="email" required error={errors.email?.message}>
            <Input id="email" type="email" autoFocus aria-invalid={!!errors.email} {...register('email')} />
          </FormField>
          {!isEdit && (
            <FormField label="Mật khẩu" htmlFor="password" required error={errors.password?.message} hint={passwordHint(policy)}>
              <PasswordInput id="password" aria-invalid={!!errors.password} {...register('password')} />
            </FormField>
          )}
          <FormField label="Vai trò" required error={errors.roleId?.message} hint="Quyền của từng vai trò chỉnh ở Cài đặt → Vai trò và quyền">
            <Controller control={control} name="roleId" render={({ field }) => <Select value={field.value} onChange={field.onChange} options={roles} placeholder="Chọn vai trò" />} />
          </FormField>
          <FormField label="Hồ sơ nhân viên" error={errors.employeeId?.message}>
            <Controller
              control={control}
              name="employeeId"
              render={({ field }) => (
                <EmployeePicker value={field.value} onChange={field.onChange} selectedLabel={user?.employee?.fullName} placeholder="Không gắn" invalid={!!errors.employeeId} />
              )}
            />
          </FormField>
        </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="user-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const { password: policy } = useBranding();
  const qc = useQueryClient();
  useEffect(() => setPassword(''), [user]);
  const save = useMutation({
    mutationFn: () => api(`/users/${user!.id}/password`, { method: 'PATCH', body: { password } }),
    onSuccess: () => {
      toast.success(`Đã đặt lại mật khẩu cho ${user?.email}`);
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <FormField label="Mật khẩu mới" htmlFor="newpw" required hint={`${passwordHint(policy)}. Gửi mật khẩu này cho người dùng qua kênh riêng`}>
          <PasswordInput id="newpw" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button disabled={!checkPassword(password, policy)} loading={save.isPending} onClick={() => save.mutate()}>
            Đặt lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Chọn nhân viên chưa có tài khoản để tạo tài khoản và gửi email mời đặt mật khẩu */
function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (r: InviteResult[]) => void }) {
  const qc = useQueryClient();
  const { data: roles = [] } = useRoleOptions();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [roleId, setRoleId] = useState('');
  const [search, setSearch] = useState('');
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['users', 'invite-candidates'],
    queryFn: () => api<Employee[]>('/users/invite-candidates'),
    enabled: open,
  });
  useEffect(() => {
    if (open) {
      setPicked(new Set());
      setSearch('');
      setRoleId(roles.find((r) => r.code === 'EMPLOYEE')?.value ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roles.length]);
  const shown = useMemo(() => {
    const k = search.trim().toLowerCase();
    return k ? list.filter((e) => `${e.fullName} ${e.code} ${e.email}`.toLowerCase().includes(k)) : list;
  }, [list, search]);
  const all = shown.length > 0 && shown.every((e) => picked.has(e.id));
  const some = shown.some((e) => picked.has(e.id));
  const send = useMutation({
    mutationFn: () => api<InviteResult[]>('/users/invite', { method: 'POST', body: { employeeIds: [...picked], roleId: roleId || undefined } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      onDone(r);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Mời nhân viên dùng hệ thống</DialogTitle>
          <DialogDescription>Mỗi người nhận một email có link tự đặt mật khẩu, quản trị không cần biết mật khẩu của họ</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, mã, email…" />
          <Select className="h-8 w-full sm:w-44" value={roleId} onChange={setRoleId} options={roles} placeholder="Vai trò" />
        </div>
        <DialogBody className="-mx-6 px-0">
          {isLoading ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
          ) : list.length === 0 ? (
            <EmptyState icon={UserCog} title="Mọi nhân viên đã có tài khoản" description="Chỉ hiện nhân viên chưa nghỉ việc, có email và chưa có tài khoản" />
          ) : (
            <div>
              <label className="flex cursor-pointer items-center gap-3 border-b px-6 py-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={all ? true : some ? 'indeterminate' : false}
                  onCheckedChange={() => setPicked((p) => {
                    const n = new Set(p);
                    for (const e of shown) all ? n.delete(e.id) : n.add(e.id);
                    return n;
                  })}
                />
                Chọn tất cả <span className="font-mono tabular-nums">{shown.length}</span>
              </label>
              {shown.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-3 px-6 py-2 hover:bg-muted/50">
                  <Checkbox
                    checked={picked.has(e.id)}
                    onCheckedChange={(c) => setPicked((p) => {
                      const n = new Set(p);
                      if (c) n.add(e.id); else n.delete(e.id);
                      return n;
                    })}
                  />
                  <Avatar name={e.fullName} src={fileUrl(e.avatarUrl)} className="size-7" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{e.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.email}</div>
                  </div>
                  <CodeTag>{e.code}</CodeTag>
                </label>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button disabled={picked.size === 0} loading={send.isPending} onClick={() => send.mutate()}>
            <Send /> Gửi lời mời{picked.size > 0 && <span className="font-mono tabular-nums">{picked.size}</span>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const [q, setQ, { activeFilters, reset }] = useUrlState({ roleId: '', isActive: '' });
  const { data: roles = [] } = useRoleOptions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [inviting, setInviting] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['users', 'list', q],
    queryFn: () => api<Paginated<User>>('/users', { query: q }),
    placeholderData: (p) => p,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  const toggle = useMutation({
    mutationFn: (u: User) => api(`/users/${u.id}`, { method: 'PATCH', body: { isActive: !u.isActive } }),
    onSuccess: (_d, u) => {
      toast.success(u.isActive ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
      invalidate();
    },
  });
  const unlock = useMutation({
    mutationFn: (u: User) => api(`/users/${u.id}/unlock`, { method: 'PATCH' }),
    onSuccess: (_d, u) => {
      toast.success(`Đã mở khoá đăng nhập cho ${u.email}`);
      invalidate();
    },
  });
  const resend = useMutation({
    mutationFn: (u: User) => api<InviteResult>(`/users/${u.id}/resend-invite`, { method: 'POST' }),
    onSuccess: (r) => {
      if (r.status === 'sent') toast.success(`Đã gửi link đặt mật khẩu tới ${r.email}`);
      else setResults([r]);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá tài khoản');
      invalidate();
    },
  });

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: 'email',
        header: 'Tài khoản',
        meta: { title: 'Tài khoản', sortKey: 'email', alwaysVisible: true },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar name={u.employee?.fullName ?? u.email} src={fileUrl(u.employee?.avatarUrl)} className="size-8" />
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {u.employee?.fullName ?? u.email}
                  {u.id === me?.id && <span className="ml-2 text-xs font-normal text-muted-foreground">(bạn)</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
            </div>
          );
        },
      },
      { id: 'role', header: 'Vai trò', meta: { title: 'Vai trò', sortKey: 'role' }, cell: ({ row }) => {
          const r = row.original.role;
          return r ? <Badge variant={r.code === 'ADMIN' ? 'default' : 'secondary'}>{r.name}</Badge> : <span className="text-muted-foreground">Chưa có</span>;
        } },
      {
        id: 'isActive',
        header: 'Trạng thái',
        meta: { title: 'Trạng thái' },
        cell: ({ row }) =>
          !row.original.isActive ? (
            <Badge variant="secondary"><Lock className="size-3" /> Đã khoá</Badge>
          ) : row.original.mustSetPassword ? (
            <Badge variant="outline">Chưa kích hoạt</Badge>
          ) : isLocked(row.original) ? (
            <Badge variant="warning">Tạm khoá đến <span className="font-mono tabular-nums">{hhmm(row.original.lockedUntil!)}</span></Badge>
          ) : (
            <Badge variant="success">Hoạt động</Badge>
          ),
      },
      { id: 'lastLoginAt', header: 'Đăng nhập gần nhất', meta: { title: 'Đăng nhập gần nhất', sortKey: 'lastLoginAt' }, cell: ({ row }) => formatDateTime(row.original.lastLoginAt) },
      {
        id: 'actions',
        meta: { alwaysVisible: true, className: 'w-12 text-right' },
        cell: ({ row }) => {
          const u = row.original;
          const self = u.id === me?.id;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditing(u); setOpen(true); }}>
                  <Pencil /> Sửa
                </DropdownMenuItem>
                {u.isActive && (
                  <DropdownMenuItem onClick={() => resend.mutate(u)}>
                    <Send /> {u.mustSetPassword ? 'Gửi lại lời mời' : 'Gửi link đặt mật khẩu'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setResetting(u)}>
                  <KeyRound /> Đặt mật khẩu thủ công
                </DropdownMenuItem>
                {isLocked(u) && (
                  <DropdownMenuItem onClick={() => unlock.mutate(u)}>
                    <LockOpen /> Mở khoá đăng nhập
                  </DropdownMenuItem>
                )}
                {!self && (
                  <>
                    <DropdownMenuItem onClick={() => toggle.mutate(u)}>
                      {u.isActive ? <><Lock /> Khoá tài khoản</> : <><LockOpen /> Mở khoá</>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      destructive
                      onClick={async () => {
                        if (await confirm({ title: `Xoá tài khoản ${u.email}?`, description: 'Hồ sơ nhân viên (nếu có) vẫn được giữ nguyên', destructive: true }))
                          remove.mutate(u.id);
                      }}
                    >
                      <Trash2 /> Xoá
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me?.id, resend.isPending],
  );

  return (
    <>
      <PageHeader
        title="Tài khoản"
        description="Người dùng đăng nhập hệ thống và vai trò của họ"
        breadcrumbs={[{ label: 'Hệ thống' }, { label: 'Tài khoản' }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setInviting(true)}><MailPlus /> Mời nhân viên</Button>
            <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus /> Tạo tài khoản</Button>
          </>
        }
      />
      <DataTable
        id="users"
        columns={columns}
        data={data}
        loading={isFetching}
        sortBy={q.sortBy}
        order={q.order}
        onSortChange={(sortBy, order) => setQ({ sortBy, order })}
        onPageChange={(page) => setQ({ page })}
        onLimitChange={(limit) => setQ({ limit })}
        toolbar={
          <>
            <SearchInput value={q.search} onChange={(search) => setQ({ search })} placeholder="Tìm email, tên, mã NV…" />
            <Select className="h-8 w-full sm:w-40" value={q.roleId} onChange={(roleId) => setQ({ roleId })} options={roles} placeholder="Vai trò" clearable clearLabel="Tất cả vai trò" />
            <Select
              className="h-8 w-full sm:w-36"
              value={q.isActive}
              onChange={(isActive) => setQ({ isActive })}
              options={[{ value: 'true', label: 'Hoạt động' }, { value: 'false', label: 'Đã khoá' }]}
              placeholder="Trạng thái"
              clearable
              clearLabel="Tất cả"
            />
            {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={reset}><X /> Xoá lọc</Button>}
          </>
        }
        empty={<EmptyState icon={UserCog} title="Không có tài khoản phù hợp" />}
      />
      <UserDialog open={open} onOpenChange={setOpen} user={editing} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <InviteDialog open={inviting} onOpenChange={setInviting} onDone={setResults} />
      <InviteResultsDialog results={results} onClose={() => setResults(null)} />
    </>
  );
}
