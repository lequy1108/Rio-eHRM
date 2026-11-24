'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmployeePicker } from '@/components/employee-picker';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useCatalogOptions, useDepartmentOptions, usePositionOptions } from '@/lib/queries';
import { SKILL_LEVEL_LABEL, type CatalogType, type EmployeeChild } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/confirm-provider';

export type Values = Record<string, unknown>;

export interface FieldSpec<T> {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'money' | 'select' | 'catalog' | 'level' | 'department' | 'position' | 'employee';
  options?: { value: string; label: string }[];
  catalogType?: CatalogType;
  required?: boolean;
  /** Chiếm cả hàng */
  wide?: boolean;
  hint?: string;
  placeholder?: string;
  /** Gợi ý cho ô chữ (người dùng vẫn gõ tự do) */
  suggestions?: string[];
  show?: (v: Values) => boolean;
  disabled?: (item: T | null) => boolean;
  /** Nhãn hiển thị sẵn cho ô chọn nhân viên khi sửa */
  selectedLabel?: (item: T | null) => string | undefined;
}

export interface ItemView {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  aside?: React.ReactNode;
  muted?: boolean;
}

/** Mức 1–5 dạng chấm, bấm lại chấm đang chọn để bỏ */
export function LevelDots({ value, onChange }: { value?: number | null; onChange?: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={value ? SKILL_LEVEL_LABEL[value] : 'Chưa đánh giá'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          title={SKILL_LEVEL_LABEL[n]}
          onClick={() => onChange?.(value === n ? null : n)}
          className={cn(
            'size-2.5 rounded-full transition-colors',
            n <= (value ?? 0) ? 'bg-foreground/70' : 'bg-foreground/12',
            onChange && 'size-4 cursor-pointer hover:bg-foreground/40',
          )}
        />
      ))}
      {onChange && <span className="ml-1 text-xs text-muted-foreground">{value ? SKILL_LEVEL_LABEL[value] : 'Chưa chọn'}</span>}
    </div>
  );
}

function CatalogInput({ type, value, onChange }: { type: CatalogType; value: string; onChange: (v: string) => void }) {
  const { data = [], isLoading } = useCatalogOptions(type);
  return <Combobox value={value} onChange={onChange} options={data} loading={isLoading} placeholder="Chọn" searchPlaceholder="Tìm…" />;
}
function DepartmentInput(p: { value: string; onChange: (v: string) => void }) {
  const { data = [], isLoading } = useDepartmentOptions();
  return <Combobox {...p} options={data} loading={isLoading} placeholder="Chọn phòng ban" searchPlaceholder="Tìm…" />;
}
function PositionInput(p: { value: string; onChange: (v: string) => void }) {
  const { data = [], isLoading } = usePositionOptions();
  return <Combobox {...p} options={data} loading={isLoading} placeholder="Chọn chức vụ" searchPlaceholder="Tìm…" />;
}

