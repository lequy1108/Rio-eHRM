'use client';

import { useQuery } from '@tanstack/react-query';
import { Moon, Plus, Sun, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CodeTag } from '@/components/code-tag';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api';
import { canSee, NAV } from '@/lib/navigation';
import { switchTheme } from '@/lib/theme';
import type { Employee, Paginated } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

/** Bỏ dấu tiếng Việt để gõ "nhan vien" vẫn ra "Nhân viên" */
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { can } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 250);
  const canSeeEmployees = can('employees.view');

  // Phím tắt Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const { data: employees } = useQuery({
    queryKey: ['employees', 'command', debounced],
    queryFn: () => api<Paginated<Employee>>('/employees', { query: { search: debounced, limit: 6 } }),
    enabled: open && canSeeEmployees && debounced.trim().length >= 2,
  });

  const pages = useMemo(() => {
    const q = normalize(search.trim());
    return NAV.flatMap((g) => g.items)
      .filter((i) => canSee(i, can))
      .filter((i) => !q || normalize(`${i.label} ${i.keywords ?? ''}`).includes(q));
  }, [search, can]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const actions = [
    ...(can('employees.create')
      ? [{ label: 'Thêm nhân viên mới', icon: Plus, run: () => go('/employees?new=1'), keywords: 'them nhan vien tao' }]
      : []),
    { label: 'Hồ sơ của tôi', icon: User, run: () => go('/profile'), keywords: 'ho so ca nhan doi mat khau' },
    {
      label: resolvedTheme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      run: () => {
        switchTheme(setTheme, resolvedTheme === 'dark' ? 'light' : 'dark');
        onOpenChange(false);
      },
      keywords: 'giao dien sang toi dark light theme',
    },
  ].filter((a) => !search || normalize(`${a.label} ${a.keywords}`).includes(normalize(search)));

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder={canSeeEmployees ? 'Tìm trang, nhân viên, thao tác…' : 'Tìm trang, thao tác…'}
      />
      <CommandList>
        <CommandEmpty>Không tìm thấy kết quả</CommandEmpty>
        {!!employees?.items.length && (
          <CommandGroup heading="Nhân viên">
            {employees.items.map((e) => (
              <CommandItem key={e.id} value={`emp-${e.id}`} onSelect={() => go(`/employees/${e.id}`)}>
                <User />
                <span className="flex-1 truncate">{e.fullName}</span>
                <CodeTag>{e.code}</CodeTag>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!pages.length && (
          <CommandGroup heading="Trang">
            {pages.map((p) => (
              <CommandItem key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)}>
                <p.icon />
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!actions.length && (
          <CommandGroup heading="Thao tác">
            {actions.map((a) => (
              <CommandItem key={a.label} value={`act-${a.label}`} onSelect={a.run}>
                <a.icon />
                {a.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
