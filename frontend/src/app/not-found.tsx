import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="text-2xl font-medium">Không tìm thấy trang</h1>
        <p className="text-sm text-muted-foreground">Trang bạn tìm không tồn tại hoặc đã bị chuyển đi</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Về trang chủ</Link>
      </Button>
    </div>
  );
}
