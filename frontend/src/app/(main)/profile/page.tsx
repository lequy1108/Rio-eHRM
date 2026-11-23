'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Briefcase, Building2, Calendar, KeyRound, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { PasswordInput } from '@/components/password-input';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, fileUrl } from '@/lib/api';
import { formatDate, formatDateTime, formatTenure } from '@/lib/format';
import { passwordHint, useBranding } from '@/lib/branding';
import { useAuth } from '@/providers/auth-provider';

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(1, 'Nhập mật khẩu mới'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Mật khẩu nhập lại không khớp' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Mật khẩu mới phải khác mật khẩu cũ' });
type PwValues = z.infer<typeof pwSchema>;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
const STRENGTH_COLOR = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-success', 'bg-success'];

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="size-4 text-muted-foreground" />
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { password: policy } = useBranding();
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get('tab') ?? 'info';

  const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<PwValues>({
    resolver: zodResolver(pwSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const pw = watch('newPassword') ?? '';
  const level = strength(pw);

  const change = useMutation({
    meta: { silent: true },
    mutationFn: (v: PwValues) =>
      api('/auth/change-password', { method: 'POST', body: { currentPassword: v.currentPassword, newPassword: v.newPassword } }),
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công');
      reset();
    },
    onError: (err: Error) => {
      if (/hiện tại/i.test(err.message)) setError('currentPassword', { message: err.message });
      else if (/^Mật khẩu cần/.test(err.message)) setError('newPassword', { message: err.message });
      else toast.error(err.message);
    },
  });

  if (!user) return null;
  const e = user.employee;

  return (
    <>
      <PageHeader title="Hồ sơ của tôi" breadcrumbs={[{ label: 'Hồ sơ của tôi' }]} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={e?.fullName ?? user.email} src={fileUrl(e?.avatarUrl)} className="size-24 text-2xl" />
            <div>
              <div className="text-lg font-medium">{e?.fullName ?? user.email}</div>
              <div className="text-sm text-muted-foreground">{e?.position?.name ?? user.email}</div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge>{user.role?.name ?? 'Chưa có vai trò'}</Badge>
              {e && <StatusBadge status={e.status} />}
            </div>
            <p className="text-xs text-muted-foreground">Đăng nhập gần nhất: {formatDateTime(user.lastLoginAt)}</p>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => router.replace(`/profile?tab=${v}`, { scroll: false })}>
          <TabsList>
            <TabsTrigger value="info">
              <User className="size-4" /> Thông tin
            </TabsTrigger>
            <TabsTrigger value="security">
              <ShieldCheck className="size-4" /> Bảo mật
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>Muốn sửa thông tin, liên hệ phòng Nhân sự</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <Row icon={Mail} label="Email đăng nhập" value={user.email} />
                {e ? (
                  <>
                    <Row icon={User} label="Mã nhân viên" value={<span className="font-mono">{e.code}</span>} />
                    <Row icon={Phone} label="Số điện thoại" value={e.phone} />
                    <Row icon={Building2} label="Phòng ban" value={e.department?.name} />
                    <Row icon={Briefcase} label="Chức vụ" value={e.position?.name} />
                    <Row icon={Calendar} label="Ngày vào làm" value={`${formatDate(e.hireDate)} (${formatTenure(e.hireDate)})`} />
                  </>
                ) : (
                  <p className="py-3 text-sm text-muted-foreground">Tài khoản này chưa gắn với hồ sơ nhân viên</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="size-4" /> Đổi mật khẩu
                </CardTitle>
                <CardDescription>Nên dùng ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit((v) => change.mutate(v))} className="max-w-md space-y-4">
                  <FormField label="Mật khẩu hiện tại" htmlFor="cur" required error={errors.currentPassword?.message}>
                    <PasswordInput id="cur" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register('currentPassword')} />
                  </FormField>
                  <FormField label="Mật khẩu mới" htmlFor="new" required error={errors.newPassword?.message} hint={errors.newPassword ? undefined : passwordHint(policy)}>
                    <PasswordInput id="new" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register('newPassword')} />
                    {pw && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex flex-1 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.max(level, 1) ? STRENGTH_COLOR[level] : 'bg-muted'}`} />
                          ))}
                        </div>
                        <span className="w-20 text-right text-xs text-muted-foreground">{STRENGTH[level]}</span>
                      </div>
                    )}
                  </FormField>
                  <FormField label="Nhập lại mật khẩu mới" htmlFor="confirm" required error={errors.confirm?.message}>
                    <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />
                  </FormField>
                  <Button type="submit" loading={change.isPending}>
                    Đổi mật khẩu
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
