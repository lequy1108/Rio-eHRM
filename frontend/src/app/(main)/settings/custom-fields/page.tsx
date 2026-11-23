'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, FormInput, MoreHorizontal, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CodeTag } from '@/components/code-tag';
import { EmptyState } from '@/components/empty-state';
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
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useCustomFields } from '@/lib/custom-fields';
import { CUSTOM_TYPE_LABEL, toOptions, type CustomField, type CustomFieldType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/confirm-provider';
import { ToggleRow } from '../_components/settings-kit';

const DEFAULT_SECTION = 'Thông tin bổ sung';
const hasOptions = (t: string) => t === 'SELECT' || t === 'MULTISELECT';

const schema = z
  .object({
    label: z.string().trim().min(1, 'Vui lòng nhập tên trường').max(100),
    type: z.string().min(1),
    options: z.string(),
    section: z.string().trim().max(100),
    hint: z.string().trim().max(255),
    required: z.boolean(),
    showInList: z.boolean(),
    sensitive: z.boolean(),
  })
  .refine((v) => !hasOptions(v.type) || v.options.split('\n').some((o) => o.trim()), {
    path: ['options'],
    message: 'Nhập ít nhất một lựa chọn',
  })
  .refine(
    (v) => {
      const list = v.options.split('\n').map((o) => o.trim().toLowerCase()).filter(Boolean);
      return new Set(list).size === list.length;
    },
    { path: ['options'], message: 'Các lựa chọn không được trùng nhau' },
  );
type Values = z.infer<typeof schema>;

function FieldDialog({
  open,
  onOpenChange,
  field,
  sections,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  field: CustomField | null;
  sections: string[];
}) {
  const qc = useQueryClient();
  const isEdit = !!field;
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const type = watch('type');

  useEffect(() => {
    if (open)
      reset({
        label: field?.label ?? '',
        type: field?.type ?? 'TEXT',
        options: field?.options.join('\n') ?? '',
        section: field?.section ?? sections[0] ?? DEFAULT_SECTION,
        hint: field?.hint ?? '',
        required: field?.required ?? false,
        showInList: field?.showInList ?? false,
        sensitive: field?.sensitive ?? false,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, field]);

  const save = useMutation({
    mutationFn: (v: Values) => {
      const { type: t, ...rest } = v;
      const body = {
        ...rest,
        options: hasOptions(t) ? v.options.split('\n').map((o) => o.trim()).filter(Boolean) : [],
        section: v.section || DEFAULT_SECTION,
        hint: v.hint || undefined,
      };
      return isEdit
        ? api(`/custom-fields/${field!.id}`, { method: 'PATCH', body })
        : api('/custom-fields', { method: 'POST', body: { ...body, type: t } });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật trường' : 'Đã thêm trường vào hồ sơ nhân viên');
      qc.invalidateQueries({ queryKey: ['custom-fields'] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa trường ${field!.label}` : 'Thêm trường'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="field-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tên trường" htmlFor="label" required error={errors.label?.message} className="sm:col-span-2">
              <Input id="label" autoFocus placeholder="Vd Size áo đồng phục" aria-invalid={!!errors.label} {...register('label')} />
            </FormField>
            <FormField label="Kiểu dữ liệu" required hint={isEdit ? 'Không đổi được sau khi tạo' : undefined}>
              <Controller
                control={control}
                name="type"
                render={({ field: fld }) => (
                  <Select value={fld.value} onChange={fld.onChange} options={toOptions(CUSTOM_TYPE_LABEL)} disabled={isEdit} />
                )}
              />
            </FormField>
            <FormField label="Nhóm" htmlFor="section" hint="Các trường cùng nhóm hiện chung một thẻ trong tab Cá nhân">
              <Input id="section" list="cf-sections" {...register('section')} />
              <datalist id="cf-sections">
                {sections.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </FormField>
            {hasOptions(type) && (
              <FormField label="Các lựa chọn" htmlFor="options" required error={errors.options?.message} hint="Mỗi dòng một lựa chọn" className="sm:col-span-2">
                <Textarea id="options" rows={4} aria-invalid={!!errors.options} {...register('options')} />
              </FormField>
            )}
            <FormField label="Gợi ý dưới ô nhập" htmlFor="hint" className="sm:col-span-2">
              <Input id="hint" {...register('hint')} />
            </FormField>
            <div className="grid gap-3 border-t pt-4 sm:col-span-2">
              <Controller
                control={control}
                name="required"
                render={({ field: f }) => (
                  <ToggleRow id="required" checked={f.value} onChange={f.onChange} label="Bắt buộc nhập" description="Kiểm tra khi sửa nhóm này và khi nhập Excel" />
                )}
              />
              <Controller
                control={control}
                name="showInList"
                render={({ field: f }) => (
                  <ToggleRow id="showInList" checked={f.value} onChange={f.onChange} label="Hiện thành cột trong danh sách nhân viên" />
                )}
              />
              <Controller
                control={control}
                name="sensitive"
                render={({ field: f }) => (
                  <ToggleRow
                    id="sensitive"
                    checked={f.value}
                    onChange={f.onChange}
                    label="Thông tin nhạy cảm"
                    description="Chỉ vai trò có quyền xem thuế, BHXH, ngân hàng mới thấy"
                  />
                )}
              />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="field-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CustomFieldsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: fields = [], isLoading } = useCustomFields(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const sections = [...new Set(fields.map((f) => f.section))];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['custom-fields'] });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => api('/custom-fields/order', { method: 'PUT', body: { ids } }),
    onSuccess: invalidate,
  });
  const toggle = useMutation({
    mutationFn: (f: CustomField) => api(`/custom-fields/${f.id}`, { method: 'PATCH', body: { isActive: !f.isActive } }),
    onSuccess: (_d, f) => {
      toast.success(f.isActive ? `Đã ẩn trường ${f.label}` : `Đã dùng lại trường ${f.label}`);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/custom-fields/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá trường');
      invalidate();
    },
  });

  const move = (i: number, d: -1 | 1) => {
    const ids = fields.map((f) => f.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    reorder.mutate(ids);
  };
  const openForm = (f: CustomField | null) => {
    setEditing(f);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Trường tuỳ chỉnh</CardTitle>
          <CardDescription>
            Thêm thông tin riêng của công ty vào hồ sơ nhân viên. Trường mới hiện ở tab Cá nhân, trong file Excel xuất ra và file mẫu nhập
          </CardDescription>
        </div>
        <Button onClick={() => openForm(null)}>
          <Plus /> Thêm trường
        </Button>
      </CardHeader>
      <CardContent className={cn(fields.length > 0 && 'px-0 pb-0')}>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : fields.length === 0 ? (
          <EmptyState
            icon={FormInput}
            title="Chưa có trường tuỳ chỉnh"
            description="Vd size áo đồng phục, biển số xe, ngày khám sức khoẻ"
            className="py-10"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-5" />
                <TableHead>Tên trường</TableHead>
                <TableHead>Kiểu</TableHead>
                <TableHead>Nhóm</TableHead>
                <TableHead>Tuỳ chọn</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f, i) => (
                <TableRow key={f.id} className={cn(!f.isActive && 'text-muted-foreground')}>
                  <TableCell className="pl-3">
                    <div className="flex">
                      <Button variant="ghost" size="icon-sm" aria-label="Lên" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Xuống"
                        disabled={i === fields.length - 1 || reorder.isPending}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn(f.isActive && 'font-medium')}>
                      {f.label}
                      {f.required && <span className="ml-0.5 text-destructive">*</span>}
                    </div>
                    <CodeTag>{f.key}</CodeTag>
                  </TableCell>
                  <TableCell>
                    {CUSTOM_TYPE_LABEL[f.type as CustomFieldType]}
                    {f.options.length > 0 && (
                      <div className="max-w-56 truncate text-xs text-muted-foreground">{f.options.join(', ')}</div>
                    )}
                  </TableCell>
                  <TableCell>{f.section}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[!f.isActive && 'Đã ẩn', f.showInList && 'Cột danh sách', f.sensitive && 'Nhạy cảm'].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell className="pr-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(f)}>
                          <Pencil /> Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggle.mutate(f)}>
                          <Power /> {f.isActive ? 'Ẩn khỏi hồ sơ' : 'Dùng lại'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          destructive
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Xoá trường ${f.label}?`,
                              description: 'Dữ liệu đã nhập không hiện nữa. Muốn giữ lại để dùng sau thì chọn Ẩn khỏi hồ sơ',
                              destructive: true,
                            });
                            if (ok) remove.mutate(f.id);
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
        )}
      </CardContent>
      <FieldDialog open={open} onOpenChange={setOpen} field={editing} sections={sections.length ? sections : [DEFAULT_SECTION]} />
    </Card>
  );
}
