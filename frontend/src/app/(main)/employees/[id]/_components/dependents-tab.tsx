'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { RELATION_LABEL, toOptions, type Dependent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/confirm-provider';

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => today().slice(0, 8) + '01';

/** Trạng thái giảm trừ tại thời điểm hôm nay */
function deductionState(d: Dependent) {
  const t = today();
  if (d.deductionFrom > t) return { label: 'Chưa bắt đầu', dot: 'bg-muted-foreground/40', active: false };
  if (d.deductionTo && d.deductionTo < t) return { label: 'Đã kết thúc', dot: 'bg-muted-foreground/40', active: false };
  return { label: 'Đang giảm trừ', dot: 'bg-success', active: true };
}

const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(255),
    relationship: z.string().min(1, 'Vui lòng chọn quan hệ'),
    dateOfBirth: z.string(),
    identityNumber: z
      .string()
      .trim()
      .refine((v) => !v || /^(\d{12}|\d{10}(-?\d{3})?)$/.test(v), 'Số định danh gồm 12 chữ số'),
    deductionFrom: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
    deductionTo: z.string(),
    note: z.string().trim(),
  })
  .refine((v) => !v.deductionTo || v.deductionTo >= v.deductionFrom, {
    path: ['deductionTo'],
    message: 'Phải sau ngày bắt đầu',
  });
type FormValues = z.infer<typeof schema>;

function DependentDialog({
  open,
  onOpenChange,
  employeeId,
  dependent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employeeId: string;
  dependent: Dependent | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!dependent;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open)
      reset({
        fullName: dependent?.fullName ?? '',
        relationship: dependent?.relationship ?? 'CHILD',
        dateOfBirth: dependent?.dateOfBirth ?? '',
        identityNumber: dependent?.identityNumber ?? '',
        deductionFrom: dependent?.deductionFrom ?? firstOfMonth(),
        deductionTo: dependent?.deductionTo ?? '',
        note: dependent?.note ?? '',
      });
  }, [open, dependent, reset]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val === '' ? (isEdit ? null : undefined) : val]));
      const base = `/employees/${employeeId}/dependents`;
      return isEdit ? api(`${base}/${dependent!.id}`, { method: 'PATCH', body }) : api(base, { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật người phụ thuộc' : 'Đã thêm người phụ thuộc');
      qc.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa người phụ thuộc' : 'Thêm người phụ thuộc'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="dependent-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Họ tên" htmlFor="dep-name" required error={errors.fullName?.message}>
              <Input id="dep-name" autoFocus aria-invalid={!!errors.fullName} {...register('fullName')} />
            </FormField>
            <FormField label="Quan hệ" required error={errors.relationship?.message}>
              <Controller
                control={control}
                name="relationship"
                render={({ field }) => <Select value={field.value} onChange={field.onChange} options={toOptions(RELATION_LABEL)} />}
              />
            </FormField>
            <FormField label="Ngày sinh" htmlFor="dep-dob">
              <Input id="dep-dob" type="date" max={today()} {...register('dateOfBirth')} />
            </FormField>
            <FormField label="Số định danh" htmlFor="dep-id" error={errors.identityNumber?.message} hint="Số CCCD hoặc mã định danh của con">
              <Input id="dep-id" inputMode="numeric" className="font-mono" aria-invalid={!!errors.identityNumber} {...register('identityNumber')} />
            </FormField>
            <FormField label="Giảm trừ từ" htmlFor="dep-from" required error={errors.deductionFrom?.message}>
              <Input id="dep-from" type="date" aria-invalid={!!errors.deductionFrom} {...register('deductionFrom')} />
            </FormField>
            <FormField label="Giảm trừ đến" htmlFor="dep-to" error={errors.deductionTo?.message} hint="Để trống nếu vẫn đang giảm trừ">
              <Input id="dep-to" type="date" aria-invalid={!!errors.deductionTo} {...register('deductionTo')} />
            </FormField>
            <FormField label="Ghi chú" htmlFor="dep-note" className="sm:col-span-2">
              <Textarea id="dep-note" rows={2} {...register('note')} />
            </FormField>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="dependent-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DependentsTab({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['employees', 'detail', employeeId, 'dependents'],
    queryFn: () => api<Dependent[]>(`/employees/${employeeId}/dependents`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/employees/${employeeId}/dependents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá người phụ thuộc');
      qc.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });
    },
  });

  const activeCount = data.filter((d) => deductionState(d).active).length;
  const openForm = (d: Dependent | null) => {
    setEditing(d);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Người phụ thuộc</CardTitle>
          {data.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{activeCount}</span> người đang được giảm trừ gia cảnh
            </p>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => openForm(null)}>
            <Plus /> Thêm
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn(data.length > 0 && 'px-0 pb-0')}>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={Users} title="Chưa có người phụ thuộc" description="Người phụ thuộc được dùng để giảm trừ gia cảnh khi tính thuế TNCN" className="py-8" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Họ tên</TableHead>
                <TableHead>Quan hệ</TableHead>
                <TableHead>Ngày sinh</TableHead>
                <TableHead>Số định danh</TableHead>
                <TableHead>Giảm trừ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => {
                const st = deductionState(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="pl-5 font-medium">
                      {d.fullName}
                      {d.note && <div className="text-xs font-normal text-muted-foreground">{d.note}</div>}
                    </TableCell>
                    <TableCell>{RELATION_LABEL[d.relationship]}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{formatDate(d.dateOfBirth)}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{d.identityNumber ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap tabular-nums">
                      {formatDate(d.deductionFrom)} → {d.deductionTo ? formatDate(d.deductionTo) : 'nay'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
                        <span className={cn('size-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openForm(d)}>
                              <Pencil /> Sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onClick={async () => {
                                if (await confirm({ title: `Xoá người phụ thuộc ${d.fullName}?`, destructive: true })) remove.mutate(d.id);
                              }}
                            >
                              <Trash2 /> Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <DependentDialog open={open} onOpenChange={setOpen} employeeId={employeeId} dependent={editing} />
    </Card>
  );
}
