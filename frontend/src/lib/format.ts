export function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

/** "3 năm 2 tháng" tính từ ngày vào làm */
export function formatTenure(from?: string | null) {
  if (!from) return '—';
  const start = new Date(from + 'T00:00:00');
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months--;
  if (months < 0) return 'Chưa bắt đầu';
  if (months === 0) return 'Dưới 1 tháng';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} năm`, m && `${m} tháng`].filter(Boolean).join(' ');
}

export function age(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob + 'T00:00:00');
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a;
}

/** "Tháng 11/2026" */
export function formatMonth(d = new Date()) {
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}
