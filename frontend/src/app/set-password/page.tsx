'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '@/components/auth-shell';
import { FormField } from '@/components/form-field';
import { LogoMark } from '@/components/layout/sidebar';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useBranding } from '@/lib/branding';

interface TokenInfo {
  type: 'INVITE' | 'RESET';
  email: string;
  fullName: string | null;
}

const schema = z
  .object({
    password: z.string().min(1, 'Nhập mật khẩu mới'),
    confirm: z.string().min(1, 'Nhập lại mật khẩu'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Hai mật khẩu chưa khớp' });
type Values = z.infer<typeof schema>;

function SetPasswordForm() {
  const brand = useBranding();
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [error, setError] = useState('');
  const info = useQuery({
    queryKey: ['token-info', token],
    queryFn: () => api<TokenInfo>('/auth/token-info', { query: { token } }),
    enabled: !!token,
    retry: false,
  });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    setError('');
    try {
      const r = await api<{ email: string }>('/auth/set-password', { method: 'POST', body: { token, password: v.password } });
      router.replace(`/login?email=${encodeURIComponent(r.email)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đặt được mật khẩu');
    }
  };

  if (info.isLoading) {
    return (
      <div className="w-full max-w-sm space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!token || info.isError || !info.data) {
    return (
      <div className="w-full max-w-sm space-y-4">
        <LogoMark className="size-12 lg:hidden" />
        <div className="space-y-1">
          <h1 className="text-[28px] leading-tight font-medium">Link đã hết hạn</h1>
          <p className="text-sm text-muted-foreground">
            Link không còn dùng được, có thể đã quá hạn hoặc đã được dùng. Yêu cầu link mới bằng email đăng nhập của bạn
          </p>
        </div>
        <Button className="w-full" onClick={() => router.push('/forgot-password')}>
          Nhận link mới
        </Button>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Về trang đăng nhập
        </Link>
      </div>
    );
  }

  const invite = info.data.type === 'INVITE';
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5">
      <LogoMark className="size-12 lg:hidden" />
      <div className="space-y-1">
        <h1 className="text-[28px] leading-tight font-medium">{invite ? `Chào mừng đến ${brand.appName}` : 'Đặt mật khẩu mới'}</h1>
        <p className="text-sm text-muted-foreground">
          {invite ? 'Đặt mật khẩu để bắt đầu dùng tài khoản' : 'Mật khẩu mới thay cho mật khẩu cũ'}
          {info.data.fullName ? ` của ${info.data.fullName}` : ''}
        </p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="rounded-md bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Email đăng nhập</span> <span className="font-medium">{info.data.email}</span>
      </div>
      <input type="email" autoComplete="username" value={info.data.email} readOnly hidden />
      <FormField label="Mật khẩu mới" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="new-password" autoFocus aria-invalid={!!errors.password} {...register('password')} />
      </FormField>
      <FormField label="Nhập lại mật khẩu" htmlFor="confirm" error={errors.confirm?.message}>
        <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        {invite ? 'Đặt mật khẩu và đăng nhập' : 'Lưu mật khẩu mới'}
      </Button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <AuthShell>
      <Suspense>
        <SetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
