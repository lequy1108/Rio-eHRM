'use client';

import { motion } from 'motion/react';
import { ExternalLink, ListTree } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { spring } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { SETTINGS_NAV } from './_components/nav';


export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();
  const items = SETTINGS_NAV.filter((i) => can(i.perm));
  const current = items.find((i) => pathname.startsWith(i.href));

  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Mọi thay đổi có hiệu lực ngay, không cần sửa code hay khởi động lại"
        breadcrumbs={[{ label: 'Hệ thống' }, { label: 'Cài đặt', href: '/settings' }, ...(current ? [{ label: current.label }] : [])]}
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start">
          {items.map((i) => {
            const active = pathname.startsWith(i.href);
            return (
              <Link
                key={i.href}
                href={i.href}
                className={cn(
                  'relative flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span layoutId="settings-active" transition={spring} className="absolute inset-0 rounded-lg border bg-card" />
                )}
                <i.icon className="relative z-10 size-4" />
                <span className="relative z-10">{i.label}</span>
              </Link>
            );
          })}
          {can('catalogs.manage') && (
            <Link
              href="/catalogs"
              className="flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ListTree className="size-4" />
              Danh mục
              <ExternalLink className="ml-auto size-3.5 opacity-60" />
            </Link>
          )}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
