'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="overlay fixed inset-0 z-50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          // Khung ngoài không cuộn; nội dung dài đặt trong <DialogBody> để chỉ phần thân cuộn
          'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-xl border bg-card p-6 shadow-lg',
          'shadow-2xl shadow-black/20 data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="pressable absolute top-4 right-4 rounded-full p-1 opacity-60 hover:bg-muted hover:opacity-100">
          <X className="size-4" />
          <span className="sr-only">Đóng</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Phần thân cuộn được, giữ tiêu đề và nút ở chỗ cũ khi form dài */
export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('-mx-6 min-h-0 flex-1 overflow-y-auto px-6 py-1', className)} {...props} />;
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex shrink-0 flex-col gap-1.5 pr-6', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg font-medium leading-none', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
