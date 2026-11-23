import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Một dòng thông tin: nhãn nhỏ phía trên, giá trị phía dưới */
export function Info({
  icon: Icon,
  label,
  value,
  mono,
  className,
}: {
  icon?: React.ElementType;
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-sm break-words', mono && 'font-mono tabular-nums')}>
          {value || <span className="font-sans text-muted-foreground">Chưa có</span>}
        </div>
      </div>
    </div>
  );
}

/** Thẻ một nhóm thông tin, có nút Sửa ở góc phải */
export function Section({
  title,
  onEdit,
  children,
  className,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {onEdit && (
          <Button variant="ghost" size="sm" className="-my-1.5 -mr-2 text-muted-foreground" onClick={onEdit}>
            <Pencil /> Sửa
          </Button>
        )}
      </CardHeader>
      <CardContent className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</CardContent>
    </Card>
  );
}
