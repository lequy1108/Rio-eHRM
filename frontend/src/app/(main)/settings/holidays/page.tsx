'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Holiday } from '@/lib/types';
import { useConfirm } from '@/providers/confirm-provider';

const WEEKDAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const weekday = (d: string) => WEEKDAY[new Date(`${d}T00:00:00`).getDay()];

const schema = z.object({
  date: z.string().min(1, 'Chọn ngày'),
  name: z.string().trim().min(1, 'Nhập tên ngày lễ').max(150),
  paid: z.boolean(),
  note: z.string().trim().max(255),
});
type Values = z.infer<typeof schema>;

function HolidayDialog({ open, onOpenChange, item, year }: { open: boolean; onOpenChange: (o: boolean) => void; item: Holiday | null; year: number }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (open) reset({ date: item?.date ?? '', name: item?.name ?? '', paid: item?.paid ?? true, note: item?.note ?? '' });
  }, [open, item, reset]);
  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: Values) =>
      item ? api(`/holidays/${item.id}`, { method: 'PATCH', body: v }) : api('/holidays', { method: 'POST', body: v }),
    onSuccess: () => {
      toast.success(item ? 'Đã cập nhật ngày lễ' : 'Đã thêm ngày lễ');
      qc.invalidateQueries({ queryKey: ['holidays'] });
      onOpenChange(false);
    },
    onError: (e: Error) => (/Ngày/.test(e.message) ? setError('date', { message: e.message }) : toast.error(e.message)),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Sửa ngày lễ' : 'Thêm ngày nghỉ'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="holiday-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
            <FormField label="Ngày" htmlFor="date" required error={errors.date?.message}>
              <Input id="date" type="date" min={`${year - 1}-01-01`} max={`${year + 1}-12-31`} className="w-48" aria-invalid={!!errors.date} {...register('date')} />
            </FormField>
            <FormField label="Tên" htmlFor="name" required error={errors.name?.message}>
              <Input id="name" placeholder="Nghỉ bù Quốc khánh" aria-invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField label="Ghi chú" htmlFor="note">
              <Input id="note" {...register('note')} />
            </FormField>
            <Controller
              control={control}
              name="paid"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} className="mt-0.5" />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">Nghỉ hưởng nguyên lương</span>
                    <span className="text-xs text-muted-foreground">Tắt cho ngày công ty cho nghỉ nhưng không tính lương</span>
                  </span>
                </label>
              )}
            />
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="holiday-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HolidaysSettingsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => api<Holiday[]>('/holidays', { query: { year } }),
  });
  const gen = useMutation({
    mutationFn: () => api<{ added: number }>('/holidays/generate', { method: 'POST', body: { year } }),
    onSuccess: (r) => {
      toast.success(r.added ? `Đã thêm ${r.added} ngày lễ của năm ${year}` : `Năm ${year} đã đủ các ngày lễ mặc định`);
      qc.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá ngày lễ');
      qc.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
  const paidDays = data.filter((h) => h.paid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ngày nghỉ lễ</CardTitle>
        <CardDescription>
          Dùng cho chấm công và nghỉ phép. Ngày mặc định theo Điều 112 Bộ luật Lao động, ngày Tết tính theo âm lịch. Lịch nghỉ bù
          thay đổi theo thông báo của Chính phủ mỗi năm, nên kiểm tra và sửa lại cho đúng
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center rounded-md border">
            <Button variant="ghost" size="icon-sm" aria-label="Năm trước" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft />
            </Button>
            <span className="w-12 text-center font-mono text-sm tabular-nums">{year}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Năm sau" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight />
            </Button>
          </div>
          <Button variant="outline" size="sm" loading={gen.isPending} onClick={() => gen.mutate()}>
            <Wand2 /> Thêm ngày lễ mặc định
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus /> Thêm ngày nghỉ
          </Button>
          {data.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">{data.length}</span> ngày, <span className="font-mono tabular-nums">{paidDays}</span> hưởng lương
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={CalendarDays} title={`Chưa có ngày lễ năm ${year}`} description="Bấm Thêm ngày lễ mặc định để tạo nhanh, rồi chỉnh theo lịch chính thức" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Ngày</TableHead>
                <TableHead className="w-24">Thứ</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead className="w-28">Hưởng lương</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-mono tabular-nums">{formatDate(h.date)}</TableCell>
                  <TableCell className="text-muted-foreground">{weekday(h.date)}</TableCell>
                  <TableCell>
                    <div>{h.name}</div>
                    {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.paid ? 'Có' : 'Không'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" aria-label="Sửa" onClick={() => { setEditing(h); setOpen(true); }}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Xoá"
                      onClick={async () => {
                        if (await confirm({ title: `Xoá ${h.name}?`, description: formatDate(h.date), destructive: true })) remove.mutate(h.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <HolidayDialog open={open} onOpenChange={setOpen} item={editing} year={year} />
    </Card>
  );
}
