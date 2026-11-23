'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Download, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { download, upload } from '@/lib/api';
import type { ImportResult } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Nhập nhân viên từ Excel: chọn file → kiểm tra → xem lỗi theo dòng → nhập */
export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const check = useMutation({
    mutationFn: (f: File) => upload<ImportResult>('/employees/import?dryRun=true', f),
    onSuccess: setResult,
  });

  const run = useMutation({
    mutationFn: (f: File) => upload<ImportResult>('/employees/import?dryRun=false', f),
    onSuccess: (r) => {
      toast.success(`Đã nhập ${r.created} nhân viên`);
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      onOpenChange(false);
      reset();
    },
  });

  const pick = (f?: File | null) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      toast.error('Chỉ hỗ trợ file .xlsx');
      return;
    }
    setFile(f);
    setResult(null);
    check.mutate(f);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nhập nhân viên từ Excel</DialogTitle>
          <DialogDescription>
            Tải file mẫu, điền dữ liệu rồi kéo thả vào đây. Hệ thống kiểm tra toàn bộ file trước khi nhập.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => download('/employees/import/template', undefined, 'mau-nhap-nhan-vien.xlsx')}
        >
          <Download /> Tải file mẫu
        </Button>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'hover:border-primary/50 hover:bg-muted/50',
          )}
        >
          {file ? <FileSpreadsheet className="size-8 text-success" /> : <Upload className="size-8 text-muted-foreground" />}
          <div className="text-sm">
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              <>
                <span className="font-medium text-primary">Chọn file</span> hoặc kéo thả file .xlsx vào đây
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        {check.isPending && <p className="text-sm text-muted-foreground">Đang kiểm tra file…</p>}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">Tổng {result.total} dòng</Badge>
              <Badge variant="success">{result.valid} hợp lệ</Badge>
              {result.errors.length > 0 && <Badge variant="destructive">{result.errors.length} dòng lỗi</Badge>}
            </div>

            {result.errors.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <TriangleAlert className="size-4" /> Sửa các lỗi sau trong file rồi chọn lại:
                </p>
                {result.errors.map((e) => (
                  <div key={e.row} className="text-sm">
                    <span className="font-medium">Dòng {e.row}:</span> {e.messages.join('; ')}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-success">
                  <CircleCheck className="size-4" /> File hợp lệ, sẵn sàng nhập {result.valid} nhân viên
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.preview.map((p) => (
                    <li key={p.row}>
                      {p.fullName} · {p.email}
                      {p.department && ` · ${p.department}`}
                    </li>
                  ))}
                  {result.valid > result.preview.length && <li>… và {result.valid - result.preview.length} người khác</li>}
                </ul>
              </div>
            )}
          </div>
        )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            disabled={!file || !result || result.errors.length > 0 || result.valid === 0}
            loading={run.isPending}
            onClick={() => file && run.mutate(file)}
          >
            Nhập {result?.valid ? `${result.valid} nhân viên` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
