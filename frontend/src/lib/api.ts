import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export const TOKEN_KEY = 'ehrm_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Đọc thời điểm hết hạn của JWT (ms) */
export function tokenExpiresAt(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let redirecting = false;
/** Hết phiên: xoá token, báo cho người dùng và quay về trang đăng nhập */
export function handleSessionExpired() {
  if (typeof window === 'undefined' || redirecting) return;
  redirecting = true;
  setToken(null);
  toast.warning('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  setTimeout(() => (window.location.href = `/login?next=${next}`), 800);
}

export type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_URL + path);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  return url;
}

async function request(path: string, init: RequestInit & { query?: Query } = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, init.query), { ...init, headers });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.');
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    if (res.status === 401 && !path.startsWith('/auth/login')) handleSessionExpired();
    const msg = json?.message;
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Có lỗi xảy ra'));
  }
  return res;
}

/** Gọi API JSON, tự gắn token và bóc { success, data } */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  const res = await request(path, {
    method: options.method ?? 'GET',
    query: options.query,
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return json?.data as T;
}

/** Upload file (multipart). field mặc định là "file" */
export async function upload<T>(path: string, file: File, extra?: Record<string, string>, field = 'file') {
  const form = new FormData();
  form.append(field, file);
  Object.entries(extra ?? {}).forEach(([k, v]) => form.append(k, v));
  const res = await request(path, { method: 'POST', body: form });
  const json = await res.json().catch(() => null);
  return json?.data as T;
}

/** Tải file về máy (Excel, PDF…) */
export async function download(path: string, query?: Query, fallbackName = 'download') {
  const res = await request(path, { query });
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Đường dẫn đầy đủ tới file tĩnh do backend phục vụ (ảnh đại diện…) */
export function fileUrl(path?: string | null) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return API_URL.replace(/\/api\/?$/, '') + path;
}
