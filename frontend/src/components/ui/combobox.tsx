'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ComboOption {
  value: string;
  label: string;
  /** Chữ phụ bên phải, vd mã */
  hint?: string;
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Ô chọn có tìm kiếm (gõ không dấu vẫn tìm được).
 * - Lọc tại chỗ: chỉ truyền options.
 * - Tìm trên server: truyền onSearch và tự cập nhật options.
 * selectedLabel: nhãn của giá trị đang chọn khi nó không nằm trong options (vd tìm trên server).
 */
export function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Chọn…',
  searchPlaceholder = 'Tìm…',
  emptyText = 'Không có kết quả',
  onSearch,
  loading,
  selectedLabel,
  clearable = true,
  disabled,
  invalid,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onSearch?: (q: string) => void;
  loading?: boolean;
  selectedLabel?: string;
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? (value ? selectedLabel : undefined);

  const filtered = onSearch
    ? options
    : options.filter((o) => normalize(`${o.label} ${o.hint ?? ''}`).includes(normalize(q)));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQ('');
          onSearch?.('');
        }
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          aria-invalid={invalid || undefined}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
            className,
          )}
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>{label ?? placeholder}</span>
          <span className="flex items-center gap-1">
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        <CommandPrimitive shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              value={q}
              onValueChange={(v) => {
                setQ(v);
                onSearch?.(v);
              }}
              placeholder={searchPlaceholder}
              className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="size-4 animate-spin opacity-50" />}
          </div>
          <CommandPrimitive.List className="max-h-64 overflow-y-auto p-1">
            {!loading && filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            )}
            {filtered.map((o) => (
              <CommandPrimitive.Item
                key={o.value}
                value={o.value}
                onSelect={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <Check className={cn('size-4', o.value === value ? 'opacity-100' : 'opacity-0')} />
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
