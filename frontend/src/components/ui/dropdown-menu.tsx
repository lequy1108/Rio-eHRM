'use client';

import { Check } from 'lucide-react';
import { DropdownMenu as DM } from 'radix-ui';
import { cn } from '@/lib/utils';

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;
export const DropdownMenuGroup = DM.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={sideOffset}
        className={cn(
          'glass z-50 min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg border p-1 text-popover-foreground shadow-xl shadow-black/10',
          'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  ...props
}: React.ComponentProps<typeof DM.Item> & { destructive?: boolean }) {
  return (
    <DM.Item
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        destructive
          ? 'text-destructive focus:bg-destructive/10'
          : 'focus:bg-accent focus:text-accent-foreground [&_svg]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DM.CheckboxItem>) {
  return (
    <DM.CheckboxItem
      className={cn(
        'relative flex cursor-default items-center rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none focus:bg-accent',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <DM.ItemIndicator>
          <Check className="size-4" />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DM.Separator>) {
  return <DM.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}
