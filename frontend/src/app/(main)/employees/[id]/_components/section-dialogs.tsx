'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm, type DefaultValues, type FieldValues, type Path } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useCatalogOptions } from '@/lib/queries';
import { MARITAL_LABEL, toOptions, type Employee } from '@/lib/types';

export type SectionKey = 'personal' | 'emergency' | 'tax' | 'bank';

const opt = (re: RegExp, msg: string) => z.string().trim().refine((v) => !v || re.test(v), msg);
const today = () => new Date().toISOString().slice(0, 10);

/** Bỏ dấu, viết hoa: "Lê Minh Cường" → "LE MINH CUONG" (tên chủ tài khoản ngân hàng) */
export const toAccountName = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase().replace(/\s+/g, ' ').trim();

/* ---------- schema từng nhóm ---------- */

const personalSchema = z.object({
  maritalStatus: z.string(),
  nationality: z.string().trim().max(100),
  ethnicityId: z.string(),
  religionId: z.string(),
  educationLevelId: z.string(),
  hometownProvinceId: z.string(),
  identityNumber: opt(/^\d{12}$/, 'Số CCCD gồm 12 chữ số'),
  identityIssuedDate: z.string(),
  identityIssuedPlace: z.string().trim().max(255),
  permanentAddress: z.string().trim().max(500),
  address: z.string().trim().max(500),
});

const emergencySchema = z.object({
  emergencyContactName: z.string().trim().max(255),
  emergencyContactRelation: z.string().trim().max(50),
  emergencyContactPhone: opt(/^[0-9+\-\s()]{8,20}$/, 'Số điện thoại không hợp lệ'),
});

const taxSchema = z.object({
  personalTaxCode: opt(/^(\d{12}|\d{10}(-?\d{3})?)$/, 'MST là số CCCD 12 số, hoặc MST cũ 10 hay 13 số'),
  socialInsuranceNumber: opt(/^\d{10}$/, 'Mã số BHXH gồm 10 chữ số'),
  healthInsurancePlace: z.string().trim().max(255),
});

const bankSchema = z.object({
  bankId: z.string(),
  bankAccountNumber: opt(/^\d{6,19}$/, 'Số tài khoản gồm 6 đến 19 chữ số'),
  bankAccountName: z.string().trim().max(255),
  bankBranch: z.string().trim().max(255),
});

const pick = <T extends Record<string, unknown>>(e: Employee, keys: (keyof T)[]) =>
  Object.fromEntries(keys.map((k) => [k, (e as unknown as Record<string, unknown>)[k as string] ?? ''])) as T;

/* ---------- khung chung ---------- */

function SectionDialog<T extends FieldValues>({
  open,
  onOpenChange,
  employee,
  title,
  description,
  schema,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee;
  title: string;
  description?: string;
  schema: z.ZodType<T, T>;
  children: (form: ReturnType<typeof useForm<T>>) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const keys = Object.keys((schema as unknown as z.ZodObject).shape) as (keyof T)[];
  const form = useForm<T>({ resolver: zodResolver(schema) as never });

  useEffect(() => {
    if (open) form.reset(pick<T>(employee, keys) as DefaultValues<T>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee]);

  const save = useMutation({
    mutationFn: (v: T) =>
      api<Employee>(`/employees/${employee.id}`, {
        method: 'PATCH',
        // Ô trống gửi null để xoá giá trị cũ
        body: Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val === '' ? null : val])),
      }),
    onSuccess: (saved) => {
      qc.setQueryData(['employees', 'detail', employee.id], saved);
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Đã lưu thay đổi');
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogBody>
          <form id="section-form" onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
            {children(form)}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="section-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CatalogField<T extends FieldValues>({
  form,
  name,
  label,
  type,
  placeholder,
}: {
  form: ReturnType<typeof useForm<T>>;
  name: Path<T>;
  label: string;
  type: Parameters<typeof useCatalogOptions>[0];
  placeholder: string;
}) {
  const { data = [], isLoading } = useCatalogOptions(type);
  return (
    <FormField label={label}>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Combobox
            value={field.value}
            onChange={field.onChange}
            options={data}
            loading={isLoading}
            placeholder={placeholder}
            searchPlaceholder="Tìm…"
          />
        )}
      />
    </FormField>
  );
}

/* ---------- các hộp thoại ---------- */

