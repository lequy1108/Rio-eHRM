'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api, fileUrl } from './api';
import type { PublicSettings } from './types';

export const DEFAULT_PRIMARY = '#0049EA';

export const DEFAULT_BRANDING: PublicSettings = {
  companyName: '',
  companyShortName: '',
  appName: 'eHRM',
  primaryColor: DEFAULT_PRIMARY,
  loginTitle: 'Đăng nhập',
  loginSubtitle: 'Dùng email công ty mà quản trị viên đã cấp',
  logoUrl: '',
  faviconUrl: '',
  password: { minLength: 8, requireUpper: false, requireNumber: true, requireSymbol: false },
};

/** Tên, logo, màu… admin đặt trong Cài đặt (không cần đăng nhập) */
export function useBranding() {
  const q = useQuery({
    queryKey: ['branding'],
    queryFn: () => api<PublicSettings>('/settings/public'),
    staleTime: 5 * 60_000,
  });
  return { ...DEFAULT_BRANDING, ...q.data, loaded: !!q.data };
}

/** Mô tả chính sách mật khẩu cho dòng gợi ý dưới ô nhập */
export function passwordHint(p: PublicSettings['password']) {
  const parts = [`Tối thiểu ${p.minLength} ký tự`];
  if (p.requireUpper) parts.push('có chữ hoa');
  if (p.requireNumber) parts.push('có chữ số');
  if (p.requireSymbol) parts.push('có ký tự đặc biệt');
  return parts.join(', ');
}

export function checkPassword(pw: string, p: PublicSettings['password']) {
  if (pw.length < p.minLength) return false;
  if (p.requireUpper && !/[A-Z]/.test(pw)) return false;
  if (p.requireNumber && !/\d/.test(pw)) return false;
  if (p.requireSymbol && !/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

/** Độ sáng tương đối để chọn màu chữ trên nền màu chủ đạo */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** CSS ghi đè màu chủ đạo cho cả giao diện sáng và tối */
export function primaryCss(hex: string) {
  const fg = luminance(hex) > 0.45 ? 'oklch(0.2 0.02 265)' : 'oklch(0.985 0 0)';
  const darkHex = `color-mix(in oklch, ${hex} 78%, white)`;
  return `:root{--primary:${hex};--primary-foreground:${fg};--ring:color-mix(in oklch, ${hex} 70%, white);--accent:color-mix(in oklch, ${hex} 7%, white);--accent-foreground:color-mix(in oklch, ${hex} 80%, black)}
.dark{--primary:${darkHex};--primary-foreground:oklch(0.15 0.02 265);--ring:color-mix(in oklch, ${hex} 60%, black);--accent:color-mix(in oklch, ${hex} 22%, oklch(0.2 0.01 265));--accent-foreground:color-mix(in oklch, ${hex} 30%, white)}`;
}

/**
 * Áp dụng cài đặt giao diện cho toàn trang: màu chủ đạo, favicon, tên ứng dụng trên tab.
 * Đặt một lần trong AppProviders.
 */
export function BrandingEffect() {
  const b = useBranding();

  useEffect(() => {
    const id = 'brand-primary';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (b.primaryColor.toUpperCase() === DEFAULT_PRIMARY.toUpperCase()) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = primaryCss(b.primaryColor);
  }, [b.primaryColor]);

  useEffect(() => {
    if (!b.faviconUrl) return;
    const href = fileUrl(b.faviconUrl)!;
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((l) => (l.href = href));
  }, [b.faviconUrl]);

  // Tiêu đề tab mặc định có "eHRM"; đổi theo tên ứng dụng admin đặt
  useEffect(() => {
    if (!b.loaded || b.appName === 'eHRM') return;
    const fix = () => {
      if (document.title.includes('eHRM')) document.title = document.title.replaceAll('eHRM', b.appName);
    };
    fix();
    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    const obs = new MutationObserver(fix);
    obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [b.appName, b.loaded]);

  return null;
}
