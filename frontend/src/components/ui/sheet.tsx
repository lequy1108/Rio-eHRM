'use client';

import { X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTitle = SheetPrimitive.Title;

/** Ngăn kéo trượt từ cạnh màn hình (dùng cho menu trên điện thoại) */
export function SheetContent({
  side = 'left',
  className,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="overlay fixed inset-0 z-50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <SheetPrimitive.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-72 flex-col bg-sidebar shadow-2xl ease-(--ease-apple) data-[state=open]:animate-in data-[state=open]:duration-400 data-[state=closed]:animate-out data-[state=closed]:duration-200',
          side === 'left'
            ? 'left-0 border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left'
            : 'right-0 border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
          className,
        )}
        aria-describedby={undefined}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-60 hover:opacity-100">
          <X className="size-4" />
          <span className="sr-only">Đóng</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
