'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Braces } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { SHEET_CSS } from '@/lib/contract-sheet';
import type { ContractTemplate } from '@/lib/types';
import { ToggleRow } from '../../../_components/settings-kit';

type Placeholder = { key: string; label: string; group: string };

const STARTER = `<p class="center"><strong>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br><strong>Độc lập – Tự do – Hạnh phúc</strong></p>
<h1>TIÊU ĐỀ VĂN BẢN</h1>
<p class="center">Số: {{so_hop_dong}}</p>
<p>Nội dung…</p>`;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const qc = useQueryClient();
  const area = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [f, setF] = useState<{ name: string; description: string; content: string; isDefault: boolean } | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data: tpl, isLoading } = useQuery({
    queryKey: ['contract-templates', id],
    queryFn: () => api<ContractTemplate>(`/contract-templates/${id}`),
    enabled: !isNew,
  });
  const { data: placeholders = [] } = useQuery({
    queryKey: ['contract-templates', 'placeholders'],
    queryFn: () => api<Placeholder[]>('/contract-templates/placeholders'),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (isNew) setF({ name: '', description: '', content: STARTER, isDefault: false });
    else if (tpl) setF({ name: tpl.name, description: tpl.description ?? '', content: tpl.content ?? '', isDefault: tpl.isDefault });
  }, [isNew, tpl]);

  // Nhắc khi rời trang mà chưa lưu
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name: f!.name, description: f!.description || null, content: f!.content, isDefault: f!.isDefault };
      return isNew
        ? api<ContractTemplate>('/contract-templates', { method: 'POST', body })
        : api<ContractTemplate>(`/contract-templates/${id}`, { method: 'PATCH', body });
    },
    onSuccess: (t) => {
      toast.success('Đã lưu mẫu hợp đồng');
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['contract-templates'] });
      if (isNew) router.replace(`/settings/contracts/templates/${t.id}`);
    },
  });

  const groups = useMemo(() => {
    const m = new Map<string, Placeholder[]>();
    for (const p of placeholders) m.set(p.group, [...(m.get(p.group) ?? []), p]);
    return [...m.entries()];
  }, [placeholders]);

  const labels = useMemo(() => new Map(placeholders.map((p) => [p.key, p.label])), [placeholders]);
  const preview = useMemo(
    () =>
      (f?.content ?? '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, k: string) => {
        const label = labels.get(k.toLowerCase());
        return label
          ? `<span style="background:#e7eefe;border-radius:3px;padding:0 3px;font-family:system-ui;font-size:10pt">${esc(label)}</span>`
          : `<mark>{{${esc(k)}}}</mark>`;
      }),
    [f?.content, labels],
  );

  if (!f || (!isNew && isLoading)) return <Skeleton className="h-[70vh] w-full" />;

  const set = (patch: Partial<typeof f>) => {
    setF({ ...f, ...patch });
    setDirty(true);
  };

  const insert = (key: string) => {
    const el = area.current;
    const token = `{{${key}}}`;
    if (!el || mode !== 'edit') {
      set({ content: f.content + token });
      return;
    }
    const { selectionStart: a, selectionEnd: b } = el;
    set({ content: f.content.slice(0, a) + token + f.content.slice(b) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings/contracts">
            <ArrowLeft /> Mẫu hợp đồng
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">Có thay đổi chưa lưu</span>}
          <Button disabled={!dirty || !f.name.trim() || !f.content.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            Lưu mẫu
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <FormField label="Tên mẫu" htmlFor="tpl-name" required>
            <Input id="tpl-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Vd Hợp đồng lao động xác định thời hạn" />
          </FormField>
          <FormField label="Mô tả" htmlFor="tpl-desc">
            <Input id="tpl-desc" value={f.description} onChange={(e) => set({ description: e.target.value })} />
          </FormField>
          <div className="sm:col-span-2">
            <ToggleRow id="tpl-default" checked={f.isDefault} onChange={(isDefault) => set({ isDefault })} label="Dùng làm mẫu mặc định khi in" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Nội dung</CardTitle>
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'edit' | 'preview')}>
              <TabsList>
                <TabsTrigger value="edit">Soạn</TabsTrigger>
                <TabsTrigger value="preview">Xem trước</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {mode === 'edit' ? (
              <>
                <Textarea
                  ref={area}
                  value={f.content}
                  onChange={(e) => set({ content: e.target.value })}
                  spellCheck={false}
                  className="min-h-[60vh] font-mono text-[13px] leading-relaxed"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Viết bằng HTML. Thẻ hay dùng: &lt;h1&gt; tiêu đề, &lt;h2&gt; điều khoản, &lt;p&gt; đoạn, &lt;ol&gt;&lt;li&gt; danh sách đánh số, &lt;strong&gt; in
                  đậm; class center căn giữa, table class info hoặc sign cho bảng thông tin và chữ ký
                </p>
              </>
            ) : (
              <div className="overflow-auto rounded-lg border bg-muted/40 p-4">
                <style>{SHEET_CSS}</style>
                <div className="mx-auto w-[210mm] max-w-full bg-white px-[20mm] py-[16mm] shadow-sm">
                  <div className="contract-sheet" dangerouslySetInnerHTML={{ __html: preview }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start xl:sticky xl:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Braces className="size-4" /> Chèn biến
            </CardTitle>
            <p className="text-xs text-muted-foreground">Bấm để chèn vào vị trí con trỏ</p>
          </CardHeader>
          <CardContent className="grid max-h-[60vh] gap-4 overflow-y-auto">
            {groups.map(([g, items]) => (
              <div key={g} className="grid gap-1">
                <div className="text-xs font-medium text-muted-foreground">{g}</div>
                {items.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insert(p.key)}
                    className="grid rounded-md px-2 py-1 text-left transition-colors hover:bg-muted"
                    title={`{{${p.key}}}`}
                  >
                    <span className="text-sm">{p.label}</span>
                    <span className="font-mono text-[11px] break-all text-muted-foreground">{p.key}</span>
                  </button>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
