'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, FileImage, FileSpreadsheet, FileText, FolderOpen, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, download, openFile, upload } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useCatalogOptions } from '@/lib/queries';
import type { EmployeeDocument } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/confirm-provider';

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';
const MAX_MB = 10;

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const iconFor = (mime: string) =>
  mime.startsWith('image/') ? FileImage : /sheet|excel/.test(mime) ? FileSpreadsheet : FileText;

type Draft = { file?: File; categoryId: string; name: string; note: string };

export function DocumentsTab({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const base = `/employees/${employeeId}/documents`;
  const key = ['employees', 'detail', employeeId, 'documents'];
  const { data = [], isLoading } = useQuery({ queryKey: key, queryFn: () => api<EmployeeDocument[]>(base) });
  const { data: categories = [] } = useCatalogOptions('DOCUMENT_TYPE');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['employees', 'detail', employeeId] });

  const save = useMutation({
    mutationFn: (d: Draft) =>
      editing
        ? api(`${base}/${editing.id}`, { method: 'PATCH', body: { categoryId: d.categoryId || null, name: d.name, note: d.note } })
        : upload(base, d.file!, { categoryId: d.categoryId, name: d.name, note: d.note }),
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật tài liệu' : 'Đã tải lên tài liệu');
      invalidate();
      setDraft(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`${base}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá tài liệu');
      invalidate();
    },
  });

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.categoryId ?? '', (m.get(d.categoryId ?? '') ?? 0) + 1);
    return m;
  }, [data]);
  const rows = filter ? data.filter((d) => (d.categoryId ?? '') === filter) : data;

  const pick = (f?: File) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`File tối đa ${MAX_MB} MB`);
    setEditing(null);
    setDraft({ file: f, categoryId: '', name: f.name.replace(/\.[^.]+$/, ''), note: '' });
  };

  const view = (d: EmployeeDocument) => openFile(`${base}/${d.id}/file`).catch((e: Error) => toast.error(e.message));

  return (
    <Card
      onDragOver={(e) => canEdit && e.preventDefault()}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        pick(e.dataTransfer.files[0]);
      }}
    >
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Tài liệu</CardTitle>
          <CardDescription>
            PDF, Word, Excel hoặc ảnh, tối đa {MAX_MB} MB. Chỉ người có quyền xem tài liệu mới mở được, kể cả khi có đường dẫn
          </CardDescription>
        </div>
        {canEdit && (
          <>
            <Button size="sm" variant="outline" onClick={() => input.current?.click()}>
              <Upload /> Tải lên
            </Button>
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </>
        )}
      </CardHeader>
      <CardContent className={cn(data.length > 0 && 'px-0 pb-2')}>
        {data.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-6 pb-3">
            {[{ value: '', label: 'Tất cả' }, ...categories.filter((c) => counts.has(c.value))].map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs transition-colors',
                  filter === c.value ? 'bg-card font-medium text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted',
                )}
              >
                {c.label}
                <span className="ml-1.5 font-mono tabular-nums opacity-70">{c.value ? counts.get(c.value) : data.length}</span>
              </button>
            ))}
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Chưa có tài liệu"
            description={canEdit ? 'Kéo thả file vào đây hoặc bấm Tải lên' : undefined}
            className="py-8"
          />
        ) : (
          <ul className="divide-y border-t">
            {rows.map((d) => {
              const Icon = iconFor(d.mimeType);
              return (
                <li key={d.id} className="flex items-center gap-3 px-6 py-2.5">
                  <Icon className="size-5 shrink-0 text-muted-foreground" />
                  <button className="min-w-0 flex-1 text-left" onClick={() => view(d)}>
                    <div className="truncate text-sm font-medium hover:underline">{d.name}</div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{d.category?.name ?? 'Chưa phân loại'}</span>
                      <span className="font-mono tabular-nums">{size(d.size)}</span>
                      <span className="font-mono tabular-nums">{formatDate(d.createdAt)}</span>
                      {d.note && <span className="truncate">{d.note}</span>}
                    </div>
                  </button>
                  <Button variant="ghost" size="icon-sm" aria-label="Tải về" onClick={() => download(`${base}/${d.id}/file`, { download: 1 }, d.originalName)}>
                    <Download />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="-mr-2" aria-label="Thao tác">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => view(d)}>
                        <Eye /> Xem
                      </DropdownMenuItem>
                      {canEdit && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(d);
                              setDraft({ categoryId: d.categoryId ?? '', name: d.name, note: d.note ?? '' });
                            }}
                          >
                            <Pencil /> Sửa thông tin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            destructive
                            onClick={async () => {
                              if (await confirm({ title: `Xoá tài liệu ${d.name}?`, destructive: true })) remove.mutate(d.id);
                            }}
                          >
                            <Trash2 /> Xoá
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Sửa thông tin tài liệu' : 'Tải lên tài liệu'}</DialogTitle>
          </DialogHeader>
          {draft && (
            <DialogBody>
              <form
                id="doc-form"
                className="grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.name.trim()) return toast.error('Vui lòng nhập tên tài liệu');
                  save.mutate(draft);
                }}
              >
                {draft.file && (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{draft.file.name}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{size(draft.file.size)}</span>
                  </div>
                )}
                <FormField label="Loại tài liệu">
                  <Combobox
                    value={draft.categoryId}
                    onChange={(categoryId) => setDraft({ ...draft, categoryId })}
                    options={categories}
                    placeholder="Chọn loại"
                    searchPlaceholder="Tìm…"
                  />
                </FormField>
                <FormField label="Tên tài liệu" htmlFor="doc-name" required>
                  <Input id="doc-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </FormField>
                <FormField label="Ghi chú" htmlFor="doc-note">
                  <Textarea id="doc-note" rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                </FormField>
              </form>
            </DialogBody>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Huỷ
            </Button>
            <Button type="submit" form="doc-form" loading={save.isPending}>
              {editing ? 'Lưu' : 'Tải lên'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
