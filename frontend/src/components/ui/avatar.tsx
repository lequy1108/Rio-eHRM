'use client';

import { Avatar as AvatarPrimitive } from 'radix-ui';
import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full', className)}>
      {src && <AvatarPrimitive.Image src={src} alt={name ?? ''} className="aspect-square size-full object-cover" />}
      <AvatarPrimitive.Fallback className="flex size-full items-center justify-center bg-secondary text-xs font-medium text-secondary-foreground">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
