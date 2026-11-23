'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;

/** Tooltip gọn: <Tooltip content="Sửa"><button/></Tooltip> */
export function Tooltip({
  content,
  children,
  side = 'top',
  disabled,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
}) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground/90 px-2.5 py-1.5 text-xs text-background shadow-lg backdrop-blur',
            'data-[state=closed]:animate-pop-out data-[state=delayed-open]:animate-pop-in data-[state=instant-open]:animate-pop-in',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
