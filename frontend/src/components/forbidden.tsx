import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Bạn không có quyền truy cập trang này</h1>
        <p className="text-sm text-muted-foreground">Liên hệ quản trị viên nếu bạn cần được cấp quyền</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/dashboard">Về trang chủ</Link>
      </Button>
    </div>
  );
}