export function SectionDialogs({
  section,
  onClose,
  employee,
}: {
  section: SectionKey | null;
  onClose: () => void;
  employee: Employee;
}) {
  const common = { employee, onOpenChange: (o: boolean) => !o && onClose() };

  return (
    <>
      <SectionDialog {...common} open={section === 'personal'} title="Thông tin cá nhân" schema={personalSchema}>
        {(f) => {
          const err = f.formState.errors;
          return (
            <>
              <FormField label="Tình trạng hôn nhân">
                <Controller
                  control={f.control}
                  name="maritalStatus"
                  render={({ field }) => (
                    <Select value={field.value} onChange={field.onChange} options={toOptions(MARITAL_LABEL)} clearable clearLabel="—" placeholder="Chọn" />
                  )}
                />
              </FormField>
              <FormField label="Quốc tịch" htmlFor="nationality">
                <Input id="nationality" {...f.register('nationality')} />
              </FormField>
              <CatalogField form={f} name="ethnicityId" label="Dân tộc" type="ETHNICITY" placeholder="Chọn dân tộc" />
              <CatalogField form={f} name="religionId" label="Tôn giáo" type="RELIGION" placeholder="Chọn tôn giáo" />
              <CatalogField form={f} name="educationLevelId" label="Trình độ học vấn" type="EDUCATION" placeholder="Chọn trình độ" />
              <CatalogField form={f} name="hometownProvinceId" label="Quê quán" type="PROVINCE" placeholder="Chọn tỉnh/thành" />

              <div className="mt-2 border-t pt-4 text-sm font-medium sm:col-span-2">Căn cước công dân</div>
              <FormField label="Số CCCD" htmlFor="identityNumber" error={err.identityNumber?.message} className="sm:col-span-2">
                <Input id="identityNumber" inputMode="numeric" className="font-mono" aria-invalid={!!err.identityNumber} {...f.register('identityNumber')} />
              </FormField>
              <FormField label="Ngày cấp" htmlFor="identityIssuedDate">
                <Input id="identityIssuedDate" type="date" max={today()} {...f.register('identityIssuedDate')} />
              </FormField>
              <FormField label="Nơi cấp" htmlFor="identityIssuedPlace">
                <Input id="identityIssuedPlace" placeholder="Bộ Công an" {...f.register('identityIssuedPlace')} />
              </FormField>

              <div className="mt-2 border-t pt-4 text-sm font-medium sm:col-span-2">Địa chỉ</div>
              <FormField label="Thường trú" htmlFor="permanentAddress" className="sm:col-span-2">
                <Textarea id="permanentAddress" rows={2} {...f.register('permanentAddress')} />
              </FormField>
              <FormField label="Nơi ở hiện tại" htmlFor="address" className="sm:col-span-2">
                <Textarea id="address" rows={2} {...f.register('address')} />
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => f.setValue('address', f.getValues('permanentAddress'), { shouldDirty: true })}
                >
                  Giống địa chỉ thường trú
                </button>
              </FormField>
            </>
          );
        }}
      </SectionDialog>

      <SectionDialog {...common} open={section === 'emergency'} title="Liên hệ khẩn cấp" description="Người cần báo khi có sự cố" schema={emergencySchema}>
        {(f) => (
          <>
            <FormField label="Họ tên" htmlFor="emergencyContactName" className="sm:col-span-2">
              <Input id="emergencyContactName" autoFocus {...f.register('emergencyContactName')} />
            </FormField>
            <FormField label="Quan hệ" htmlFor="emergencyContactRelation">
              <Input id="emergencyContactRelation" placeholder="Vợ, chồng, bố, mẹ…" {...f.register('emergencyContactRelation')} />
            </FormField>
            <FormField label="Số điện thoại" htmlFor="emergencyContactPhone" error={f.formState.errors.emergencyContactPhone?.message}>
              <Input id="emergencyContactPhone" type="tel" className="font-mono" {...f.register('emergencyContactPhone')} />
            </FormField>
          </>
        )}
      </SectionDialog>

      <SectionDialog {...common} open={section === 'tax'} title="Thuế và bảo hiểm" schema={taxSchema}>
        {(f) => {
          const err = f.formState.errors;
          return (
            <>
              <FormField
                label="Mã số thuế cá nhân"
                htmlFor="personalTaxCode"
                error={err.personalTaxCode?.message}
                hint="Từ 1/7/2025, MST cá nhân là số CCCD"
                className="sm:col-span-2"
              >
                <div className="flex gap-2">
                  <Input id="personalTaxCode" inputMode="numeric" className="font-mono" aria-invalid={!!err.personalTaxCode} {...f.register('personalTaxCode')} />
                  {employee.identityNumber && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => f.setValue('personalTaxCode', employee.identityNumber!, { shouldDirty: true, shouldValidate: true })}
                    >
                      Dùng số CCCD
                    </Button>
                  )}
                </div>
              </FormField>
              <FormField label="Mã số BHXH" htmlFor="socialInsuranceNumber" error={err.socialInsuranceNumber?.message} hint="10 chữ số, in trên sổ hoặc thẻ BHYT">
                <Input id="socialInsuranceNumber" inputMode="numeric" className="font-mono" aria-invalid={!!err.socialInsuranceNumber} {...f.register('socialInsuranceNumber')} />
              </FormField>
              <FormField label="Nơi khám chữa bệnh ban đầu" htmlFor="healthInsurancePlace">
                <Input id="healthInsurancePlace" {...f.register('healthInsurancePlace')} />
              </FormField>
            </>
          );
        }}
      </SectionDialog>

      <SectionDialog {...common} open={section === 'bank'} title="Tài khoản nhận lương" schema={bankSchema}>
        {(f) => {
          const err = f.formState.errors;
          return (
            <>
              <div className="sm:col-span-2">
                <CatalogField form={f} name="bankId" label="Ngân hàng" type="BANK" placeholder="Chọn ngân hàng" />
              </div>
              <FormField label="Số tài khoản" htmlFor="bankAccountNumber" error={err.bankAccountNumber?.message}>
                <Input id="bankAccountNumber" inputMode="numeric" className="font-mono" aria-invalid={!!err.bankAccountNumber} {...f.register('bankAccountNumber')} />
              </FormField>
              <FormField label="Chi nhánh" htmlFor="bankBranch">
                <Input id="bankBranch" {...f.register('bankBranch')} />
              </FormField>
              <FormField label="Chủ tài khoản" htmlFor="bankAccountName" hint="Viết hoa không dấu, đúng như trên thẻ" className="sm:col-span-2">
                <div className="flex gap-2">
                  <Input
                    id="bankAccountName"
                    className="uppercase"
                    {...f.register('bankAccountName', { setValueAs: (v: string) => toAccountName(v ?? '') })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => f.setValue('bankAccountName', toAccountName(employee.fullName), { shouldDirty: true })}
                  >
                    Theo họ tên
                  </Button>
                </div>
              </FormField>
            </>
          );
        }}
      </SectionDialog>
    </>
  );
}