function FieldInput<T>({
  f,
  value,
  set,
  item,
  invalid,
}: {
  f: FieldSpec<T>;
  value: unknown;
  set: (v: unknown) => void;
  item: T | null;
  invalid?: boolean;
}) {
  const id = `f-${f.name}`;
  const str = value === null || value === undefined ? '' : String(value);
  const disabled = f.disabled?.(item);
  switch (f.type) {
    case 'textarea':
      return <Textarea id={id} rows={3} value={str} disabled={disabled} onChange={(e) => set(e.target.value)} aria-invalid={invalid} />;
    case 'date':
      return <Input id={id} type="date" value={str} disabled={disabled} onChange={(e) => set(e.target.value)} aria-invalid={invalid} />;
    case 'money':
      return (
        <Input
          id={id}
          inputMode="numeric"
          className="font-mono"
          disabled={disabled}
          placeholder={f.placeholder}
          value={str ? new Intl.NumberFormat('vi-VN').format(Number(str)) : ''}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            set(digits ? Number(digits) : '');
          }}
          aria-invalid={invalid}
        />
      );
    case 'select':
      return <Select value={str} onChange={set} options={f.options ?? []} placeholder="Chọn" />;
    case 'catalog':
      return <CatalogInput type={f.catalogType!} value={str} onChange={set} />;
    case 'department':
      return <DepartmentInput value={str} onChange={set} />;
    case 'position':
      return <PositionInput value={str} onChange={set} />;
    case 'employee':
      return <EmployeePicker id={id} value={str} onChange={set} selectedLabel={f.selectedLabel?.(item)} />;
    case 'level':
      return <LevelDots value={value as number | null} onChange={set} />;
    default:
      return (
        <>
          <Input
            id={id}
            value={str}
            disabled={disabled}
            placeholder={f.placeholder}
            list={f.suggestions ? `${id}-list` : undefined}
            onChange={(e) => set(e.target.value)}
            aria-invalid={invalid}
          />
          {f.suggestions && (
            <datalist id={`${id}-list`}>
              {f.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      );
  }
}

/**
 * Thẻ danh sách một loại bản ghi con của nhân viên (bằng cấp, kỹ năng, khen thưởng…)
 * kèm hộp thoại thêm/sửa sinh từ cấu hình `fields`. API: /employees/:id/<resource>
 */
export function ChildSection<T extends EmployeeChild>({
  employeeId,
  resource,
  title,
  description,
  noun,
  icon,
  emptyTitle,
  emptyDescription,
  canEdit,
  fields,
  defaults,
  toValues,
  validate,
  render,
  deleteWarning,
  dialogNote,
}: {
  employeeId: string;
  resource: string;
  title: string;
  description?: string;
  /** Danh từ trong nút và tiêu đề hộp thoại, vd "bằng cấp" */
  noun: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  canEdit: boolean;
  fields: FieldSpec<T>[];
  defaults: () => Values;
  toValues?: (item: T) => Values;
  validate?: (v: Values, item: T | null) => Record<string, string>;
  render: (item: T) => ItemView;
  deleteWarning?: (item: T) => string | undefined;
  dialogNote?: (item: T | null) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const key = ['employees', 'detail', employeeId, resource];
  const base = `/employees/${employeeId}/${resource}`;
  const { data = [], isLoading } = useQuery({ queryKey: key, queryFn: () => api<T[]>(base) });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      const v = toValues ? toValues(editing) : (editing as unknown as Values);
      setValues(Object.fromEntries(fields.map((f) => [f.name, v[f.name] ?? ''])));
    } else setValues(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });

  const save = useMutation({
    mutationFn: (body: Values) =>
      editing ? api<T>(`${base}/${editing.id}`, { method: 'PATCH', body }) : api<T>(base, { method: 'POST', body }),
    onSuccess: () => {
      toast.success(editing ? `Đã cập nhật ${noun}` : `Đã thêm ${noun}`);
      invalidate();
      setOpen(false);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`${base}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`Đã xoá ${noun}`);
      invalidate();
    },
  });

  const visible = fields.filter((f) => !f.show || f.show(values));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of visible) {
      const v = values[f.name];
      if (f.required && (v === '' || v === null || v === undefined)) errs[f.name] = `Vui lòng nhập ${f.label.toLowerCase()}`;
    }
    Object.assign(errs, validate?.(values, editing) ?? {});
    setErrors(errs);
    if (Object.keys(errs).length) return;
    // Thêm mới: bỏ ô trống. Sửa: ô trống gửi null để xoá giá trị cũ. Ô bị khoá không gửi
    const body: Values = {};
    for (const f of visible) {
      if (f.disabled?.(editing)) continue;
      const v = values[f.name];
      const empty = v === '' || v === undefined;
      if (empty && !editing) continue;
      body[f.name] = empty ? null : v;
    }
    save.mutate(body);
  };

  const openForm = (item: T | null) => {
    setEditing(item);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => openForm(null)}>
            <Plus /> Thêm
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn(data.length > 0 && 'px-0 pb-2')}>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} className="py-6" />
        ) : (
          <ul className="divide-y">
            {data.map((item) => {
              const v = render(item);
              return (
                <li key={item.id} className={cn('flex items-start gap-4 px-6 py-3', v.muted && 'text-muted-foreground')}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium break-words">{v.title}</div>
                    {v.subtitle && <div className="text-sm text-muted-foreground break-words">{v.subtitle}</div>}
                    {v.meta && <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{v.meta}</div>}
                  </div>
                  {v.aside && <div className="shrink-0 pt-0.5 text-right text-sm">{v.aside}</div>}
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="-mr-2 shrink-0" aria-label="Thao tác">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(item)}>
                          <Pencil /> Sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          destructive
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Xoá ${noun} này?`,
                              description: deleteWarning?.(item),
                              destructive: true,
                            });
                            if (ok) remove.mutate(item.id);
                          }}
                        >
                          <Trash2 /> Xoá
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Sửa ${noun}` : `Thêm ${noun}`}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {dialogNote?.(editing)}
            <form id={`form-${resource}`} onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              {visible.map((f) => (
                <FormField
                  key={f.name}
                  label={f.label}
                  htmlFor={`f-${f.name}`}
                  required={f.required}
                  hint={f.hint}
                  error={errors[f.name]}
                  className={f.wide || f.type === 'textarea' ? 'sm:col-span-2' : undefined}
                >
                  <FieldInput
                    f={f}
                    item={editing}
                    value={values[f.name]}
                    invalid={!!errors[f.name]}
                    set={(v) => setValues((s) => ({ ...s, [f.name]: v }))}
                  />
                </FormField>
              ))}
            </form>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" form={`form-${resource}`} loading={save.isPending}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
