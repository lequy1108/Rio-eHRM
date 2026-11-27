'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AuthShell } from '@/components/auth-shell';
import { FormField } from '@/components/form-field';
import { LogoMark } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const schema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ')),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    setError('');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: v });
      setSentTo(v.email);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không gửi được yêu cầu');
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-5">
        <LogoMark className="size-12 lg:hidden" />
        {sentTo ? (
          <div className="space-y-4">
            <MailCheck className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <div className="space-y-1">
              <h1 className="text-[28px] leading-tight font-medium">Kiểm tra hộp thư</h1>
              <p className="text-sm text-muted-foreground">
                Nếu <span className="text-foreground">{sentTo}</span> có tài khoản, hệ thống đã gửi link đặt lại mật khẩu. Link hết hạn sau 60
                phút. Không thấy email thì xem mục Spam hoặc nhờ quản trị viên gửi lại.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setSentTo('')}>
              Gửi lại
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1">
              <h1 className="text-[28px] leading-tight font-medium">Quên mật khẩu</h1>
              <p className="text-sm text-muted-foreground">Nhập email đăng nhập, hệ thống sẽ gửi link để bạn đặt mật khẩu mới</p>
            </div>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register('email')} />
            </FormField>
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Gửi link đặt lại
            </Button>
          </form>
        )}
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Về trang đăng nhập
        </Link>
      </div>
    </AuthShell>
  );
}
