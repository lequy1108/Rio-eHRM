'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CodeTag } from '@/components/code-tag';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { EmployeePicker } from '@/components/employee-picker';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
import { api, fileUrl } from '@/lib/api';
import { useDepartmentOptions } from '@/lib/queries';
import type { Department, Paginated } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';

const schema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã').max(50, 'Tối đa 50 ký tự').regex(/^[A-Za-z0-9_-]+$/, 'Chỉ gồm chữ không dấu, số, - và _'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên phòng ban').max(255),
  parentId: z.string(),
  managerId: z.string(),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

function DepartmentDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  department: Department | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!department;
  const { data: options = [] } = useDepartmentOptions();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = form;

  useEffect(() => {
    if (open)
      reset({
        code: department?.code ?? '',
        name: department?.name ?? '',
        parentId: department?.parentId ?? '',
        managerId: department?.managerId ?? '',
        description: department?.description ?? '',
      });
  }, [open, department, reset]);

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: FormValues) => {
      const body = { ...v, parentId: v.parentId || null, managerId: v.managerId || null, description: v.description || null };
      return isEdit
        ? api(`/departments/${department!.id}`, { method: 'PATCH', body })
        : api('/departments', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật phòng ban' : 'Đã thêm phòng ban');
      qc.invalidateQueries({ queryKey: ['departments'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (/tồn tại/i.test(err.message)) setError('code', { message: 'Mã phòng ban đã tồn tại' });
      else if (/cấp trên/i.test(err.message)) setError('parentId', { message: err.message });
      else toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa phòng ban' : 'Thêm phòng ban'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
        <form id="dep-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-3">
          <FormField label="Mã" htmlFor="code" required error={errors.code?.message}>
            <Input id="code" autoFocus aria-invalid={!!errors.code} {...register('code')} />
          </FormField>
          <FormField label="Tên phòng ban" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          </FormField>
          <FormField label="Trực thuộc" error={errors.parentId?.message} className="sm:col-span-3">
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <Combobox
                  value={field.value}
                  onChange={field.onChange}
                  options={options.filter((o) => o.value !== department?.id)}
                  placeholder="Không có (cấp cao nhất)"
                  invalid={!!errors.parentId}
                />
              )}
            />
          </FormField>
          <FormField label="Trưởng phòng" className="sm:col-span-3">
            <Controller
              control={control}
              name="managerId"
              render={({ field }) => (
                <EmployeePicker value={field.value} onChange={field.onChange} selectedLabel={department?.manager?.fullName} placeholder="Chọn trưởng phòng" />
              )}
            />
          </FormField>
          <FormField label="Mô tả" htmlFor="description" className="sm:col-span-3">
            <Textarea id="description" rows={3} {...register('description')} />
          </FormField>
        </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="dep-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canEdit = can('organization.manage');
  const [q, setQ] = useUrlState({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['departments', 'list', q],
    queryFn: () => api<Paginated<Department>>('/departments', { query: q }),
    placeholderData: (p) => p,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá phòng ban');
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const openForm = (d: Department | null) => {
    setEditing(d);
    setOpen(true);
  };

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      { id: 'code', header: 'Mã', meta: { title: 'Mã', sortKey: 'code', className: 'w-28' }, cell: ({ row }) => <CodeTag>{row.original.code}</CodeTag> },
      { id: 'name', header: 'Tên phòng ban', meta: { title: 'Tên', sortKey: 'name', alwaysVisible: true }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
      { id: 'parent', header: 'Trực thuộc', meta: { title: 'Trực thuộc' }, cell: ({ row }) => row.original.parent?.name ?? <span className="text-muted-foreground">—</span> },
      {
        id: 'manager',
        header: 'Trưởng phòng',
        meta: { title: 'Trưởng phòng' },
        cell: ({ row }) =>
          row.original.manager ? (
            <Link href={`/employees/${row.original.manager.id}`} className="flex items-center gap-2 hover:underline">
              <Avatar name={row.original.manager.fullName} src={fileUrl(row.original.manager.avatarUrl)} className="size-6 text-[10px]" />
              {row.original.manager.fullName}
            </Link>
          ) : (
            <span className="text-muted-foreground">Chưa có</span>
          ),
      },
      {
        id: 'employeeCount',
        header: 'Nhân sự',
        meta: { title: 'Nhân sự', className: 'w-28' },
        cell: ({ row }) => (
          <Link href={`/employees?departmentId=${row.original.id}`}>
            <Badge variant="secondary" className="hover:bg-accent">
              <Users className="size-3" /> {row.original.employeeCount ?? 0}
            </Badge>
          </Link>
        ),
      },
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
                    if (await confirm({ title: `Xoá phòng ban ${row.original.name}?`, destructive: true })) remove.mutate(row.original.id);
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
        title="Phòng ban"
        description="Cơ cấu tổ chức của công ty"
        breadcrumbs={[{ label: 'Phòng ban' }]}
        actions={
          canEdit && (
            <Button onClick={() => openForm(null)}>
              <Plus /> Thêm phòng ban
            </Button>
          )
        }
      />
      <DataTable
        id="departments"
        columns={columns}
        data={data}
        loading={isFetching}
        sortBy={q.sortBy}
        order={q.order}
        onSortChange={(sortBy, order) => setQ({ sortBy, order })}
        onPageChange={(page) => setQ({ page })}
        onLimitChange={(limit) => setQ({ limit })}
        toolbar={<SearchInput value={q.search} onChange={(search) => setQ({ search })} placeholder="Tìm mã hoặc tên…" />}
        empty={
          <EmptyState
            icon={Building2}
            title={q.search ? 'Không tìm thấy phòng ban' : 'Chưa có phòng ban'}
            action={canEdit && !q.search && <Button size="sm" onClick={() => openForm(null)}><Plus /> Thêm phòng ban</Button>}
          />
        }
      />
      <DepartmentDialog open={open} onOpenChange={setOpen} department={editing} />
    </>
  );
}
