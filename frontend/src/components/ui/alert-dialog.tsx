'use client';

import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

export const AlertDialog = AlertDialogPrimitive.Root;

export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="overlay fixed inset-0 z-50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <AlertDialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-lg',
          'shadow-2xl shadow-black/20 data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export const AlertDialogTitle = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) => (
  <AlertDialogPrimitive.Title className={cn('text-lg font-medium', className)} {...props} />
);

export const AlertDialogDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) => (
  <AlertDialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
);

export const AlertDialogAction = ({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & { destructive?: boolean }) => (
  <AlertDialogPrimitive.Action
    className={cn(buttonVariants({ variant: destructive ? 'destructive' : 'default' }), className)}
    {...props}
  />
);

export const AlertDialogCancel = ({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) => (
  <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
);
