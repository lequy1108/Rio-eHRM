'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { AuthShell } from '@/components/auth-shell';
import { LogoMark } from '@/components/layout/sidebar';
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
    // Điền sẵn email khi vừa đặt mật khẩu xong (?email=); tài khoản mẫu chỉ điền khi chạy dev
    defaultValues:
      params.get('email') != null
        ? { email: params.get('email') ?? '', password: '' }
        : process.env.NODE_ENV === 'development'
          ? { email: 'admin@ehrm.local', password: 'Admin@123' }
          : { email: '', password: '' },
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
        <Input id="email" type="email" autoComplete="email" autoFocus={params.get('email') == null} aria-invalid={!!errors.email} {...register('email')} />
      </FormField>
      <FormField label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
        <PasswordInput id="password" autoComplete="current-password" autoFocus={params.get('email') != null} aria-invalid={!!errors.password} {...register('password')} />
      </FormField>
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Đăng nhập
      </Button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          Quên mật khẩu
        </Link>
      </p>
    </motion.form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
