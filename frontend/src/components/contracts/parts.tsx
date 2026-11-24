'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CONTRACT_STATE, type Allowance, type Contract } from '@/lib/types';
import { cn } from '@/lib/utils';

export const fmtMoney = (n?: number | null) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n ?? 0)));

/** Ô nhập tiền có dấu chấm ngăn cách hàng nghìn, giá trị là số hoặc null */
export function MoneyInput({
  value,
  onChange,
  id,
  placeholder,
  invalid,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        className="pr-10 font-mono tabular-nums"
        placeholder={placeholder}
        aria-invalid={invalid}
        value={value === null || value === undefined ? '' : fmtMoney(value)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '');
          onChange(d ? Number(d) : null);
        }}
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">đ</span>
    </div>
  );
}

/** Danh sách phụ cấp: tên + số tiền/tháng */
export function AllowancesEditor({ value, onChange }: { value: Allowance[]; onChange: (v: Allowance[]) => void }) {
  const set = (i: number, patch: Partial<Allowance>) => onChange(value.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <div className="grid gap-2">
      {value.map((a, i) => (
        <div key={i} className="grid grid-cols-[1fr_160px_auto] gap-2">
          <Input
            placeholder="Vd Ăn trưa, xăng xe, điện thoại"
            value={a.name}
            list="allowance-names"
            onChange={(e) => set(i, { name: e.target.value })}
          />
          <MoneyInput value={a.amount} onChange={(v) => set(i, { amount: v ?? 0 })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Bỏ khoản này" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <X />
          </Button>
        </div>
      ))}
      <datalist id="allowance-names">
        {['Ăn trưa', 'Xăng xe', 'Điện thoại', 'Nhà ở', 'Trách nhiệm', 'Chuyên cần'].map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onChange([...value, { name: '', amount: 0 }])}>
        <Plus /> Thêm phụ cấp
      </Button>
    </div>
  );
}

export function ContractStateBadge({ contract, className }: { contract: Pick<Contract, 'state' | 'daysLeft' | 'renewedBy'>; className?: string }) {
  const s = CONTRACT_STATE[contract.state];
  const extra =
    contract.state === 'expiring' && contract.daysLeft !== null
      ? contract.daysLeft === 0
        ? 'hôm nay'
        : `còn ${contract.daysLeft} ngày`
      : contract.state === 'expired' && contract.renewedBy
        ? 'đã gia hạn'
        : null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap', className)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} />
      {s.label}
      {extra && <span className="text-muted-foreground">· {extra}</span>}
    </span>
  );
}

/** Ngày cuối thời hạn: bắt đầu + n tháng - 1 ngày (01/01 + 12 tháng → 31/12) */
export function endFromMonths(start: string, months: number) {
  const [y, m, d] = start.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  // Tháng đích ít ngày hơn (vd 31/01 + 1 tháng) thì kết thúc ở ngày cuối tháng đó (28/02)
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  else dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
