'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface InviteResult {
  employeeId?: string;
  userId?: string;
  email: string;
  fullName?: string;
  status: 'sent' | 'link' | 'skipped';
  reason?: string;
  link?: string;
}

function CopyLink({ link }: { link: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">{link}</code>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setDone(true);
          toast.success('Đã chép link');
          setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check /> : <Copy />} Chép
      </Button>
    </div>
  );
}

/** Kết quả gửi lời mời. Khi chưa cấu hình email, hiện link để quản trị gửi tay cho nhân viên */
export function InviteResultsDialog({ results, onClose }: { results: InviteResult[] | null; onClose: () => void }) {
  const list = results ?? [];
  const sent = list.filter((r) => r.status === 'sent').length;
  const links = list.filter((r) => r.status === 'link');
  const skipped = list.filter((r) => r.status === 'skipped');
  return (
    <Dialog open={!!results} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Kết quả gửi lời mời</DialogTitle>
          <DialogDescription>
            {[sent && `${sent} đã gửi email`, links.length && `${links.length} cần gửi link thủ công`, skipped.length && `${skipped.length} bỏ qua`]
              .filter(Boolean)
              .join(', ')}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {links.length > 0 && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Chưa cấu hình gửi email ở Cài đặt → Email, nên hệ thống không gửi được. Chép link dưới và gửi riêng cho từng người. Link
              dùng một lần, hết hạn sau 72 giờ
            </p>
          )}
          <ul className="divide-y">
            {list.map((r) => (
              <li key={r.email + r.status} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.fullName ?? r.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                  </div>
                  {r.status === 'sent' ? (
                    <Badge variant="success">Đã gửi email</Badge>
                  ) : r.status === 'link' ? (
                    <Badge variant="warning">Gửi link thủ công</Badge>
                  ) : (
                    <Badge variant="secondary">{r.reason ?? 'Bỏ qua'}</Badge>
                  )}
                </div>
                {r.link && <CopyLink link={r.link} />}
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onClose}>Xong</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
