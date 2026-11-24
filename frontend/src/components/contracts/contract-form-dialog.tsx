'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmployeePicker } from '@/components/employee-picker';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useContractTypes } from '@/lib/queries';
import type { Allowance, Contract, Employee } from '@/lib/types';
import { moneyInWords } from '@/lib/vn-money';
import { addDays, AllowancesEditor, endFromMonths, MoneyInput } from './parts';

type Form = {
  employeeId: string;
  typeId: string;
  contractNumber: string;
  signDate: string;
  startDate: string;
  endDate: string;
  jobTitle: string;
  workLocation: string;
  baseSalary: number | null;
  insuranceSalary: number | null;
  allowances: Allowance[];
  signerName: string;
  signerTitle: string;
  note: string;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Tạo, sửa hoặc gia hạn hợp đồng.
 * - `contract`: sửa hợp đồng đó
 * - `renewFrom`: tạo hợp đồng mới nối tiếp (ngày bắt đầu = hết hạn cũ + 1, giữ lương, phụ cấp)
 * - `employee`: chọn sẵn nhân viên (từ hồ sơ)
 */
export function ContractFormDialog({
  open,
  onOpenChange,
  contract,
  renewFrom,
  employee,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contract?: Contract | null;
  renewFrom?: Contract | null;
  employee?: Employee | null;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: types = [] } = useContractTypes();
  const isEdit = !!contract;
  const [f, setF] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoEnd, setAutoEnd] = useState(true);
  const [empLabel, setEmpLabel] = useState<string>();
  const [empCode, setEmpCode] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setAutoEnd(!isEdit);
    const src = contract ?? renewFrom;
    const cur = renewFrom?.current;
    const start = renewFrom?.endDate ? addDays(renewFrom.endDate, 1) : today();
    setF({
      employeeId: src?.employeeId ?? employee?.id ?? '',
      // Gia hạn: giữ loại cũ, trừ hợp đồng thử việc (thường chuyển sang loại chính thức)
      typeId: contract?.typeId ?? (renewFrom && !renewFrom.type?.isProbation ? (renewFrom.typeId ?? '') : ''),
      contractNumber: contract?.contractNumber ?? '',
      signDate: contract?.signDate ?? today(),
      startDate: contract?.startDate ?? start,
      endDate: contract?.endDate ?? '',
      jobTitle: contract?.jobTitle ?? cur?.jobTitle ?? renewFrom?.jobTitle ?? employee?.position?.name ?? '',
      workLocation: src?.workLocation ?? '',
      baseSalary: contract?.baseSalary ?? cur?.baseSalary ?? null,
      insuranceSalary: contract?.insuranceSalary ?? cur?.insuranceSalary ?? null,
      allowances: contract?.allowances ?? cur?.allowances ?? [],
      signerName: src?.signerName ?? '',
      signerTitle: src?.signerTitle ?? '',
      note: contract?.note ?? '',
    });
    const e = src?.employee ?? employee;
    setEmpLabel(e?.fullName);
    setEmpCode(e?.code ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const type = types.find((t) => t.id === f?.typeId);

  // Chọn loại hoặc đổi ngày bắt đầu → tự tính ngày kết thúc theo thời hạn mặc định
  useEffect(() => {
    if (!f || !autoEnd || !type) return;
    const end = type.hasTerm && type.defaultMonths && f.startDate ? endFromMonths(f.startDate, type.defaultMonths) : '';
    if (end !== f.endDate) setF({ ...f, endDate: end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.typeId, f?.startDate, autoEnd, type?.id]);

  const { data: next } = useQuery({
    queryKey: ['contracts', 'next-number', f?.signDate, empCode, type?.code],
    queryFn: () =>
      api<{ contractNumber: string }>('/contracts/next-number', {
        query: { signDate: f!.signDate, employeeCode: empCode, typeCode: type?.code ?? '' },
      }),
    enabled: open && !isEdit && !!f?.signDate,
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit ? api<Contract>(`/contracts/${contract!.id}`, { method: 'PATCH', body }) : api<Contract>('/contracts', { method: 'POST', body }),
    onSuccess: (c) => {
      toast.success(isEdit ? 'Đã lưu hợp đồng' : `Đã tạo hợp đồng ${c.contractNumber}`);
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      onOpenChange(false);
      if (!isEdit) router.push(`/contracts/${c.id}`);
    },
  });

  const total = useMemo(() => (f?.baseSalary ?? 0) + (f?.allowances ?? []).reduce((s, a) => s + (a.amount || 0), 0), [f]);

  if (!f) return null;
  const set = (patch: Partial<Form>) => setF({ ...f, ...patch });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (!f.employeeId) e.employeeId = 'Chọn nhân viên';
    if (!f.typeId) e.typeId = 'Chọn loại hợp đồng';
    if (!f.signDate) e.signDate = 'Nhập ngày ký';
    if (!f.startDate) e.startDate = 'Nhập ngày bắt đầu';
    if (type?.hasTerm && !f.endDate) e.endDate = 'Loại này cần ngày kết thúc';
    if (f.endDate && f.startDate && f.endDate < f.startDate) e.endDate = 'Phải sau ngày bắt đầu';
    if (f.baseSalary === null) e.baseSalary = 'Nhập lương cơ bản';
    if (f.allowances.some((a) => !a.name.trim())) e.allowances = 'Nhập tên cho mọi khoản phụ cấp';
    setErrors(e);
    if (Object.keys(e).length) return;
    const body: Record<string, unknown> = {
      typeId: f.typeId,
      signDate: f.signDate,
      startDate: f.startDate,
      endDate: type?.hasTerm ? f.endDate : null,
      jobTitle: f.jobTitle || null,
      workLocation: f.workLocation || null,
      baseSalary: f.baseSalary,
      insuranceSalary: f.insuranceSalary,
      allowances: f.allowances.map((a) => ({ name: a.name.trim(), amount: a.amount || 0 })),
      signerName: f.signerName || null,
      signerTitle: f.signerTitle || null,
      note: f.note || null,
    };
    if (isEdit) body.contractNumber = f.contractNumber || undefined;
    else {
      body.employeeId = f.employeeId;
      if (f.contractNumber) body.contractNumber = f.contractNumber;
      if (renewFrom) body.previousContractId = renewFrom.id;
    }
    save.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa hợp đồng ${contract!.contractNumber}` : renewFrom ? 'Gia hạn / tái ký hợp đồng' : 'Tạo hợp đồng'}</DialogTitle>
          {renewFrom && (
            <DialogDescription>
              Nối tiếp hợp đồng {renewFrom.contractNumber}
              {renewFrom.endDate && <> hết hạn {formatDate(renewFrom.endDate)}</>}, giữ lương và phụ cấp đang áp dụng
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody>
          <form id="contract-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {!isEdit && !renewFrom && !employee && (
              <FormField label="Nhân viên" required error={errors.employeeId} className="sm:col-span-2">
                <EmployeePicker
                  value={f.employeeId}
                  selectedLabel={empLabel}
                  invalid={!!errors.employeeId}
                  onChange={(employeeId) => set({ employeeId })}
                />
              </FormField>
            )}
            <FormField label="Loại hợp đồng" required error={errors.typeId}>
              <Select
                value={f.typeId}
                onChange={(typeId) => {
                  setAutoEnd(true);
                  set({ typeId });
                }}
                options={types.map((t) => ({ value: t.id, label: t.name }))}
                placeholder="Chọn loại"
              />
            </FormField>
            <FormField
              label="Số hợp đồng"
              htmlFor="contractNumber"
              hint={isEdit ? undefined : next ? `Bỏ trống để tự cấp: ${next.contractNumber}` : 'Bỏ trống để tự cấp'}
            >
              <Input
                id="contractNumber"
                className="font-mono"
                placeholder={isEdit ? undefined : next?.contractNumber}
                value={f.contractNumber}
                onChange={(e) => set({ contractNumber: e.target.value })}
              />
            </FormField>

            <FormField label="Ngày ký" htmlFor="signDate" required error={errors.signDate}>
              <Input id="signDate" type="date" value={f.signDate} onChange={(e) => set({ signDate: e.target.value })} />
            </FormField>
            <FormField label="Ngày bắt đầu" htmlFor="startDate" required error={errors.startDate}>
              <Input id="startDate" type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} />
            </FormField>
            {(!type || type.hasTerm) && (
              <FormField
                label="Ngày kết thúc"
                htmlFor="endDate"
                required={!!type?.hasTerm}
                error={errors.endDate}
                hint={type?.defaultMonths && autoEnd ? `Tự tính theo thời hạn ${type.defaultMonths} tháng` : undefined}
              >
                <Input
                  id="endDate"
                  type="date"
                  value={f.endDate}
                  aria-invalid={!!errors.endDate}
                  onChange={(e) => {
                    setAutoEnd(false);
                    set({ endDate: e.target.value });
                  }}
                />
              </FormField>
            )}
            {type && !type.hasTerm && <p className="self-end pb-2 text-sm text-muted-foreground">Không xác định thời hạn</p>}

            <FormField label="Chức danh" htmlFor="jobTitle">
              <Input id="jobTitle" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
            </FormField>
            <FormField label="Địa điểm làm việc" htmlFor="workLocation" hint="Bỏ trống thì dùng địa chỉ mặc định trong Cài đặt" className="sm:col-span-2">
              <Input id="workLocation" value={f.workLocation} onChange={(e) => set({ workLocation: e.target.value })} />
            </FormField>

            <div className="mt-2 border-t pt-4 text-sm font-medium sm:col-span-2">Lương và phụ cấp</div>
            <FormField
              label="Lương cơ bản / tháng"
              htmlFor="baseSalary"
              required
              error={errors.baseSalary}
              hint={f.baseSalary ? moneyInWords(f.baseSalary) : undefined}
            >
              <MoneyInput id="baseSalary" value={f.baseSalary} invalid={!!errors.baseSalary} onChange={(baseSalary) => set({ baseSalary })} />
            </FormField>
            <FormField label="Lương đóng BHXH" htmlFor="insuranceSalary" hint="Bỏ trống nếu bằng lương cơ bản">
              <MoneyInput id="insuranceSalary" value={f.insuranceSalary} onChange={(insuranceSalary) => set({ insuranceSalary })} />
            </FormField>
            <FormField label="Phụ cấp hằng tháng" error={errors.allowances} className="sm:col-span-2">
              <AllowancesEditor value={f.allowances} onChange={(allowances) => set({ allowances })} />
            </FormField>
            {f.allowances.length > 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Tổng thu nhập theo hợp đồng <span className="font-mono text-foreground tabular-nums">{new Intl.NumberFormat('vi-VN').format(total)} đ</span>
              </p>
            )}

            <div className="mt-2 border-t pt-4 text-sm font-medium sm:col-span-2">Người ký phía công ty</div>
            <FormField label="Họ tên" htmlFor="signerName" hint="Bỏ trống thì dùng người đại diện trong Cài đặt">
              <Input id="signerName" value={f.signerName} onChange={(e) => set({ signerName: e.target.value })} />
            </FormField>
            <FormField label="Chức vụ" htmlFor="signerTitle">
              <Input id="signerTitle" value={f.signerTitle} onChange={(e) => set({ signerTitle: e.target.value })} />
            </FormField>
            <FormField label="Ghi chú" htmlFor="note" className="sm:col-span-2">
              <Textarea id="note" rows={2} value={f.note} onChange={(e) => set({ note: e.target.value })} />
            </FormField>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="contract-form" loading={save.isPending}>
            {isEdit ? 'Lưu' : 'Tạo hợp đồng'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
