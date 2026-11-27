'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageUp, Trash2 } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, fileUrl, upload } from '@/lib/api';
import { DEFAULT_PRIMARY, primaryCss } from '@/lib/branding';
import { cn } from '@/lib/utils';
import { SettingsCard, useLoadForm, useSaveSettings, useSettings } from '../_components/settings-kit';

const schema = z.object({
  appName: z.string().trim().min(1, 'Vui lòng nhập tên hiển thị').max(40, 'Tối đa 40 ký tự'),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Màu ở dạng #RRGGBB'),
  loginTitle: z.string().trim().max(120),
  loginSubtitle: z.string().trim().max(255),
  appUrl: z
    .string()
    .trim()
    .max(255)
    .refine((v) => !v || /^https?:\/\/\S+$/.test(v), 'Địa chỉ phải bắt đầu bằng http:// hoặc https://'),
});
type Values = z.infer<typeof schema>;

const SWATCHES = ['#0049EA', '#0F766E', '#15803D', '#B45309', '#BE123C', '#7C3AED', '#0E7490', '#334155'];

function ImageSlot({
  kind,
  label,
  hint,
  url,
}: {
  kind: 'logo' | 'favicon';
  label: string;
  hint: string;
  url?: string;
}) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ['settings'] });
    qc.invalidateQueries({ queryKey: ['branding'] });
    toast.success(msg);
  };
  const up = useMutation({
    mutationFn: (f: File) => upload(`/settings/branding/${kind}`, f),
    onSuccess: () => done(`Đã cập nhật ${label.toLowerCase()}`),
  });
  const del = useMutation({
    mutationFn: () => api(`/settings/branding/${kind}`, { method: 'DELETE' }),
    onSuccess: () => done(`Đã dùng lại ${label.toLowerCase()} mặc định`),
  });
  const src = fileUrl(url) ?? (kind === 'logo' ? '/logo.png' : '/favicon.ico');

  return (
    <div className="flex items-center gap-4">
      <div className="grid size-16 shrink-0 place-items-center rounded-xl border bg-muted/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className={cn('object-contain', kind === 'logo' ? 'size-12' : 'size-8')} />
      </div>
      <div className="grid gap-1.5">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" loading={up.isPending} onClick={() => input.current?.click()}>
            <ImageUp /> Tải ảnh lên
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" loading={del.isPending} onClick={() => del.mutate()}>
              <Trash2 /> Dùng mặc định
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 2 * 1024 * 1024) return toast.error('Ảnh tối đa 2 MB');
            up.mutate(f);
          }}
        />
      </div>
    </div>
  );
}

