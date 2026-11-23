import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => (
  <thead className={cn('bg-muted/50 [&_tr]:border-b', className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => (
  <tr
    className={cn('border-b hover:bg-muted/40 data-[state=selected]:bg-accent/60', className)}
    {...props}
  />
);

export const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => (
  <th
    className={cn('h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground', className)}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => (
  <td className={cn('px-3 py-2.5 align-middle', className)} {...props} />
);
