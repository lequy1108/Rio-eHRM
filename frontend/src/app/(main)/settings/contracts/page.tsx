'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MoreHorizontal, Pencil, Plus, Power, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CodeTag } from '@/components/code-tag';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useContractTypes } from '@/lib/queries';
import type { ContractTemplate, ContractType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/confirm-provider';
import { SettingsCard, ToggleRow, useLoadForm, useSaveSettings } from '../_components/settings-kit';

/* ---------- Đánh số và nhắc hạn ---------- */

const numSchema = z.object({
  numberFormat: z.string().trim().min(1, 'Nhập mẫu số').max(60).refine((v) => v.includes('{seq}'), 'Mẫu phải có {seq}'),
  seqLength: z.coerce.number<string | number>().int().min(1, 'Từ 1 đến 8').max(8, 'Từ 1 đến 8'),
  remindDays: z.string().trim().regex(/^\s*\d{1,3}(\s*,\s*\d{1,3}){0,5}\s*$/, 'Các số ngày ngăn cách bằng dấu phẩy, vd 30,15,7'),
  defaultWorkLocation: z.string().trim().max(255),
});
type NumIn = z.input<typeof numSchema>;
type NumOut = z.output<typeof numSchema>;

function NumberingCard() {
  const { data, isLoading } = useQuery({ queryKey: ['settings', 'contract'], queryFn: () => api<NumIn>('/settings/contract') });
  const save = useSaveSettings('contract');
  const form = useForm<NumIn, unknown, NumOut>({ resolver: zodResolver(numSchema) });
  const { register, handleSubmit, watch, formState: { errors, isDirty } } = form;
  useLoadForm(form, data);
  const fmt = watch('numberFormat') ?? '';
  const len = Math.min(Math.max(Number(watch('seqLength')) || 3, 1), 8);
  const year = new Date().getFullYear();
  const sample = (n: number) =>
    fmt.replaceAll('{seq}', String(n).padStart(len, '0')).replaceAll('{year}', String(year)).replaceAll('{code}', 'NV0001').replaceAll('{type}', 'XDTH12');

  return (
    <form id="contract-settings" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: (d) => form.reset(d as NumIn) }))}>
      <SettingsCard
        title="Đánh số và nhắc hạn"
        formId="contract-settings"
        dirty={isDirty}
        saving={save.isPending}
        onReset={() => form.reset()}
        loading={isLoading}
        className="sm:grid-cols-[1fr_140px]"
      >
        <FormField
          label="Mẫu số hợp đồng"
          htmlFor="numberFormat"
          error={errors.numberFormat?.message}
          hint="{seq} số thứ tự trong năm, {year} năm ký, {code} mã nhân viên, {type} mã loại hợp đồng"
        >
          <Input id="numberFormat" className="font-mono" aria-invalid={!!errors.numberFormat} {...register('numberFormat')} />
        </FormField>
        <FormField label="Số chữ số" htmlFor="seqLength" error={errors.seqLength?.message}>
          <Input id="seqLength" type="number" min={1} max={8} {...register('seqLength')} />
        </FormField>
        {fmt.includes('{seq}') && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            Số sẽ có dạng <CodeTag>{sample(1)}</CodeTag> <CodeTag>{sample(2)}</CodeTag>
          </div>
        )}
        <FormField
          label="Nhắc trước khi hết hạn (ngày)"
          htmlFor="remindDays"
          error={errors.remindDays?.message}
          hint="Gửi email cho người quản lý hợp đồng ở từng mốc, vd 30,15,7"
          className="sm:col-span-2"
        >
          <Input id="remindDays" className="font-mono" aria-invalid={!!errors.remindDays} {...register('remindDays')} />
        </FormField>
        <FormField label="Địa điểm làm việc mặc định" htmlFor="defaultWorkLocation" hint="Bỏ trống thì dùng địa chỉ công ty" className="sm:col-span-2">
          <Input id="defaultWorkLocation" {...register('defaultWorkLocation')} />
        </FormField>
      </SettingsCard>
    </form>
  );
}

/* ---------- Loại hợp đồng ---------- */

type TypeForm = { code: string; name: string; hasTerm: boolean; defaultMonths: string; isProbation: boolean };

