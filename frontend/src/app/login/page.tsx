'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileSpreadsheet, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { AppName, LogoMark } from '@/components/layout/sidebar';
import { useBranding } from '@/lib/branding';
import { PasswordInput } from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';

const schema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ')),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type Values = z.infer<typeof schema>;

function LoginForm() {
  const brand = useBranding();
  const router = useRouter();
  const params = useSearchParams();
  const { user, login } = useAuth();
  const [error, setError] = useState('');
  const next = params.get('next');
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@ehrm.local', password: 'Admin@123' },
  });

  useEffect(() => {
    if (user) router.replace(target);
  }, [user, router, target]);

  const onSubmit = async (v: Values) => {
    setError('');
    try {
      await login(v.email, v.password);
      router.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-sm space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
    >
      <LogoMark className="size-12 lg:hidden" />
      <div className="space-y-1">
        <h1 className="text-[28px] leading-tight font-medium">{brand.loginTitle || 'Đăng nhập'}</h1>
        {brand.loginSubtitle && <p className="text-sm text-muted-foreground">{brand.loginSubtitle}</p>}
      </div>
      {error && (
        <motion.p
          key={error}
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
          transition={{ duration: 0.4 }}
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </motion.p>
      )}
      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" autoFocus aria-invalid={!!errors.email} {...register('email')} />
      </FormField>
      <FormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Đăng nhập
      </Button>
      <p className="text-center text-xs text-muted-foreground">Quên mật khẩu? Liên hệ quản trị viên để được đặt lại.</p>
    </motion.form>
  );
}

function Copyright() {
  const b = useBranding();
  return (
    <p className="relative text-sm text-primary-foreground/60">
      © {new Date().getFullYear()} {b.companyName || b.appName}
    </p>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="size-10 rounded-[10px] ring-2 ring-white/25" />
          <AppName className="text-lg font-medium" />
        </div>
        <div className="space-y-6">
          <h2 className="max-w-md text-[36px] leading-[1.15] font-medium">
            Hồ sơ nhân viên, phòng ban và tài khoản của công ty ở một chỗ
          </h2>
          <ul className="space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-center gap-3"><Users className="size-[18px]" /> Tìm nhân viên theo tên, mã, email hoặc số điện thoại</li>
            <li className="flex items-center gap-3"><FileSpreadsheet className="size-[18px]" /> Nhập và xuất danh sách nhân viên bằng Excel</li>
            <li className="flex items-center gap-3"><ShieldCheck className="size-[18px]" /> Phân quyền theo vai trò và từng chức năng</li>
          </ul>
        </div>
        <Copyright />
      </div>
      <div className="flex items-center justify-center p-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
