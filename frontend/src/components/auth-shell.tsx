'use client';

import { FileSpreadsheet, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppName, LogoMark } from '@/components/layout/sidebar';
import { useBranding } from '@/lib/branding';

function Copyright() {
  const b = useBranding();
  return (
    <p className="relative text-sm text-primary-foreground/60">
      © {new Date().getFullYear()} {b.companyName || b.appName}
    </p>
  );
}

/** Khung chung của các trang chưa đăng nhập: đăng nhập, quên mật khẩu, đặt mật khẩu */
export function AuthShell({ children }: { children: ReactNode }) {
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
      <div className="flex items-center justify-center p-6">{children}</div>
    </main>
  );
}
