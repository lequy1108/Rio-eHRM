'use client';

import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Forbidden } from '@/components/forbidden';
import { CommandMenu } from '@/components/layout/command-menu';
import { Logo, Sidebar, SidebarNav } from '@/components/layout/sidebar';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { canSee, findNavItem } from '@/lib/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorage('ehrm_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      // Giữ cả bộ lọc trên URL để đăng nhập xong quay lại đúng chỗ
      router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-60 border-r bg-sidebar p-4 lg:block">
          <Skeleton className="mb-8 h-8 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-3 h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-6 h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const navItem = findNavItem(pathname);
  const allowed = !navItem || canSee(navItem, can);

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} />

      {/* Menu trên điện thoại */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center border-b px-5">
            <Logo />
          </div>
          <SidebarNav layoutId="sidebar-active-mobile" onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-card/70 px-4 backdrop-blur-xl backdrop-saturate-150 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu />
            <span className="sr-only">Mở menu</span>
          </Button>
          <Tooltip content={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((c) => !c)}>
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </Tooltip>

          <button
            onClick={() => setCommandOpen(true)}
            className="pressable flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border bg-background/60 px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">Tìm kiếm…</span>
            <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </button>

          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Suspense>{allowed ? children : <Forbidden />}</Suspense>
        </main>
      </div>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
