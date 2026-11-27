'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EmployeePicker } from '@/components/employee-picker';
import { FormField } from '@/components/form-field';
import { InviteResultsDialog, type InviteResult } from '@/components/invite-results';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useDepartmentOptions, usePositionOptions } from '@/lib/queries';
import { GENDER_LABEL, STATUS_LABEL, toOptions, type Employee } from '@/lib/types';

const schema = z.object({
  code: z.string().trim().max(50, 'Tối đa 50 ký tự'),
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(255),
  email: z.string().trim().min(1, 'Vui lòng nhập email').pipe(z.email('Email không hợp lệ')),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d[\d\s.-]{7,18})?$/, 'Số điện thoại không hợp lệ'),
  gender: z.string(),
  dateOfBirth: z.string(),
  identityNumber: z
    .string()
    .trim()
    .regex(/^(\d{9}|\d{12})?$/, 'CCCD gồm 12 số (CMND cũ 9 số)'),
  address: z.string().trim(),
  hireDate: z.string().min(1, 'Vui lòng chọn ngày vào làm'),
  status: z.string(),
  departmentId: z.string(),
  positionId: z.string(),
  managerId: z.string(),
});

type FormValues = z.infer<typeof schema>;

const toForm = (e?: Employee | null): FormValues => ({
  code: e?.code ?? '',
  fullName: e?.fullName ?? '',
  email: e?.email ?? '',
  phone: e?.phone ?? '',
  gender: e?.gender ?? '',
  dateOfBirth: e?.dateOfBirth ?? '',
  identityNumber: e?.identityNumber ?? '',
  address: e?.address ?? '',
  hireDate: e?.hireDate ?? new Date().toISOString().slice(0, 10),
  status: e?.status ?? 'PROBATION',
  departmentId: e?.departmentId ?? '',
  positionId: e?.positionId ?? '',
  managerId: e?.managerId ?? '',
});

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Có = sửa, không có = thêm mới */
  employee?: Employee | null;
  onSaved?: (e: Employee) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!employee;
  const { can } = useAuth();
  const canInvite = !isEdit && can('users.manage');
  const [invite, setInvite] = useState(true);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const { data: departments = [] } = useDepartmentOptions();
  const { data: positions = [] } = usePositionOptions();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(employee) });

  useEffect(() => {
    if (open) reset(toForm(employee));
  }, [open, employee, reset]);

  const mutation = useMutation({
    meta: { silent: true },
    mutationFn: (values: FormValues) => {
      // Thêm mới: bỏ trường trống. Sửa: gửi null để xoá giá trị cũ
      const body = Object.fromEntries(
        Object.entries(values)
          .map(([k, v]) => [k, v === '' ? (isEdit && k !== 'code' ? null : undefined) : v])
          .filter(([, v]) => v !== undefined),
      );
      return isEdit
        ? api<Employee>(`/employees/${employee!.id}`, { method: 'PATCH', body })
        : api<Employee>('/employees', { method: 'POST', body });
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? 'Đã cập nhật nhân viên' : `Đã thêm nhân viên ${saved.fullName} (${saved.code})`);
      if (canInvite && invite && saved.email) {
        // Hồ sơ đã lưu; lỗi tạo tài khoản chỉ báo riêng, không chặn
        api<InviteResult[]>('/users/invite', { method: 'POST', body: { employeeIds: [saved.id] } })
          .then(([r]) => {
            qc.invalidateQueries({ queryKey: ['users'] });
            if (r?.status === 'sent') toast.success(`Đã gửi email mời tới ${r.email}`);
            else if (r) setResults([r]);
          })
          .catch((e: Error) => toast.error(`Chưa tạo được tài khoản: ${e.message}`));
      }
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (err: Error) => {
      // Gắn lỗi trùng email/mã vào đúng ô
      if (/email/i.test(err.message)) setError('email', { message: err.message });
      else if (/mã nhân viên/i.test(err.message)) setError('code', { message: err.message });
      else toast.error(err.message);
    },
  });

  return (
    <>
    <InviteResultsDialog results={results} onClose={() => setResults(null)} />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa nhân viên ${employee?.code}` : 'Thêm nhân viên'}</DialogTitle>
          <DialogDescription>Các ô có dấu * là bắt buộc</DialogDescription>
        </DialogHeader>

        <DialogBody>
        <form id="employee-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Thông tin cá nhân</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Họ và tên" htmlFor="fullName" required error={errors.fullName?.message} className="sm:col-span-2">
                <Input id="fullName" autoFocus aria-invalid={!!errors.fullName} {...register('fullName')} />
              </FormField>
              <FormField label="Email" htmlFor="email" required error={errors.email?.message}>
                <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
              </FormField>
              <FormField label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" aria-invalid={!!errors.phone} {...register('phone')} />
              </FormField>
              <FormField label="Giới tính">
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onChange={field.onChange} options={toOptions(GENDER_LABEL)} clearable clearLabel="—" placeholder="Chọn giới tính" />
                  )}
                />
              </FormField>
              <FormField label="Ngày sinh" htmlFor="dateOfBirth">
                <Input id="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} {...register('dateOfBirth')} />
              </FormField>
              <FormField label="Số CCCD" htmlFor="identityNumber" error={errors.identityNumber?.message}>
                <Input id="identityNumber" inputMode="numeric" aria-invalid={!!errors.identityNumber} {...register('identityNumber')} />
              </FormField>
              <FormField label="Địa chỉ" htmlFor="address" className="sm:col-span-2">
                <Textarea id="address" rows={2} {...register('address')} />
              </FormField>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Công việc</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Mã nhân viên" htmlFor="code" error={errors.code?.message} hint={isEdit ? undefined : 'Bỏ trống để tự sinh (NV0001…)'}>
                <Input id="code" aria-invalid={!!errors.code} {...register('code')} />
              </FormField>
              <FormField label="Ngày vào làm" htmlFor="hireDate" required error={errors.hireDate?.message}>
                <Input id="hireDate" type="date" aria-invalid={!!errors.hireDate} {...register('hireDate')} />
              </FormField>
              <FormField label="Phòng ban">
                <Controller
                  control={control}
                  name="departmentId"
                  render={({ field }) => (
                    <Combobox value={field.value} onChange={field.onChange} options={departments} placeholder="Chọn phòng ban" searchPlaceholder="Tìm phòng ban…" />
                  )}
                />
              </FormField>
              <FormField label="Chức vụ">
                <Controller
                  control={control}
                  name="positionId"
                  render={({ field }) => (
                    <Combobox value={field.value} onChange={field.onChange} options={positions} placeholder="Chọn chức vụ" searchPlaceholder="Tìm chức vụ…" />
                  )}
                />
              </FormField>
              <FormField label="Quản lý trực tiếp">
                <Controller
                  control={control}
                  name="managerId"
                  render={({ field }) => (
                    <EmployeePicker
                      value={field.value}
                      onChange={field.onChange}
                      excludeId={employee?.id}
                      selectedLabel={employee?.manager?.fullName}
                      placeholder="Chọn quản lý"
                    />
                  )}
                />
              </FormField>
              <FormField label="Trạng thái">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => <Select value={field.value} onChange={field.onChange} options={toOptions(STATUS_LABEL)} />}
                />
              </FormField>
            </div>
          </section>
        </form>
        </DialogBody>

        <DialogFooter>
          {canInvite && (
            <label className="mr-auto flex cursor-pointer items-center gap-2 self-center text-sm">
              <Checkbox checked={invite} onCheckedChange={(c) => setInvite(!!c)} />
              Tạo tài khoản và gửi email mời
            </label>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="employee-form" loading={mutation.isPending}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
