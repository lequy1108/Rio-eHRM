'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export function CommandDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay fixed inset-0 z-50 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="glass fixed top-[15%] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border shadow-2xl shadow-black/25 data-[state=closed]:animate-pop-out data-[state=open]:animate-sheet-in"
        >
          <DialogPrimitive.Title className="sr-only">Tìm kiếm nhanh</DialogPrimitive.Title>
          <CommandPrimitive
            shouldFilter={false}
            className="flex flex-col [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {children}
          </CommandPrimitive>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2 border-b px-3">
      <Search className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        className={cn('flex h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground', className)}
        {...props}
      />
    </div>
  );
}

export const CommandList = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) => (
  <CommandPrimitive.List className={cn('max-h-80 overflow-y-auto p-1', className)} {...props} />
);

export const CommandEmpty = (props: React.ComponentProps<typeof CommandPrimitive.Empty>) => (
  <CommandPrimitive.Empty className="py-8 text-center text-sm text-muted-foreground" {...props} />
);

export const CommandGroup = CommandPrimitive.Group;

export const CommandItem = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) => (
  <CommandPrimitive.Item
    className={cn(
      'flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground',
      className,
    )}
    {...props}
  />
);
