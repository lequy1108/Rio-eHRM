'use client';

import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <TriangleAlert className="size-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-medium">Đã xảy ra lỗi</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error.message || 'Lỗi không xác định'}</p>
      </div>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
