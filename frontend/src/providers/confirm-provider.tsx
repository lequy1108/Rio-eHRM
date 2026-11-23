'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** Nút xác nhận màu đỏ (dùng cho xoá) */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Hộp thoại xác nhận thay cho window.confirm():
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Xoá?', destructive: true })) { ... }
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  // Tách trạng thái mở khỏi nội dung: khi đóng chỉ tắt `open`, giữ nguyên nội dung
  // để hiệu ứng đóng không bị nháy sang tiêu đề trống và nút mặc định
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(open) => !open && close(false)}>
        <AlertDialogContent>
          <div className="space-y-2">
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel onClick={() => close(false)}>{options?.cancelText ?? 'Huỷ'}</AlertDialogCancel>
            <AlertDialogAction destructive={options?.destructive} onClick={() => close(true)}>
              {options?.confirmText ?? (options?.destructive ? 'Xoá' : 'Đồng ý')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm phải dùng trong <ConfirmProvider>');
  return ctx;
}
