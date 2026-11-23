'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

/** Ô tìm kiếm có debounce + nút xoá nhanh */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 350);

  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="h-8 pr-8 pl-8" />
      {text && (
        <button
          onClick={() => {
            setText('');
            onChange('');
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          <span className="sr-only">Xoá tìm kiếm</span>
        </button>
      )}
    </div>
  );
}
