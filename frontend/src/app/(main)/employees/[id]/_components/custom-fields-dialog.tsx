'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { isEmptyValue } from '@/lib/custom-fields';
import type { CustomField, Employee } from '@/lib/types';

type Values = Record<string, unknown>;

/** Ô nhập cho một trường tuỳ chỉnh, theo kiểu dữ liệu */
export function CustomFieldInput({
  field: f,
  value,
  onChange,
  invalid,
}: {
  field: CustomField;
  value: unknown;
  onChange: (v: unknown) => void;
  invalid?: boolean;
}) {
  const id = `cf-${f.key}`;
  switch (f.type) {
    case 'TEXTAREA':
      return <Textarea id={id} rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} />;
    case 'NUMBER':
      return (
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className="font-mono"
          value={value === null || value === undefined ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid}
        />
      );
    case 'DATE':
      return <Input id={id} type="date" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} />;
    case 'SELECT':
      return (
        <Select
          value={String(value ?? '')}
          onChange={onChange}
          options={f.options.map((o) => ({ value: o, label: o }))}
          clearable
          clearLabel="—"
          placeholder="Chọn"
        />
      );
    case 'BOOLEAN':
      return (
        <Select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(v) => onChange(v === '' ? null : v === 'true')}
          options={[
            { value: 'true', label: 'Có' },
            { value: 'false', label: 'Không' },
          ]}
          clearable
          clearLabel="—"
          placeholder="Chọn"
        />
      );
    case 'MULTISELECT': {
      const list = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {f.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={list.includes(o)}
                onCheckedChange={(c) => onChange(c ? [...list, o] : list.filter((x) => x !== o))}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <Input id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} />;
  }
}

export function CustomFieldsDialog({
  employee,
  fields,
  title,
  open,
  onOpenChange,
}: {
  employee: Employee;
  fields: CustomField[];
  title: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setValues(Object.fromEntries(fields.map((f) => [f.key, employee.customFields?.[f.key] ?? null])));
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useMutation({
    mutationFn: (customFields: Values) =>
      api<Employee>(`/employees/${employee.id}`, { method: 'PATCH', body: { customFields } }),
    onSuccess: (saved) => {
      qc.setQueryData(['employees', 'detail', employee.id], saved);
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Đã lưu thay đổi');
      onOpenChange(false);
    },
  });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    const body: Values = {};
    for (const f of fields) {
      let v = values[f.key];
      if (typeof v === 'string') v = v.trim();
      if (f.type === 'NUMBER' && !isEmptyValue(v)) {
        const n = Number(v);
        if (!Number.isFinite(n)) errs[f.key] = 'Phải là số';
        else v = n;
      }
      if (f.required && isEmptyValue(v)) errs[f.key] = `Vui lòng nhập ${f.label.toLowerCase()}`;
      body[f.key] = isEmptyValue(v) ? null : v;
    }
    setErrors(errs);
    if (!Object.keys(errs).length) save.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="custom-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <FormField
                key={f.id}
                label={f.label}
                htmlFor={`cf-${f.key}`}
                required={f.required}
                hint={f.hint ?? undefined}
                error={errors[f.key]}
                className={f.type === 'TEXTAREA' || f.type === 'MULTISELECT' ? 'sm:col-span-2' : undefined}
              >
                <CustomFieldInput
                  field={f}
                  value={values[f.key]}
                  invalid={!!errors[f.key]}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                />
              </FormField>
            ))}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="custom-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
