'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { SETTINGS_NAV } from './_components/nav';

/** Vào /settings thì mở mục đầu tiên người dùng có quyền */
export default function SettingsIndex() {
  const router = useRouter();
  const { can } = useAuth();
  useEffect(() => {
    const first = SETTINGS_NAV.find((i) => can(i.perm));
    if (first) router.replace(first.href);
  }, [can, router]);
  return null;
}
