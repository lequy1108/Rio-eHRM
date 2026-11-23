'use client';

import { motion } from 'motion/react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { createContext, useContext, useId, useState } from 'react';
import { spring } from '@/components/motion';
import { cn } from '@/lib/utils';

const TabsContext = createContext<{ value?: string; id: string }>({ id: '' });

/** Tabs có nền trượt mượt sang tab được chọn (kiểu segmented control của macOS) */
export function Tabs({ value, defaultValue, onValueChange, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  return (
    <TabsContext.Provider value={{ value: current, id }}>
      <TabsPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          setInner(v);
          onValueChange?.(v);
        }}
        {...props}
      />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, children, value, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'relative inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap outline-none',
        'hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground',
        className,
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId={`tab-pill-${ctx.id}`}
          transition={spring}
          className="absolute inset-0 z-0 rounded-md bg-card shadow-sm ring-1 ring-black/5"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 outline-none data-[state=active]:animate-fade-in', className)}
      {...props}
    />
  );
}
