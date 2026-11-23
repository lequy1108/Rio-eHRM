import { Badge } from '@/components/ui/badge';
import { STATUS_LABEL, STATUS_VARIANT, type EmployeeStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}
