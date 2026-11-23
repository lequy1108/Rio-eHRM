'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, handleSessionExpired, setToken, tokenExpiresAt } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  /** Có đủ các quyền này không (mã quyền xem backend common/permissions.ts). Quản trị luôn true */
  can: (...perms: string[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setUser(await api<User>('/auth/me'));
  }, []);

  useEffect(() => {
    const t = getToken();
    setTokenState(t);
    if (!t) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  // Tự đăng xuất đúng lúc token hết hạn
  useEffect(() => {
    const exp = tokenExpiresAt(token);
    if (!exp) return;
    const ms = exp - Date.now();
    if (ms <= 0) {
      handleSessionExpired();
      return;
    }
    // setTimeout tối đa ~24,8 ngày
    const timer = setTimeout(handleSessionExpired, Math.min(ms, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [token]);

  // Quyền đổi trong Cài đặt có hiệu lực ngay ở backend; tải lại khi quay lại tab để menu cập nhật theo
  useEffect(() => {
    if (!token) return;
    const onFocus = () => {
      if (document.visibilityState === 'visible') refreshUser().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [token, refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(res.accessToken);
    setTokenState(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    queryClient.clear();
    window.location.href = '/login';
  }, [queryClient]);

  const can = useCallback(
    (...perms: string[]) => {
      const mine = user?.permissions ?? user?.role?.permissions ?? [];
      return mine.includes('*') || perms.every((p) => mine.includes(p));
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong <AuthProvider>');
  return ctx;
}