function TypeDialog({ type, open, onOpenChange }: { type: ContractType | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<TypeForm>({ code: '', name: '', hasTerm: true, defaultMonths: '12', isProbation: false });
  useEffect(() => {
    if (open)
      setF({
        code: type?.code ?? '',
        name: type?.name ?? '',
        hasTerm: type?.hasTerm ?? true,
        defaultMonths: type?.defaultMonths ? String(type.defaultMonths) : type ? '' : '12',
        isProbation: type?.isProbation ?? false,
      });
  }, [open, type]);
  const m = useMutation({
    mutationFn: () => {
      const body = {
        code: f.code,
        name: f.name,
        hasTerm: f.hasTerm,
        defaultMonths: f.hasTerm && f.defaultMonths ? Number(f.defaultMonths) : null,
        isProbation: f.isProbation,
      };
      return type ? api(`/contract-types/${type.id}`, { method: 'PATCH', body }) : api('/contract-types', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success(type ? 'Đã cập nhật loại hợp đồng' : 'Đã thêm loại hợp đồng');
      qc.invalidateQueries({ queryKey: ['contract-types'] });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type ? `Sửa ${type.name}` : 'Thêm loại hợp đồng'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form
            id="type-form"
            className="grid gap-4 sm:grid-cols-[120px_1fr]"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <FormField label="Mã" htmlFor="t-code" required>
              <Input id="t-code" className="font-mono uppercase" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} />
            </FormField>
            <FormField label="Tên" htmlFor="t-name" required>
              <Input id="t-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </FormField>
            <div className="grid gap-3 sm:col-span-2">
              <ToggleRow id="t-term" checked={f.hasTerm} onChange={(hasTerm) => setF({ ...f, hasTerm })} label="Có thời hạn" description="Bắt buộc nhập ngày kết thúc" />
              {f.hasTerm && (
                <FormField label="Thời hạn mặc định (tháng)" htmlFor="t-months" hint="Tự tính ngày kết thúc khi tạo hợp đồng" className="max-w-56">
                  <Input id="t-months" type="number" min={1} max={60} value={f.defaultMonths} onChange={(e) => setF({ ...f, defaultMonths: e.target.value })} />
                </FormField>
              )}
              <ToggleRow
                id="t-prob"
                checked={f.isProbation}
                onChange={(isProbation) => setF({ ...f, isProbation })}
                label="Là hợp đồng thử việc"
                description="Ký loại khác (không phải thử việc) thì nhân viên đang thử việc tự chuyển sang Chính thức"
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="type-form" loading={m.isPending} disabled={!f.code || !f.name}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypesCard() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: types = [] } = useContractTypes(false);
  const [editing, setEditing] = useState<ContractType | null>(null);
  const [open, setOpen] = useState(false);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['contract-types'] });
  const toggle = useMutation({
    mutationFn: (t: ContractType) => api(`/contract-types/${t.id}`, { method: 'PATCH', body: { isActive: !t.isActive } }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/contract-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá loại hợp đồng');
      invalidate();
    },
  });
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Loại hợp đồng</CardTitle>
          <CardDescription>Theo Bộ luật Lao động 2019, hợp đồng xác định thời hạn tối đa 36 tháng</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus /> Thêm
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Thời hạn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((t) => (
              <TableRow key={t.id} className={cn(!t.isActive && 'text-muted-foreground')}>
                <TableCell className="pl-6">
                  <CodeTag>{t.code}</CodeTag>
                </TableCell>
                <TableCell>
                  {t.name}
                  {t.isProbation && <span className="ml-2 text-xs text-muted-foreground">thử việc</span>}
                </TableCell>
                <TableCell>{t.hasTerm ? (t.defaultMonths ? `${t.defaultMonths} tháng` : 'Có thời hạn') : 'Không xác định'}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className={cn('size-1.5 rounded-full', t.isActive ? 'bg-success' : 'bg-muted-foreground/40')} />
                    {t.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                  </span>
                </TableCell>
                <TableCell className="pr-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(t);
                          setOpen(true);
                        }}
                      >
                        <Pencil /> Sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggle.mutate(t)}>
                        <Power /> {t.isActive ? 'Ngừng dùng' : 'Dùng lại'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        onClick={async () => {
                          if (await confirm({ title: `Xoá loại ${t.name}?`, destructive: true })) remove.mutate(t.id);
                        }}
                      >
                        <Trash2 /> Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <TypeDialog type={editing} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

/* ---------- Mẫu hợp đồng ---------- */

function TemplatesCard() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: templates = [] } = useQuery({ queryKey: ['contract-templates'], queryFn: () => api<ContractTemplate[]>('/contract-templates') });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['contract-templates'] });
  const makeDefault = useMutation({
    mutationFn: (id: string) => api(`/contract-templates/${id}`, { method: 'PATCH', body: { isDefault: true } }),
    onSuccess: () => {
      toast.success('Đã đặt làm mẫu mặc định');
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/contract-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá mẫu');
      invalidate();
    },
  });
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Mẫu hợp đồng</CardTitle>
          <CardDescription>Mẫu có biến như {'{{ho_ten}}'}, {'{{luong_co_ban}}'}; khi in hệ thống tự điền dữ liệu của từng hợp đồng</CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/settings/contracts/templates/new">
            <Plus /> Thêm mẫu
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <ul className="divide-y">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-6 py-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" />
              <Link href={`/settings/contracts/templates/${t.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium hover:underline">
                  {t.name}
                  {t.isDefault && <span className="rounded border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">Mặc định</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.description ? `${t.description} · ` : ''}Sửa lần cuối <span className="font-mono tabular-nums">{formatDate(t.updatedAt)}</span>
                </div>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/settings/contracts/templates/${t.id}`}>
                      <Pencil /> Sửa
                    </Link>
                  </DropdownMenuItem>
                  {!t.isDefault && (
                    <DropdownMenuItem onClick={() => makeDefault.mutate(t.id)}>
                      <Star /> Đặt làm mặc định
                    </DropdownMenuItem>
                  )}
                  {!t.isDefault && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        onClick={async () => {
                          if (await confirm({ title: `Xoá mẫu ${t.name}?`, destructive: true })) remove.mutate(t.id);
                        }}
                      >
                        <Trash2 /> Xoá
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function ContractSettingsPage() {
  return (
    <div className="grid gap-6">
      <NumberingCard />
      <TypesCard />
      <TemplatesCard />
    </div>
  );
}
