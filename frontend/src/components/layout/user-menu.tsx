'use client';

import { KeyRound, LogOut, Monitor, Moon, Sun, User } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fileUrl } from '@/lib/api';
import { switchTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  if (!user) return null;
  const name = user.employee?.fullName ?? user.email;

  const themes = [
    { value: 'light', label: 'Sáng', icon: Sun },
    { value: 'dark', label: 'Tối', icon: Moon },
    { value: 'system', label: 'Theo máy', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="pressable flex items-center gap-2.5 rounded-lg p-1 pr-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
        <Avatar name={name} src={fileUrl(user.employee?.avatarUrl)} className="size-8" />
        <div className="hidden text-left sm:block">
          <div className="max-w-40 truncate text-sm font-medium leading-tight">{name}</div>
          <div className="text-xs text-muted-foreground">{user.role?.name ?? 'Chưa có vai trò'}</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium text-foreground">{name}</div>
          <div className="truncate text-xs">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User /> Hồ sơ của tôi
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile?tab=security">
            <KeyRound /> Đổi mật khẩu
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Giao diện</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => switchTheme(setTheme, t.value)}
              className={cn(
                'pressable flex flex-col items-center gap-1 rounded-md py-1.5 text-xs hover:bg-muted',
                theme === t.value && 'bg-accent text-accent-foreground',
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onClick={logout}>
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