export default function BrandingSettingsPage() {
  const { data, isLoading } = useSettings();
  const save = useSaveSettings('branding');
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = form;
  const saved = data?.branding as (Partial<Values> & Values & { logoUrl: string; faviconUrl: string }) | undefined;
  const initial = useMemo(
    () =>
      saved && {
        appName: saved.appName,
        primaryColor: saved.primaryColor,
        loginTitle: saved.loginTitle,
        loginSubtitle: saved.loginSubtitle,
        appUrl: saved.appUrl ?? '',
      },
    [saved],
  );
  useLoadForm(form, initial);

  const color = watch('primaryColor') || DEFAULT_PRIMARY;
  const validColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_PRIMARY;
  const name = watch('appName') || 'eHRM';

  return (
    <div className="grid gap-6">
      <SettingsCard title="Logo và biểu tượng" description="PNG, JPG, WEBP hoặc ICO, tối đa 2 MB. Nên dùng ảnh vuông, nền trong suốt" loading={isLoading} className="sm:grid-cols-2">
        <ImageSlot kind="logo" label="Logo" hint="Hiện ở menu, trang đăng nhập, thẻ nhân viên" url={saved?.logoUrl} />
        <ImageSlot kind="favicon" label="Biểu tượng tab" hint="Hiện trên tab trình duyệt, nên 64×64" url={saved?.faviconUrl} />
      </SettingsCard>

      <form id="branding-form" onSubmit={handleSubmit((v) => save.mutate(v, { onSuccess: () => form.reset(v) }))}>
        <SettingsCard
          title="Tên và màu"
          formId="branding-form"
          dirty={isDirty}
          saving={save.isPending}
          onReset={() => form.reset()}
          loading={isLoading}
          className="lg:grid-cols-[1fr_280px]"
        >
          <div className="grid gap-5">
            <FormField label="Tên hiển thị" htmlFor="appName" required error={errors.appName?.message} hint="Thay chữ eHRM ở menu, tab trình duyệt, email">
              <Input id="appName" aria-invalid={!!errors.appName} {...register('appName')} />
            </FormField>
            <FormField label="Màu chủ đạo" error={errors.primaryColor?.message} hint="Dùng cho nút chính, mục đang chọn, liên kết">
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-label={s}
                    onClick={() => setValue('primaryColor', s, { shouldDirty: true, shouldValidate: true })}
                    className={cn(
                      'pressable size-7 rounded-full ring-offset-2 ring-offset-card',
                      s.toLowerCase() === color.toLowerCase() && 'ring-2 ring-foreground/40',
                    )}
                    style={{ background: s }}
                  />
                ))}
                <label className="relative ml-1 size-7 cursor-pointer overflow-hidden rounded-full border" title="Chọn màu khác">
                  <input
                    type="color"
                    value={validColor}
                    onChange={(e) => setValue('primaryColor', e.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
                    className="absolute -inset-2 size-12 cursor-pointer"
                  />
                </label>
                <Input className="h-8 w-28 font-mono uppercase" aria-invalid={!!errors.primaryColor} {...register('primaryColor')} />
              </div>
            </FormField>
            <FormField label="Tiêu đề trang đăng nhập" htmlFor="loginTitle">
              <Input id="loginTitle" placeholder="Đăng nhập" {...register('loginTitle')} />
            </FormField>
            <FormField label="Dòng mô tả dưới tiêu đề" htmlFor="loginSubtitle">
              <Input id="loginSubtitle" {...register('loginSubtitle')} />
            </FormField>
            <FormField
              label="Địa chỉ truy cập hệ thống"
              htmlFor="appUrl"
              error={errors.appUrl?.message}
              hint="Dùng để tạo link trong email mời và đặt lại mật khẩu. Bỏ trống thì lấy theo cấu hình máy chủ"
            >
              <div className="flex gap-2">
                <Input id="appUrl" placeholder="https://hr.congty.vn" className="font-mono" aria-invalid={!!errors.appUrl} {...register('appUrl')} />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue('appUrl', window.location.origin, { shouldDirty: true, shouldValidate: true })}
                >
                  Dùng địa chỉ này
                </Button>
              </div>
            </FormField>
          </div>

          {/* Xem trước: ghi đè màu chủ đạo trong phạm vi khung này */}
          <div className="grid content-start gap-2">
            <div className="text-xs text-muted-foreground">Xem trước</div>
            <style>{primaryCss(validColor).replace(':root', '.brand-preview').replace(/\.dark\{[^}]*\}/, '')}</style>
            <div className="brand-preview overflow-hidden rounded-xl border bg-background">
              <div className="flex items-center gap-2 border-b bg-sidebar px-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(saved?.logoUrl) ?? '/logo.png'} alt="" className="size-6 object-contain" />
                <span className="truncate text-sm font-semibold">{name}</span>
              </div>
              <div className="grid gap-1 p-2 text-sm">
                <div className="rounded-md border bg-card px-2.5 py-1.5 font-medium">Nhân viên</div>
                <div className="px-2.5 py-1.5 text-muted-foreground">Phòng ban</div>
                <div className="px-2.5 py-1.5 text-muted-foreground">Chức vụ</div>
              </div>
              <div className="flex items-center gap-2 border-t p-3">
                <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Thêm nhân viên</span>
                <span className="text-sm text-primary underline-offset-2 hover:underline">Xem hồ sơ</span>
              </div>
            </div>
          </div>
        </SettingsCard>
      </form>
    </div>
  );
}
