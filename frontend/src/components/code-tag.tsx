import { cn } from '@/lib/utils';

/**
 * Nhãn mã (NV0008, mã phòng ban…): chữ đơn cách trong viền mảnh, như số in trên thẻ nhân viên.
 * Đây là chi tiết nhận diện của eHRM, dùng ở mọi nơi hiển thị mã.
 */
export function CodeTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-[5px] border px-1.5 font-mono text-[11px] leading-none text-muted-foreground tabular-nums',
        className,
      )}
    >
      {children}
    </span>
  );
}
