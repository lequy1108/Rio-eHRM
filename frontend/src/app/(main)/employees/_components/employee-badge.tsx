'use client';

import { Camera } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { AppName, LogoMark } from '@/components/layout/sidebar';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { fileUrl } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Employee } from '@/lib/types';

/** Mã vạch trang trí tạo ổn định từ mã nhân viên (cùng mã luôn ra cùng hình) */
function Barcode({ value }: { value: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  const push = (w: number, gap: number) => {
    bars.push({ x, w });
    x += w + gap;
  };
  push(2, 2);
  for (const ch of value) {
    const c = ch.charCodeAt(0);
    for (let b = 0; b < 6; b++) push((c >> b) & 1 ? 2.5 : 1, ((c >> (b + 1)) & 1) + 1.5);
  }
  push(2, 0);
  return (
    <svg viewBox={`0 0 ${x} 28`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={28} className="fill-foreground/70" />
      ))}
    </svg>
  );
}

/** Thẻ nhân viên: điểm nhấn của trang hồ sơ, trông như thẻ đeo thật */
export function EmployeeBadge({
  employee: e,
  canEdit,
  uploading,
  onAvatar,
}: {
  employee: Employee;
  canEdit?: boolean;
  uploading?: boolean;
  onAvatar?: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative mx-auto w-full max-w-[320px] rounded-2xl border bg-card p-5 pt-7 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_12px_32px_-12px_rgb(0_0_0/0.12)]">
      {/* Lỗ đeo dây */}
      <div className="absolute top-3 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-muted shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LogoMark className="size-5" />
          <AppName />
        </div>
        <span className="text-xs text-muted-foreground">Thẻ nhân viên</span>
      </div>

      <div className="mt-5 flex flex-col items-center text-center">
        <div className="relative">
          <Avatar name={e.fullName} src={fileUrl(e.avatarUrl)} className="size-24 rounded-2xl text-xl" />
          {canEdit && onAvatar && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="pressable absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
                title="Đổi ảnh"
              >
                <Camera className="size-4" />
                <span className="sr-only">Đổi ảnh</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f && f.size > 2 * 1024 * 1024) toast.error('Ảnh tối đa 2MB');
                  else if (f) onAvatar(f);
                  ev.target.value = '';
                }}
              />
            </>
          )}
        </div>
        <div className="mt-4 text-lg leading-tight font-medium">{e.fullName}</div>
        <div className="mt-1 text-sm text-muted-foreground">{e.position?.name ?? 'Chưa có chức vụ'}</div>
        <div className="text-sm text-muted-foreground">{e.department?.name ?? 'Chưa có phòng ban'}</div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs">
        <div>
          <div className="text-muted-foreground">Ngày vào làm</div>
          <div className="mt-0.5 font-mono tabular-nums">{formatDate(e.hireDate)}</div>
        </div>
        <StatusBadge status={e.status} />
      </div>

      <div className="mt-4 space-y-1.5">
        <Barcode value={e.code} />
        <div className="text-center font-mono text-xs tracking-[0.2em] text-muted-foreground">{e.code}</div>
      </div>
    </div>
  );
}
