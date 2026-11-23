'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Briefcase, MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CodeTag } from '@/components/code-tag';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, Textarea } from '@/components/ui/input';
import { useUrlState } from '@/hooks/use-url-state';
import { api } from '@/lib/api';
import type { Paginated, Position } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';

const schema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã').max(50).regex(/^[A-Za-z0-9_-]+$/, 'Chỉ gồm chữ không dấu, số, - và _'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên chức vụ').max(255),
  level: z.coerce.number<string>().int('Phải là số nguyên').min(1, 'Nhỏ nhất là 1').max(20, 'Lớn nhất là 20'),
  description: z.string(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function PositionDialog({ open, onOpenChange, position }: { open: boolean; onOpenChange: (o: boolean) => void; position: Position | null }) {
  const qc = useQueryClient();
  const isEdit = !!position;
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open)
      reset({
        code: position?.code ?? '',
        name: position?.name ?? '',
        level: String(position?.level ?? 3),
        description: position?.description ?? '',
      });
  }, [open, position, reset]);

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: FormValues) => {
      const body = { ...v, description: v.description || null };
      return isEdit ? api(`/positions/${position!.id}`, { method: 'PATCH', body }) : api('/positions', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật chức vụ' : 'Đã thêm chức vụ');
      qc.invalidateQueries({ queryKey: ['positions'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (/tồn tại/i.test(err.message)) setError('code', { message: 'Mã chức vụ đã tồn tại' });
      else toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa chức vụ' : 'Thêm chức vụ'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
        <form id="pos-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã" htmlFor="code" required error={errors.code?.message}>
            <Input id="code" autoFocus aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="Cấp bậc" htmlFor="level" required error={errors.level?.message} hint="1 là cấp cao nhất">
            <Input id="level" type="number" min={1} max={20} aria-invalid={!!errors.level} {...register('level')} />
          </FormField>
          <FormField label="Tên chức vụ" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Mô tả" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" rows={3} {...register('description')} />
          </FormField>
        </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="pos-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PositionsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canEdit = can('organization.manage');
  const [q, setQ] = useUrlState({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['positions', 'list', q],
    queryFn: () => api<Paginated<Position>>('/positions', { query: q }),
    placeholderData: (p) => p,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/positions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá chức vụ');
      qc.invalidateQueries({ queryKey: ['positions'] });
    },
  });

  const openForm = (p: Position | null) => {
    setEditing(p);
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      { id: 'code', header: 'Mã', meta: { title: 'Mã', sortKey: 'code', className: 'w-28' }, cell: ({ row }) => <CodeTag>{row.original.code}</CodeTag> },
      { id: 'name', header: 'Tên chức vụ', meta: { title: 'Tên', sortKey: 'name', alwaysVisible: true }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: 'level', header: 'Cấp bậc', meta: { title: 'Cấp bậc', sortKey: 'level', className: 'w-28' }, cell: ({ row }) => <Badge variant="outline">Cấp {row.original.level}</Badge> },
      {
        id: 'employeeCount',
        header: 'Nhân sự',
        meta: { title: 'Nhân sự', className: 'w-28' },
        cell: ({ row }) => (
          <Link href={`/employees?positionId=${row.original.id}`}>
            <Badge variant="secondary" className="hover:bg-accent">
              <Users className="size-3" /> {row.original.employeeCount ?? 0}
            </Badge>
          </Link>
        ),
      },
      { id: 'description', header: 'Mô tả', meta: { title: 'Mô tả' }, cell: ({ row }) => <span className="line-clamp-1 text-muted-foreground">{row.original.description ?? '—'}</span> },
      {
        id: 'actions',
        meta: { alwaysVisible: true, className: 'w-12 text-right' },
        cell: ({ row }) =>
          canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openForm(row.original)}>
                  <Pencil /> Sửa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onClick={async () => {
                    const n = row.original.employeeCount ?? 0;
                    const ok = await confirm({
                      title: `Xoá chức vụ ${row.original.name}?`,
                      description: n ? `${n} nhân viên đang giữ chức vụ này sẽ bị bỏ trống chức vụ.` : undefined,
                      destructive: true,
                    });
                    if (ok) remove.mutate(row.original.id);
                  }}
                >
                  <Trash2 /> Xoá
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit],
  );

  return (
    <>
      <PageHeader
        title="Chức vụ"
        description="Danh mục chức vụ và cấp bậc"
        breadcrumbs={[{ label: 'Chức vụ' }]}
        actions={canEdit && <Button onClick={() => openForm(null)}><Plus /> Thêm chức vụ</Button>}
      />
      <DataTable
        id="positions"
        columns={columns}
        data={data}
        loading={isFetching}
        sortBy={q.sortBy}
        order={q.order}
        onSortChange={(sortBy, order) => setQ({ sortBy, order })}
        onPageChange={(page) => setQ({ page })}
        onLimitChange={(limit) => setQ({ limit })}
        toolbar={<SearchInput value={q.search} onChange={(search) => setQ({ search })} placeholder="Tìm mã hoặc tên…" />}
        empty={<EmptyState icon={Briefcase} title={q.search ? 'Không tìm thấy chức vụ' : 'Chưa có chức vụ'} />}
      />
      <PositionDialog open={open} onOpenChange={setOpen} position={editing} />
    </>
  );
}
