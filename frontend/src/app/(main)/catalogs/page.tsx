'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListTree, MoreHorizontal, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CodeTag } from '@/components/code-tag';
import { SearchInput } from '@/components/data-table/search-input';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUrlState } from '@/hooks/use-url-state';
import { api } from '@/lib/api';
import { CATALOG_TYPE_LABEL, type CatalogItem, type CatalogType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/providers/confirm-provider';

const TYPES = Object.keys(CATALOG_TYPE_LABEL) as CatalogType[];

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const schema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã').max(50).regex(/^[A-Za-z0-9_.-]+$/, 'Chỉ gồm chữ không dấu, số, dấu chấm, - và _'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên').max(255),
  shortName: z.string().trim().max(100),
  sortOrder: z.coerce.number<string>().int('Phải là số nguyên').min(0, 'Nhỏ nhất là 0'),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function ItemDialog({
  open,
  onOpenChange,
  type,
  item,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type: CatalogType;
  item: CatalogItem | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open)
      reset({
        code: item?.code ?? '',
        name: item?.name ?? '',
        shortName: item?.shortName ?? '',
        sortOrder: item ? String(item.sortOrder) : '',
      });
  }, [open, item, reset]);

  const save = useMutation({
    meta: { silent: true },
    mutationFn: (v: FormValues) => {
      const body = { ...v, shortName: v.shortName || null };
      return isEdit
        ? api(`/catalogs/${item!.id}`, { method: 'PATCH', body })
        : api('/catalogs', { method: 'POST', body: { ...body, type, sortOrder: v.sortOrder || undefined } });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Đã cập nhật' : 'Đã thêm vào danh mục');
      qc.invalidateQueries({ queryKey: ['catalogs'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      if (/tồn tại/i.test(err.message)) setError('code', { message: 'Mã đã tồn tại trong danh mục này' });
      else toast.error(err.message);
    },
  });

  const label = CATALOG_TYPE_LABEL[type].toLowerCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Sửa ${label}` : `Thêm ${label}`}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <form id="catalog-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Mã" htmlFor="code" required error={errors.code?.message}>
              <Input id="code" autoFocus aria-invalid={!!errors.code} {...register('code')} />
            </FormField>
            <FormField label="Thứ tự" htmlFor="sortOrder" error={errors.sortOrder?.message} hint="Để trống để xếp cuối">
              <Input id="sortOrder" type="number" min={0} aria-invalid={!!errors.sortOrder} {...register('sortOrder')} />
            </FormField>
            <FormField label="Tên" htmlFor="name" required error={errors.name?.message} className="sm:col-span-2">
              <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField
              label="Tên viết tắt"
              htmlFor="shortName"
              error={errors.shortName?.message}
              hint={type === 'BANK' ? 'Vd Vietcombank, BIDV' : undefined}
              className="sm:col-span-2"
            >
              <Input id="shortName" {...register('shortName')} />
            </FormField>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="catalog-form" loading={save.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CatalogsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [q, setQ] = useUrlState({ type: 'ETHNICITY' });
  const type = (TYPES.includes(q.type as CatalogType) ? q.type : 'ETHNICITY') as CatalogType;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  const { data: counts } = useQuery({
    queryKey: ['catalogs', 'counts'],
    queryFn: () => api<Record<CatalogType, number>>('/catalogs/counts'),
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['catalogs', type, 'all'],
    queryFn: () => api<CatalogItem[]>('/catalogs', { query: { type, activeOnly: false } }),
  });

  const rows = useMemo(() => {
    const s = normalize(q.search.trim());
    if (!s) return items ?? [];
    return (items ?? []).filter((i) => normalize(`${i.code} ${i.name} ${i.shortName ?? ''}`).includes(s));
  }, [items, q.search]);

  const toggle = useMutation({
    mutationFn: (i: CatalogItem) => api(`/catalogs/${i.id}`, { method: 'PATCH', body: { isActive: !i.isActive } }),
    onSuccess: (_d, i) => {
      toast.success(i.isActive ? `Đã ngừng dùng ${i.name}` : `Đã dùng lại ${i.name}`);
      qc.invalidateQueries({ queryKey: ['catalogs'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/catalogs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá khỏi danh mục');
      qc.invalidateQueries({ queryKey: ['catalogs'] });
    },
  });

  const openForm = (i: CatalogItem | null) => {
    setEditing(i);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Danh mục"
        description="Dữ liệu dùng chung cho hồ sơ nhân viên"
        breadcrumbs={[{ label: 'Danh mục' }]}
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus /> Thêm {CATALOG_TYPE_LABEL[type].toLowerCase()}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={type} onValueChange={(v) => setQ({ type: v, search: '' })}>
          <TabsList>
            {TYPES.map((t) => (
              <TabsTrigger key={t} value={t}>
                {CATALOG_TYPE_LABEL[t]}
                {counts && <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">{counts[t]}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchInput value={q.search} onChange={(search) => setQ({ search })} placeholder="Tìm mã hoặc tên…" />
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ListTree} title={q.search ? 'Không tìm thấy mục nào' : 'Danh mục trống'} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-right">Thứ tự</TableHead>
                <TableHead className="w-36">Mã</TableHead>
                <TableHead>Tên</TableHead>
                {type === 'BANK' && <TableHead className="w-40">Viết tắt</TableHead>}
                <TableHead className="w-28">Trạng thái</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((i) => (
                <TableRow key={i.id} className={cn(!i.isActive && 'text-muted-foreground')}>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">{i.sortOrder}</TableCell>
                  <TableCell>
                    <CodeTag>{i.code}</CodeTag>
                  </TableCell>
                  <TableCell className={cn(i.isActive && 'font-medium')}>{i.name}</TableCell>
                  {type === 'BANK' && <TableCell>{i.shortName ?? '—'}</TableCell>}
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={cn('size-1.5 rounded-full', i.isActive ? 'bg-success' : 'bg-muted-foreground/40')} />
                      {i.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Thao tác">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(i)}>
                          <Pencil /> Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggle.mutate(i)}>
                          <Power /> {i.isActive ? 'Ngừng dùng' : 'Dùng lại'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          destructive
                          onClick={async () => {
                            const ok = await confirm({
                              title: `Xoá ${i.name}?`,
                              description: 'Hồ sơ đang dùng mục này sẽ bị bỏ trống. Nếu chỉ muốn ẩn khỏi ô chọn, hãy chọn Ngừng dùng',
                              destructive: true,
                            });
                            if (ok) remove.mutate(i.id);
                          }}
                        >
                          <Trash2 /> Xoá
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
