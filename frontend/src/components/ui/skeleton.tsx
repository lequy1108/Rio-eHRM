import { cn } from '@/lib/utils';

/** Khối giữ chỗ khi đang tải, có ánh sáng lướt qua */
export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_0%,color-mix(in_oklab,var(--muted)_40%,var(--card))_50%,var(--muted)_100%)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  );
}
