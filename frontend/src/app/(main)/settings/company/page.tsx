'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { SettingsCard, useLoadForm, useSaveSettings, useSettings } from '../_components/settings-kit';

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên công ty').max(255),
  shortName: z.string().trim().max(100),
  taxCode: z.string().trim().max(20).refine((v) => !v || /^\d{10}(-\d{3})?$/.test(v), 'MST doanh nghiệp gồm 10 số, hoặc 10 số kèm -XXX cho chi nhánh'),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(30),
  email: z.string().trim().refine((v) => !v || z.email().safeParse(v).success, 'Email không hợp lệ'),
  website: z.string().trim().max(255),
  representativeName: z.string().trim().max(255),
  representativeTitle: z.string().trim().max(100),
});
type Values = z.infer<typeof schema>;

export default function CompanySettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings('company');
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, formState: { errors, isDirty } } = form;
  useLoadForm(form, data?.company as Values | undefined);

  return (
    <form id="company-form" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: (d) => form.reset(d as Values) }))}>
      <SettingsCard
        title="Thông tin công ty"
        description="Hiện trên trang đăng nhập, email gửi đi và các mẫu giấy tờ sau này"
        formId="company-form"
        dirty={isDirty}
        saving={save.isPending}
        onReset={() => form.reset()}
        loading={isLoading}
        className="sm:grid-cols-2"
      >
        <FormField label="Tên công ty" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
        </FormField>
        <FormField label="Tên viết tắt" htmlFor="shortName">
          <Input id="shortName" {...register('shortName')} />
        </FormField>
        <FormField label="Mã số thuế" htmlFor="taxCode" error={errors.taxCode?.message}>
          <Input id="taxCode" inputMode="numeric" className="font-mono" aria-invalid={!!errors.taxCode} {...register('taxCode')} />
        </FormField>
        <FormField label="Địa chỉ" htmlFor="address" className="sm:col-span-2">
          <Textarea id="address" rows={2} {...register('address')} />
        </FormField>
        <FormField label="Số điện thoại" htmlFor="phone">
          <Input id="phone" type="tel" className="font-mono" {...register('phone')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
        </FormField>
        <FormField label="Website" htmlFor="website" className="sm:col-span-2">
          <Input id="website" placeholder="https://" {...register('website')} />
        </FormField>
        <div className="mt-2 border-t pt-4 text-sm font-medium sm:col-span-2">Người đại diện ký hợp đồng</div>
        <FormField label="Họ tên" htmlFor="representativeName" hint="Tự điền vào hợp đồng mới, sửa được từng hợp đồng">
          <Input id="representativeName" {...register('representativeName')} />
        </FormField>
        <FormField label="Chức vụ" htmlFor="representativeTitle">
          <Input id="representativeTitle" placeholder="Giám đốc" {...register('representativeTitle')} />
        </FormField>
      </SettingsCard>
    </form>
  );
}
