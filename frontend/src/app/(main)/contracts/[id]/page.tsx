'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Download,
  Eye,
  FileSignature,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { CodeTag } from '@/components/code-tag';
import { ContractFormDialog } from '@/components/contracts/contract-form-dialog';
import { AllowancesEditor, ContractStateBadge, fmtMoney, MoneyInput } from '@/components/contracts/parts';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, download, fileUrl, openFile, upload } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Allowance, Contract, ContractAppendix } from '@/lib/types';
import { moneyInWords } from '@/lib/vn-money';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';

const today = () => new Date().toISOString().slice(0, 10);

function Row({ label, children, mono }: { label: string; children?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 break-words', mono && 'font-mono tabular-nums')}>{children || <span className="font-sans text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function TerminateDialog({ contract, open, onOpenChange }: { contract: Contract; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => api(`/contracts/${contract.id}/terminate`, { method: 'POST', body: { terminatedDate: date, terminationReason: reason } }),
    onSuccess: () => {
      toast.success('Đã chấm dứt hợp đồng');
      qc.invalidateQueries({ queryKey: ['contracts'] });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chấm dứt hợp đồng {contract.contractNumber}</DialogTitle>
          <DialogDescription>Hợp đồng chuyển sang Đã chấm dứt và không sửa được nữa</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <FormField label="Ngày chấm dứt" htmlFor="t-date" required>
            <Input id="t-date" type="date" value={date} min={contract.startDate} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Lý do" htmlFor="t-reason" required hint="Vd hết hạn không gia hạn, người lao động xin nghỉ, hai bên thoả thuận">
            <Textarea id="t-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button variant="destructive" disabled={!date || !reason.trim()} loading={m.isPending} onClick={() => m.mutate()}>
            Chấm dứt hợp đồng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AppendixForm = {
  appendixNumber: string;
  signDate: string;
  effectiveDate: string;
  content: string;
  jobTitle: string;
  baseSalary: number | null;
  insuranceSalary: number | null;
  allowances: Allowance[] | null;
};

function AppendixDialog({
  contract,
  appendix,
  open,
  onOpenChange,
}: {
  contract: Contract;
  appendix: ContractAppendix | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<AppendixForm | null>(null);
  if (open && !f) {
    setF({
      appendixNumber: appendix?.appendixNumber ?? '',
      signDate: appendix?.signDate ?? today(),
      effectiveDate: appendix?.effectiveDate ?? today(),
      content: appendix?.content ?? '',
      jobTitle: appendix?.jobTitle ?? '',
      baseSalary: appendix?.baseSalary ?? null,
      insuranceSalary: appendix?.insuranceSalary ?? null,
      allowances: appendix?.allowances ?? null,
    });
  }
  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setF(null);
  };
  const m = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      appendix
        ? api(`/contracts/${contract.id}/appendices/${appendix.id}`, { method: 'PATCH', body })
        : api(`/contracts/${contract.id}/appendices`, { method: 'POST', body }),
    onSuccess: () => {
      toast.success(appendix ? 'Đã cập nhật phụ lục' : 'Đã thêm phụ lục');
      qc.invalidateQueries({ queryKey: ['contracts'] });
      close(false);
    },
  });
  if (!f) return null;
  const set = (p: Partial<AppendixForm>) => setF({ ...f, ...p });
  const cur = contract.current;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{appendix ? `Sửa phụ lục ${appendix.appendixNumber}` : 'Thêm phụ lục hợp đồng'}</DialogTitle>
          <DialogDescription>Chỉ điền mục thay đổi, mục để trống giữ như hiện tại</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form
            id="appendix-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate({
                appendixNumber: f.appendixNumber || undefined,
                signDate: f.signDate,
                effectiveDate: f.effectiveDate,
                content: f.content || null,
                jobTitle: f.jobTitle || null,
                baseSalary: f.baseSalary,
                insuranceSalary: f.insuranceSalary,
                allowances: f.allowances,
              });
            }}
          >
            <FormField label="Số phụ lục" htmlFor="a-num" hint={appendix ? undefined : 'Bỏ trống để tự đánh số'} className="sm:col-span-2">
              <Input id="a-num" className="font-mono" value={f.appendixNumber} onChange={(e) => set({ appendixNumber: e.target.value })} />
            </FormField>
            <FormField label="Ngày ký" htmlFor="a-sign" required>
              <Input id="a-sign" type="date" value={f.signDate} onChange={(e) => set({ signDate: e.target.value })} />
            </FormField>
            <FormField label="Ngày hiệu lực" htmlFor="a-eff" required>
              <Input id="a-eff" type="date" value={f.effectiveDate} min={contract.startDate} max={contract.endDate ?? undefined} onChange={(e) => set({ effectiveDate: e.target.value })} />
            </FormField>
            <FormField label="Chức danh mới" htmlFor="a-title" hint={cur?.jobTitle ? `Hiện tại: ${cur.jobTitle}` : undefined}>
              <Input id="a-title" value={f.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
            </FormField>
            <FormField label="Lương cơ bản mới" hint={`Hiện tại: ${fmtMoney(cur?.baseSalary)} đ`}>
              <MoneyInput value={f.baseSalary} onChange={(baseSalary) => set({ baseSalary })} />
            </FormField>
            <FormField label="Lương đóng BHXH mới">
              <MoneyInput value={f.insuranceSalary} onChange={(insuranceSalary) => set({ insuranceSalary })} />
            </FormField>
            <FormField label="Phụ cấp" className="sm:col-span-2" hint={f.allowances === null ? 'Giữ như hiện tại' : 'Danh sách này thay toàn bộ phụ cấp hiện tại'}>
              {f.allowances === null ? (
                <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => set({ allowances: cur?.allowances ?? [] })}>
                  Đổi phụ cấp
                </Button>
              ) : (
                <AllowancesEditor value={f.allowances} onChange={(allowances) => set({ allowances })} />
              )}
            </FormField>
            <FormField label="Nội dung phụ lục" htmlFor="a-content" className="sm:col-span-2">
              <Textarea id="a-content" rows={3} value={f.content} onChange={(e) => set({ content: e.target.value })} />
            </FormField>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Huỷ
          </Button>
          <Button type="submit" form="appendix-form" loading={m.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canManage = can('contracts.manage');
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<'edit' | 'renew' | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [appendix, setAppendix] = useState<ContractAppendix | null | 'new'>(null);

  const { data: c, isLoading, error } = useQuery({ queryKey: ['contracts', 'detail', id], queryFn: () => api<Contract>(`/contracts/${id}`) });

  const remove = useMutation({
    mutationFn: () => api(`/contracts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá hợp đồng');
      qc.invalidateQueries({ queryKey: ['contracts'] });
      router.push('/contracts');
    },
  });
  const attach = useMutation({
    mutationFn: (f: File) => upload(`/contracts/${id}/signed-file`, f),
    onSuccess: () => {
      toast.success('Đã lưu bản scan');
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
  const removeAppendix = useMutation({
    mutationFn: (aid: string) => api(`/contracts/${id}/appendices/${aid}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá phụ lục');
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (error || !c) return <EmptyState icon={FileSignature} title="Không tìm thấy hợp đồng" description={(error as Error)?.message} />;

  const e = c.employee!;
  const cur = c.current!;
  const editable = canManage && c.status === 'ACTIVE';
  const changed = (c.appendices ?? []).some((a) => a.effectiveDate <= today());
  const total = cur.baseSalary + cur.allowances.reduce((s, a) => s + a.amount, 0);

  return (
    <>
      <PageHeader
        title={`Hợp đồng ${c.contractNumber}`}
        description={c.type?.name}
        breadcrumbs={[{ label: 'Hợp đồng', href: '/contracts' }, { label: c.contractNumber }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/print/contracts/${c.id}`} target="_blank">
                <Printer /> In hợp đồng
              </Link>
            </Button>
            {canManage && !c.renewedBy && c.status === 'ACTIVE' && c.endDate && (
              <Button variant="outline" onClick={() => setForm('renew')}>
                <RefreshCw /> Gia hạn
              </Button>
            )}
            {editable && (
              <Button onClick={() => setForm('edit')}>
                <Pencil /> Sửa
              </Button>
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Thao tác khác">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {c.status === 'ACTIVE' && (
                    <DropdownMenuItem onClick={() => setTerminating(true)}>
                      <Ban /> Chấm dứt hợp đồng
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Xoá hợp đồng ${c.contractNumber}?`,
                        description: 'Chỉ dùng khi tạo nhầm. Hợp đồng đã ký thật nên chọn Chấm dứt để giữ lịch sử',
                        destructive: true,
                      });
                      if (ok) remove.mutate();
                    }}
                  >
                    <Trash2 /> Xoá
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Thông tin hợp đồng</CardTitle>
              <ContractStateBadge contract={c} />
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label="Số hợp đồng">
                  <CodeTag>{c.contractNumber}</CodeTag>
                </Row>
                <Row label="Loại">{c.type?.name}</Row>
                <Row label="Ngày ký" mono>
                  {formatDate(c.signDate)}
                </Row>
                <Row label="Thời hạn" mono>
                  {formatDate(c.startDate)} → {c.endDate ? formatDate(c.endDate) : <span className="font-sans">không xác định</span>}
                </Row>
                <Row label="Chức danh">{cur.jobTitle}</Row>
                <Row label="Địa điểm làm việc">{c.workLocation}</Row>
                <Row label="Người ký phía công ty">{[c.signerName, c.signerTitle].filter(Boolean).join(', ')}</Row>
                {c.previousContract && (
                  <Row label="Gia hạn từ">
                    <Link href={`/contracts/${c.previousContract.id}`} className="text-primary hover:underline">
                      {c.previousContract.contractNumber}
                    </Link>
                  </Row>
                )}
                {c.renewedBy && (
                  <Row label="Đã gia hạn bằng">
                    <Link href={`/contracts/${c.renewedBy.id}`} className="text-primary hover:underline">
                      {c.renewedBy.contractNumber}
                    </Link>
                  </Row>
                )}
                {c.status === 'TERMINATED' && (
                  <Row label="Chấm dứt">
                    <span className="font-mono tabular-nums">{formatDate(c.terminatedDate)}</span> · {c.terminationReason}
                  </Row>
                )}
                {c.note && <Row label="Ghi chú">{c.note}</Row>}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lương và phụ cấp</CardTitle>
              {changed && <p className="text-sm text-muted-foreground">Đang áp dụng theo phụ lục mới nhất đã có hiệu lực</p>}
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label="Lương cơ bản">
                  <span className="font-mono tabular-nums">{fmtMoney(cur.baseSalary)} đ</span>
                  <div className="text-xs text-muted-foreground">{moneyInWords(cur.baseSalary)}</div>
                </Row>
                <Row label="Lương đóng BHXH" mono>
                  {fmtMoney(cur.insuranceSalary ?? cur.baseSalary)} đ
                </Row>
                {cur.allowances.map((a) => (
                  <Row key={a.name} label={`Phụ cấp ${a.name.toLowerCase()}`} mono>
                    {fmtMoney(a.amount)} đ
                  </Row>
                ))}
                <Row label="Tổng thu nhập">
                  <span className="font-mono font-medium tabular-nums">{fmtMoney(total)} đ</span>
                </Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Phụ lục</CardTitle>
              {editable && (
                <Button size="sm" variant="outline" onClick={() => setAppendix('new')}>
                  <Plus /> Thêm phụ lục
                </Button>
              )}
            </CardHeader>
            <CardContent className={cn((c.appendices?.length ?? 0) > 0 && 'px-0 pb-2')}>
              {!c.appendices?.length ? (
                <p className="text-sm text-muted-foreground">Chưa có phụ lục. Dùng khi thay đổi lương, phụ cấp hoặc chức danh trong thời hạn hợp đồng</p>
              ) : (
                <ul className="divide-y">
                  {c.appendices.map((a) => (
                    <li key={a.id} className="flex items-start gap-4 px-6 py-3">
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <CodeTag>{a.appendixNumber}</CodeTag>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">hiệu lực {formatDate(a.effectiveDate)}</span>
                          {a.effectiveDate > today() && <span className="text-xs text-muted-foreground">· chưa áp dụng</span>}
                        </div>
                        <div className="mt-1 grid gap-0.5 text-muted-foreground">
                          {a.baseSalary != null && (
                            <span>
                              Lương cơ bản <span className="font-mono text-foreground tabular-nums">{fmtMoney(a.baseSalary)} đ</span>
                            </span>
                          )}
                          {a.insuranceSalary != null && (
                            <span>
                              Lương đóng BHXH <span className="font-mono text-foreground tabular-nums">{fmtMoney(a.insuranceSalary)} đ</span>
                            </span>
                          )}
                          {a.jobTitle && <span>Chức danh {a.jobTitle}</span>}
                          {a.allowances && <span>Phụ cấp: {a.allowances.map((x) => `${x.name} ${fmtMoney(x.amount)}`).join(', ') || 'bỏ hết'}</span>}
                          {a.content && <span>{a.content}</span>}
                        </div>
                      </div>
                      {editable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="-mr-2" aria-label="Thao tác">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setAppendix(a)}>
                              <Pencil /> Sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onClick={async () => {
                                if (await confirm({ title: `Xoá phụ lục ${a.appendixNumber}?`, destructive: true })) removeAppendix.mutate(a.id);
                              }}
                            >
                              <Trash2 /> Xoá
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <Link href={`/employees/${e.id}?tab=contracts`} className="-m-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60">
                <Avatar name={e.fullName} src={fileUrl(e.avatarUrl)} className="size-11" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{e.fullName}</div>
                  <div className="truncate text-xs text-muted-foreground">{[e.code, e.position?.name, e.department?.name].filter(Boolean).join(' · ')}</div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bản đã ký</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {c.signedFileName ? (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <button
                    className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
                    onClick={() => openFile(`/contracts/${c.id}/signed-file`).catch((x: Error) => toast.error(x.message))}
                  >
                    {c.signedFileName}
                  </button>
                  <Button variant="ghost" size="icon-sm" aria-label="Xem" onClick={() => openFile(`/contracts/${c.id}/signed-file`)}>
                    <Eye />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Tải về"
                    onClick={() => download(`/contracts/${c.id}/signed-file`, { download: 1 }, c.signedFileName ?? 'hop-dong.pdf')}
                  >
                    <Download />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có bản scan hợp đồng đã ký</p>
              )}
              {canManage && (
                <>
                  <Button variant="outline" size="sm" className="justify-self-start" loading={attach.isPending} onClick={() => fileInput.current?.click()}>
                    <Upload /> {c.signedFileName ? 'Thay bản scan' : 'Tải lên bản scan'}
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    hidden
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      ev.target.value = '';
                      if (f && f.size > 15 * 1024 * 1024) return toast.error('File tối đa 15 MB');
                      if (f) attach.mutate(f);
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ContractFormDialog open={form === 'edit'} onOpenChange={(o) => !o && setForm(null)} contract={c} />
      <ContractFormDialog open={form === 'renew'} onOpenChange={(o) => !o && setForm(null)} renewFrom={c} />
      <TerminateDialog contract={c} open={terminating} onOpenChange={setTerminating} />
      <AppendixDialog
        contract={c}
        appendix={appendix === 'new' ? null : appendix}
        open={appendix !== null}
        onOpenChange={(o) => !o && setAppendix(null)}
      />
    </>
  );
}
