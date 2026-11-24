'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { ContractTemplate } from '@/lib/types';
import { SHEET_CSS } from '@/lib/contract-sheet';
import { useAuth } from '@/providers/auth-provider';

type Rendered = { html: string; title: string; empty: string[]; unknown: string[]; template: { id: string; name: string } };


export default function PrintContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [templateId, setTemplateId] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=/print/contracts/${id}`);
  }, [loading, user, id, router]);

  const { data: templates = [] } = useQuery({
    queryKey: ['contract-templates'],
    queryFn: () => api<ContractTemplate[]>('/contract-templates'),
    enabled: !!user,
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ['contracts', 'render', id, templateId],
    queryFn: () => api<Rendered>(`/contracts/${id}/render`, { query: { templateId } }),
    enabled: !!user,
  });

  useEffect(() => {
    if (data?.title) document.title = data.title;
  }, [data?.title]);

  return (
    <div className="min-h-screen bg-muted/60 print:bg-white">
      <style>{SHEET_CSS}</style>
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-2 py-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/contracts/${id}`}>
              <ArrowLeft /> Quay lại
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {templates.length > 1 && (
              <Select
                className="h-8 w-56"
                value={templateId || data?.template.id || ''}
                onChange={setTemplateId}
                options={templates.map((t) => ({ value: t.id, label: t.name }))}
              />
            )}
            <Button size="sm" onClick={() => window.print()} disabled={!data}>
              <Printer /> In / Lưu PDF
            </Button>
          </div>
        </div>
        {data && (data.empty.length > 0 || data.unknown.length > 0) && (
          <div className="mx-auto flex max-w-[210mm] items-start gap-2 px-4 pb-3 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              {data.empty.length > 0 && <>Hồ sơ còn thiếu: {data.empty.join(', ')}. Các chỗ này để trống dạng dấu chấm để điền tay. </>}
              {data.unknown.length > 0 && <>Mẫu có biến không tồn tại: {data.unknown.map((u) => `{{${u}}}`).join(', ')}</>}
            </span>
          </div>
        )}
      </div>

      <div className="mx-auto my-6 w-[210mm] max-w-full bg-white px-[20mm] py-[20mm] pl-[25mm] shadow-sm print:my-0 print:w-auto print:p-0 print:shadow-none">
        {isLoading || !user ? (
          <div className="space-y-3">
            <Skeleton className="mx-auto h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : (
          // Mẫu do người có quyền quản lý hợp đồng soạn, backend đã lọc script; giá trị điền vào đã escape
          <div className="contract-sheet" dangerouslySetInnerHTML={{ __html: data!.html }} />
        )}
      </div>
    </div>
  );
}
