'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export type SettingGroup = 'company' | 'branding' | 'employee' | 'mail' | 'security';
export type AllSettings = Record<SettingGroup, Record<string, unknown>>;

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => api<AllSettings>('/settings') });
}

/** Lưu một nhóm cài đặt; báo lỗi theo từng trường nếu backend trả về danh sách lỗi */
export function useSaveSettings(group: SettingGroup) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api<Record<string, unknown>>(`/settings/${group}`, { method: 'PUT', body }),
    onSuccess: (data) => {
      qc.setQueryData<AllSettings>(['settings'], (old) => (old ? { ...old, [group]: data } : old));
      qc.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Đã lưu cài đặt');
    },
  });
}

/** Nạp giá trị đã lưu vào form khi có dữ liệu */
export function useLoadForm<T extends FieldValues>(form: UseFormReturn<T>, values: T | undefined) {
  useEffect(() => {
    if (values) form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);
}

/** Khung một trang cài đặt: tiêu đề, mô tả, nội dung và nút Lưu dính dưới đáy */
export function SettingsCard({
  title,
  description,
  children,
  formId,
  dirty,
  saving,
  onReset,
  loading,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  formId?: string;
  dirty?: boolean;
  saving?: boolean;
  onReset?: () => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={cn('grid gap-5', className)}>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-9 w-1/2" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      {formId && (
        <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
          {dirty && <span className="mr-auto text-xs text-muted-foreground">Có thay đổi chưa lưu</span>}
          {onReset && (
            <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={onReset}>
              Hoàn tác
            </Button>
          )}
          <Button type="submit" form={formId} disabled={!dirty} loading={saving}>
            Lưu thay đổi
          </Button>
        </div>
      )}
    </Card>
  );
}

/** Ô tích có nhãn và mô tả, dùng cho cài đặt bật/tắt */
export function ToggleRow({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

/** Đặt lỗi từ backend (mảng thông báo) lên ô tương ứng theo từ khoá; còn lại hiện toast */
export function applyServerErrors(message: string, map: Record<string, RegExp>, setError: (k: string, msg: string) => void) {
  let rest = message;
  for (const part of message.split(/,\s(?=[A-ZĐÂ])/)) {
    const hit = Object.entries(map).find(([, re]) => re.test(part));
    if (hit) {
      setError(hit[0], part);
      rest = rest.replace(part, '');
    }
  }
  return rest.replace(/^[,\s]+|[,\s]+$/g, '');
}
