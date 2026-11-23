'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

/** Giá trị đặc biệt đại diện cho "không chọn" (Radix không cho value rỗng) */
export const NONE = '__none__';

export interface Option {
  value: string;
  label: React.ReactNode;
}

/**
 * Select gọn: <Select value={v} onChange={setV} options={[...]} placeholder="Chọn…" clearable />
 * value rỗng ('') = chưa chọn.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = 'Chọn…',
  clearable,
  clearLabel = 'Tất cả',
  className,
  disabled,
  invalid,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  /** Thêm lựa chọn để bỏ chọn */
  clearable?: boolean;
  clearLabel?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value || (clearable ? NONE : undefined)}
      onValueChange={(v) => onChange(v === NONE ? '' : v)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive data-[placeholder]:text-muted-foreground [&>span]:truncate',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="glass z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-lg border text-popover-foreground shadow-xl shadow-black/10 data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {clearable && <Item value={NONE}>{clearLabel}</Item>}
            {options.map((o) => (
              <Item key={o.value} value={o.value}>
                {o.label}
              </Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function Item({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <SelectPrimitive.Item
      value={value}
      className="relative flex w-full cursor-default items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground"
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}
