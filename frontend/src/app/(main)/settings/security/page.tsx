'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { passwordHint } from '@/lib/branding';
import { SettingsCard, ToggleRow, useLoadForm, useSaveSettings, useSettings } from '../_components/settings-kit';

const int = (min: number, max: number, label: string) =>
  z.coerce.number<string | number>().int(`${label} phải là số nguyên`).min(min, `${label} tối thiểu ${min}`).max(max, `${label} tối đa ${max}`);

const schema = z.object({
  passwordMinLength: int(6, 64, 'Độ dài'),
  passwordRequireUpper: z.boolean(),
  passwordRequireNumber: z.boolean(),
  passwordRequireSymbol: z.boolean(),
  sessionHours: int(1, 2160, 'Thời gian'),
  maxLoginAttempts: int(0, 50, 'Số lần'),
  lockMinutes: int(1, 1440, 'Thời gian khoá'),
});
type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;

const SESSION = [
  { value: '8', label: '8 giờ (một ca làm việc)' },
  { value: '24', label: '1 ngày' },
  { value: '168', label: '7 ngày' },
  { value: '720', label: '30 ngày' },
];

export default function SecuritySettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings('security');
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(schema) });
  const { register, control, handleSubmit, watch, formState: { errors, isDirty } } = form;
  useLoadForm(form, data?.security as In | undefined);

  const preview = passwordHint({
    minLength: Number(watch('passwordMinLength')) || 0,
    requireUpper: !!watch('passwordRequireUpper'),
    requireNumber: !!watch('passwordRequireNumber'),
    requireSymbol: !!watch('passwordRequireSymbol'),
  });
  const session = String(watch('sessionHours') ?? '');

  return (
    <form id="security-form" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: (d) => form.reset(d as In) }))}>
      <div className="grid gap-6">
        <SettingsCard title="Mật khẩu" description="Áp dụng khi tạo tài khoản, đặt lại và đổi mật khẩu; mật khẩu cũ vẫn dùng được" loading={isLoading}>
          <FormField label="Độ dài tối thiểu" htmlFor="passwordMinLength" error={errors.passwordMinLength?.message} className="max-w-48">
            <Input id="passwordMinLength" type="number" min={6} max={64} aria-invalid={!!errors.passwordMinLength} {...register('passwordMinLength')} />
          </FormField>
          <div className="grid gap-3">
            {(
              [
                ['passwordRequireUpper', 'Có chữ hoa'],
                ['passwordRequireNumber', 'Có chữ số'],
                ['passwordRequireSymbol', 'Có ký tự đặc biệt', 'Vd ! @ # $ %'],
              ] as const
            ).map(([name, label, desc]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field }) => <ToggleRow id={name} checked={!!field.value} onChange={field.onChange} label={label} description={desc} />}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Người dùng sẽ thấy: {preview}</p>
        </SettingsCard>

        <SettingsCard
          title="Đăng nhập"
          loading={isLoading}
          className="sm:grid-cols-3"
          formId="security-form"
          dirty={isDirty}
          saving={save.isPending}
          onReset={() => form.reset()}
        >
          <FormField label="Giữ đăng nhập" error={errors.sessionHours?.message} hint="Áp dụng từ lần đăng nhập sau">
            <Controller
              control={control}
              name="sessionHours"
              render={({ field }) => (
                <Select
                  value={session}
                  onChange={field.onChange}
                  options={SESSION.some((s) => s.value === session) ? SESSION : [...SESSION, { value: session, label: `${session} giờ` }]}
                />
              )}
            />
          </FormField>
          <FormField label="Khoá sau số lần nhập sai" htmlFor="maxLoginAttempts" error={errors.maxLoginAttempts?.message} hint="0 = không khoá">
            <Input id="maxLoginAttempts" type="number" min={0} max={50} aria-invalid={!!errors.maxLoginAttempts} {...register('maxLoginAttempts')} />
          </FormField>
          <FormField label="Thời gian khoá (phút)" htmlFor="lockMinutes" error={errors.lockMinutes?.message} hint="Quản trị mở khoá sớm được ở trang Tài khoản">
            <Input id="lockMinutes" type="number" min={1} max={1440} aria-invalid={!!errors.lockMinutes} {...register('lockMinutes')} />
          </FormField>
        </SettingsCard>
      </div>
    </form>
  );
}
