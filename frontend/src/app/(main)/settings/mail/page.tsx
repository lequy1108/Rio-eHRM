'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { SettingsCard, ToggleRow, useLoadForm, useSaveSettings, useSettings } from '../_components/settings-kit';

const optEmail = z.string().trim().refine((v) => !v || z.email().safeParse(v).success, 'Email không hợp lệ');

const schema = z
  .object({
    enabled: z.boolean(),
    host: z.string().trim().max(255),
    port: z.coerce.number<string | number>().int('Cổng phải là số nguyên').min(1, 'Cổng từ 1 đến 65535').max(65535, 'Cổng từ 1 đến 65535'),
    secure: z.boolean(),
    user: z.string().trim().max(255),
    pass: z.string().max(255),
    fromName: z.string().trim().max(100),
    fromEmail: optEmail,
  })
  .refine((v) => !v.enabled || !!v.host, { path: ['host'], message: 'Nhập máy chủ SMTP để bật gửi email' });
type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;

const PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true },
  { label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  { label: 'Zoho', host: 'smtp.zoho.com', port: 465, secure: true },
];

export default function MailSettingsPage() {
  const { user } = useAuth();
  const { data, isLoading } = useSettings();
  const save = useSaveSettings('mail');
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(schema) });
  const { register, control, handleSubmit, setValue, watch, formState: { errors, isDirty } } = form;
  useLoadForm(form, data?.mail as In | undefined);
  const passSet = !!data?.mail?.passSet;
  const enabled = !!watch('enabled');
  const [to, setTo] = useState('');

  const test = useMutation({
    mutationFn: () => api<{ message: string }>('/settings/mail/test', { method: 'POST', body: { to: to || user?.email } }),
    onSuccess: (r) => toast.success(r.message),
  });

  const preset = (p: (typeof PRESETS)[number]) => {
    setValue('host', p.host, { shouldDirty: true });
    setValue('port', p.port, { shouldDirty: true });
    setValue('secure', p.secure, { shouldDirty: true });
  };

  return (
    <div className="grid gap-6">
      <form id="mail-form" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: (d) => form.reset(d as In) }))}>
        <SettingsCard
          title="Máy chủ gửi email (SMTP)"
          description="Dùng cho email nhắc việc và thông báo. Chưa bật thì hệ thống dùng cấu hình MAIL_* trong file .env, nếu có"
          formId="mail-form"
          dirty={isDirty}
          saving={save.isPending}
          onReset={() => form.reset()}
          loading={isLoading}
          className="sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => <ToggleRow id="enabled" checked={!!field.value} onChange={field.onChange} label="Bật gửi email" />}
            />
          </div>
          <fieldset disabled={!enabled} className="grid gap-5 disabled:opacity-60 sm:col-span-2 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
              Điền nhanh
              {PRESETS.map((p) => (
                <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => preset(p)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <FormField label="Máy chủ" htmlFor="host" error={errors.host?.message}>
              <Input id="host" className="font-mono" placeholder="smtp.congty.vn" aria-invalid={!!errors.host} {...register('host')} />
            </FormField>
            <div className="grid grid-cols-[1fr_auto] items-end gap-4">
              <FormField label="Cổng" htmlFor="port" error={errors.port?.message}>
                <Input id="port" type="number" className="font-mono" aria-invalid={!!errors.port} {...register('port')} />
              </FormField>
              <div className="pb-2">
                <Controller
                  control={control}
                  name="secure"
                  render={({ field }) => <ToggleRow id="secure" checked={!!field.value} onChange={field.onChange} label="SSL/TLS" />}
                />
              </div>
            </div>
            <FormField label="Tên đăng nhập" htmlFor="user">
              <Input id="user" autoComplete="off" {...register('user')} />
            </FormField>
            <FormField
              label="Mật khẩu"
              htmlFor="pass"
              hint={passSet ? 'Đã lưu mật khẩu. Để trống nếu không đổi' : 'Với Gmail, dùng mật khẩu ứng dụng (App password)'}
            >
              <PasswordInput id="pass" autoComplete="new-password" placeholder={passSet ? '••••••••' : ''} {...register('pass')} />
            </FormField>
            <FormField label="Tên người gửi" htmlFor="fromName" hint="Để trống thì dùng tên ứng dụng">
              <Input id="fromName" {...register('fromName')} />
            </FormField>
            <FormField label="Email người gửi" htmlFor="fromEmail" error={errors.fromEmail?.message} hint="Để trống thì dùng tên đăng nhập">
              <Input id="fromEmail" type="email" aria-invalid={!!errors.fromEmail} {...register('fromEmail')} />
            </FormField>
          </fieldset>
        </SettingsCard>
      </form>

      <SettingsCard title="Gửi thử" description="Gửi một email với cấu hình đã lưu để kiểm tra">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" placeholder={user?.email} value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-80" />
          <Button variant="outline" loading={test.isPending} disabled={isDirty || !data?.mail?.enabled} onClick={() => test.mutate()}>
            <Send /> Gửi email thử
          </Button>
        </div>
        {isDirty && <p className="text-xs text-muted-foreground">Lưu thay đổi trước khi gửi thử</p>}
        {!isDirty && !data?.mail?.enabled && <p className="text-xs text-muted-foreground">Bật gửi email và lưu trước khi gửi thử</p>}
      </SettingsCard>
    </div>
  );
}
