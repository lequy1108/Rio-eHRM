'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { spring } from '@/components/motion';
import { Tooltip } from '@/components/ui/tooltip';
import { fileUrl } from '@/lib/api';
import { useBranding } from '@/lib/branding';
import { canSee, NAV } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

/** Biểu tượng logo: ảnh admin tải lên ở Cài đặt → Giao diện, chưa có thì dùng public/logo.png */
export function LogoMark({ className }: { className?: string }) {
  const { logoUrl, appName } = useBranding();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fileUrl(logoUrl) ?? '/logo.png'}
      alt={appName}
      width={256}
      height={256}
      className={cn('shrink-0 object-contain select-none', className)}
      draggable={false}
    />
  );
}

export function AppName({ className }: { className?: string }) {
  const { appName } = useBranding();
  return <span className={cn('truncate', className)}>{appName}</span>;
}

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <LogoMark className="size-8" />
      {!collapsed && <AppName className="text-lg font-semibold tracking-tight text-foreground" />}
    </Link>
  );
}

/** Danh sách menu, dùng chung cho sidebar máy tính và ngăn kéo trên điện thoại */
export function SidebarNav({
  collapsed,
  onNavigate,
  layoutId = 'sidebar-active',
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Mỗi danh sách menu cần id riêng để thanh chọn trượt đúng chỗ */
  layoutId?: string;
}) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV.map((group) => {
        const items = group.items.filter((i) => canSee(i, can));
        if (!items.length) return null;
        return (
          <div key={group.label} className="space-y-0.5">
            {!collapsed && (
              <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
                {group.label}
              </div>
            )}
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Tooltip key={item.href} content={item.label} side="right" disabled={!collapsed}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'pressable relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                      collapsed && 'justify-center px-0',
                      active ? 'text-foreground' : 'text-sidebar-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={layoutId}
                        transition={spring}
                        className="absolute inset-0 z-0 rounded-lg bg-muted shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--foreground)_6%,transparent)]"
                      />
                    )}
                    <Icon className={cn('relative z-10 size-[18px] shrink-0', active && 'text-primary')} />
                    {!collapsed && (
                      <motion.span
                        className="relative z-10 truncate"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-300 ease-(--ease-apple) lg:flex',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div className={cn('flex h-16 items-center border-b px-5', collapsed && 'justify-center px-0')}>
        <Logo collapsed={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} />
    </aside>
  );
}
