'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CodeTag } from '@/components/code-tag';
import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SettingsCard, useLoadForm, useSaveSettings, useSettings } from '../_components/settings-kit';

const int = (min: number, max: number, label: string) =>
  z.coerce.number<string | number>().int(`${label} phải là số nguyên`).min(min, `${label} tối thiểu ${min}`).max(max, `${label} tối đa ${max}`);

const schema = z.object({
  codePrefix: z.string().trim().regex(/^[A-Za-z0-9_-]{0,10}$/, 'Chỉ gồm chữ không dấu, số, - và _, tối đa 10 ký tự'),
  codeLength: int(2, 10, 'Độ dài'),
  probationMonths: int(0, 12, 'Số tháng'),
  probationRemindDays: int(0, 60, 'Số ngày'),
  reminderHour: int(0, 23, 'Giờ'),
  avatarMaxMB: int(1, 20, 'Dung lượng'),
  defaultNationality: z.string().trim().max(100),
});
type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }));

export default function EmployeeSettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings('employee');
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = form;
  useLoadForm(form, data?.employee as In | undefined);

  const prefix = watch('codePrefix') ?? '';
  const len = Math.min(Math.max(Number(watch('codeLength')) || 4, 2), 10);
  const sample = (n: number) => `${prefix}${String(n).padStart(len, '0')}`;

  return (
    <form id="employee-form" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: (d) => form.reset(d as In) }))}>
      <div className="grid gap-6">
        <SettingsCard
          title="Mã nhân viên"
          description="Áp dụng cho nhân viên thêm mới và nhập từ Excel; mã đã cấp không đổi"
          loading={isLoading}
          className="sm:grid-cols-2"
        >
          <FormField label="Tiền tố" htmlFor="codePrefix" error={errors.codePrefix?.message}>
            <Input id="codePrefix" className="font-mono uppercase" aria-invalid={!!errors.codePrefix} {...register('codePrefix')} />
          </FormField>
          <FormField label="Số chữ số" htmlFor="codeLength" error={errors.codeLength?.message} hint="Đệm số 0 phía trước">
            <Input id="codeLength" type="number" min={2} max={10} aria-invalid={!!errors.codeLength} {...register('codeLength')} />
          </FormField>
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
            Mã sẽ có dạng <CodeTag>{sample(1)}</CodeTag> <CodeTag>{sample(2)}</CodeTag> <CodeTag>{sample(128)}</CodeTag>
          </div>
        </SettingsCard>

        <SettingsCard title="Thử việc" description="Hệ thống gửi email nhắc người có quyền sửa hồ sơ khi nhân viên sắp hết thử việc" loading={isLoading} className="sm:grid-cols-3">
          <FormField label="Thời gian thử việc (tháng)" htmlFor="probationMonths" error={errors.probationMonths?.message} hint="0 = không theo dõi">
            <Input id="probationMonths" type="number" min={0} max={12} aria-invalid={!!errors.probationMonths} {...register('probationMonths')} />
          </FormField>
          <FormField label="Nhắc trước (ngày)" htmlFor="probationRemindDays" error={errors.probationRemindDays?.message} hint="0 = không nhắc">
            <Input id="probationRemindDays" type="number" min={0} max={60} aria-invalid={!!errors.probationRemindDays} {...register('probationRemindDays')} />
          </FormField>
          <FormField label="Giờ gửi nhắc hằng ngày" error={errors.reminderHour?.message} hint="Giờ Việt Nam">
            <Select value={String(watch('reminderHour') ?? '')} onChange={(v) => setValue('reminderHour', v, { shouldDirty: true })} options={HOURS} />
          </FormField>
        </SettingsCard>

        <SettingsCard
          title="Hồ sơ"
          loading={isLoading}
          className="sm:grid-cols-2"
          formId="employee-form"
          dirty={isDirty}
          saving={save.isPending}
          onReset={() => form.reset()}
        >
          <FormField label="Quốc tịch mặc định" htmlFor="defaultNationality" hint="Tự điền khi thêm nhân viên mới">
            <Input id="defaultNationality" {...register('defaultNationality')} />
          </FormField>
          <FormField label="Dung lượng ảnh đại diện tối đa (MB)" htmlFor="avatarMaxMB" error={errors.avatarMaxMB?.message}>
            <Input id="avatarMaxMB" type="number" min={1} max={20} aria-invalid={!!errors.avatarMaxMB} {...register('avatarMaxMB')} />
          </FormField>
        </SettingsCard>
      </div>
    </form>
  );
}
