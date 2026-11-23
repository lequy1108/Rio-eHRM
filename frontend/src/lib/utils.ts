import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gộp class Tailwind, tự xử lý class xung đột */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Lấy chữ cái đầu để làm avatar, vd "Nguyễn Văn An" -> "NA" */
export function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
