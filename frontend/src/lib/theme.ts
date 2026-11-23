/**
 * Đổi giao diện sáng/tối với hiệu ứng mờ chuyển (View Transitions API).
 * Trình duyệt không hỗ trợ thì đổi ngay như bình thường.
 */
export function switchTheme(setTheme: (t: string) => void, theme: string) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce) {
    setTheme(theme);
    return;
  }
  doc.startViewTransition(() => setTheme(theme));
}
