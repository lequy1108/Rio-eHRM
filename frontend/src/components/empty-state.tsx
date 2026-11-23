import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Chưa có dữ liệu',
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex animate-fade-in flex-col items-center justify-center gap-3 px-4 py-14 text-center', className)}>
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
