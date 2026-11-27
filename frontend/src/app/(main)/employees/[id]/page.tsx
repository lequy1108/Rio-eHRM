'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, Calendar, CalendarClock, Mail, Pencil, Phone, Trash2, User } from 'lucide-react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, upload } from '@/lib/api';
import { age, formatDate, formatTenure } from '@/lib/format';
import { GENDER_LABEL, MARITAL_LABEL, type Employee } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';
import { EmployeeBadge } from '../_components/employee-badge';
import { EmployeeFormDialog } from '../_components/employee-form-dialog';
import { formatCustomValue, groupBySection, useCustomFields } from '@/lib/custom-fields';
import { CareerTab } from './_components/career-tab';
import { CompetenceTab } from './_components/competence-tab';
import { ContractsTab } from './_components/contracts-tab';
import { CustomFieldsDialog } from './_components/custom-fields-dialog';
import { DocumentsTab } from './_components/documents-tab';
import { DependentsTab } from './_components/dependents-tab';
import { HistoryTab } from './_components/history-tab';
import { Info, Section } from './_components/section';
import { SectionDialogs, type SectionKey } from './_components/section-dialogs';

const TABS = ['overview', 'personal', 'competence', 'career', 'contracts', 'finance', 'dependents', 'documents', 'history'] as const;
type Tab = (typeof TABS)[number];

/** Còn bao nhiêu ngày đến hết thử việc */
function probationLeft(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
  return d > 0 ? `còn ${d} ngày` : d === 0 ? 'hôm nay' : `quá ${-d} ngày`;
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canEdit = can('employees.update');
  const canDelete = can('employees.delete');
  const canSensitive = can('employees.sensitive');
  const canDocuments = can('employees.documents');
  const canContracts = can('contracts.view');
  const { data: customFields = [] } = useCustomFields();
  const [customSection, setCustomSection] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [section, setSection] = useState<SectionKey | null>(null);

  // Tab lưu trên URL (?tab=) để F5 hay gửi link vẫn mở đúng tab
  const visible = TABS.filter(
    (t) => (canSensitive || (t !== 'finance' && t !== 'dependents')) && (canDocuments || t !== 'documents') && (canContracts || t !== 'contracts'),
  );
  const raw = params.get('tab') as Tab | null;
  const tab: Tab = raw && visible.includes(raw) ? raw : 'overview';
  const setTab = (t: string) => {
    const sp = new URLSearchParams(params.toString());
    if (t === 'overview') sp.delete('tab');
    else sp.set('tab', t);
    router.replace(`${pathname}${sp.size ? `?${sp}` : ''}`, { scroll: false });
  };

  const { data: e, isLoading, error } = useQuery({
    queryKey: ['employees', 'detail', id],
    queryFn: () => api<Employee>(`/employees/${id}`),
  });

  const avatar = useMutation({
    mutationFn: (f: File) => upload<{ avatarUrl: string }>(`/employees/${id}/avatar`, f),
    onSuccess: () => {
      toast.success('Đã cập nhật ảnh đại diện');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Đã xoá nhân viên');
      qc.invalidateQueries({ queryKey: ['employees'] });
      router.push('/employees');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }
  if (error || !e) {
    return <EmptyState icon={User} title="Không tìm thấy nhân viên" description={(error as Error)?.message} />;
  }

  const years = age(e.dateOfBirth);
  const edit = (s: SectionKey) => (canEdit ? () => setSection(s) : undefined);

  return (
    <>
      <PageHeader
        title={e.fullName}
        breadcrumbs={[{ label: 'Nhân viên', href: '/employees' }, { label: e.fullName }]}
        actions={
          (canEdit || canDelete) && (
            <>
              {canDelete && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (await confirm({ title: `Xoá nhân viên ${e.fullName}?`, destructive: true })) remove.mutate();
                }}
              >
                <Trash2 /> Xoá
              </Button>
              )}
              {canEdit && (
                <Button onClick={() => setEditOpen(true)}>
                  <Pencil /> Sửa hồ sơ
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <EmployeeBadge employee={e} canEdit={canEdit} uploading={avatar.isPending} onAvatar={(f) => avatar.mutate(f)} />
        </div>
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList>
                <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                <TabsTrigger value="personal">Cá nhân</TabsTrigger>
                <TabsTrigger value="competence">Năng lực</TabsTrigger>
                <TabsTrigger value="career">Công tác</TabsTrigger>
                {canContracts && <TabsTrigger value="contracts">Hợp đồng</TabsTrigger>}
                {canSensitive && <TabsTrigger value="finance">Thuế · Ngân hàng</TabsTrigger>}
                {canSensitive && <TabsTrigger value="dependents">Người phụ thuộc</TabsTrigger>}
                {canDocuments && <TabsTrigger value="documents">Tài liệu</TabsTrigger>}
                <TabsTrigger value="history">Lịch sử</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="grid gap-6">
              <Section title="Liên hệ">
                <Info icon={Mail} label="Email" value={e.email} />
                <Info icon={Phone} label="Số điện thoại" value={e.phone} mono />
                <Info icon={User} label="Giới tính" value={e.gender && GENDER_LABEL[e.gender]} />
                <Info
                  icon={Calendar}
                  label="Ngày sinh"
                  value={
                    e.dateOfBirth && (
                      <>
                        <span className="font-mono tabular-nums">{formatDate(e.dateOfBirth)}</span>
                        {years !== null && <span className="text-muted-foreground"> · {years} tuổi</span>}
                      </>
                    )
                  }
                />
              </Section>
              <Section title="Công việc">
                <Info icon={Building2} label="Phòng ban" value={e.department?.name} />
                <Info icon={Briefcase} label="Chức vụ" value={e.position?.name} />
                <Info icon={Calendar} label="Ngày vào làm" value={formatDate(e.hireDate)} mono />
                <Info icon={Calendar} label="Thâm niên" value={formatTenure(e.hireDate)} />
                {e.probationEnd && (
                  <Info
                    icon={CalendarClock}
                    label="Hết thử việc"
                    value={
                      <>
                        <span className="font-mono tabular-nums">{formatDate(e.probationEnd.date)}</span>
                        <span className="text-muted-foreground">
                          {' · '}
                          {probationLeft(e.probationEnd.date)}
                          {e.probationEnd.source === 'estimate' && ', ước tính theo số tháng thử việc trong Cài đặt'}
                        </span>
                      </>
                    }
                  />
                )}
                <Info
                  icon={User}
                  label="Quản lý trực tiếp"
                  value={
                    e.manager && (
                      <button className="text-primary hover:underline" onClick={() => router.push(`/employees/${e.manager!.id}`)}>
                        {e.manager.fullName}
                      </button>
                    )
                  }
                />
              </Section>
            </TabsContent>

            <TabsContent value="personal" className="grid gap-6">
              <Section title="Thông tin cá nhân" onEdit={edit('personal')}>
                <Info label="Tình trạng hôn nhân" value={e.maritalStatus && MARITAL_LABEL[e.maritalStatus]} />
                <Info label="Quốc tịch" value={e.nationality} />
                <Info label="Dân tộc" value={e.ethnicity?.name} />
                <Info label="Tôn giáo" value={e.religion?.name} />
                <Info label="Trình độ học vấn" value={e.educationLevel?.name} />
                <Info label="Quê quán" value={e.hometownProvince?.name} />
              </Section>
              <Section title="Căn cước công dân" onEdit={edit('personal')}>
                <Info label="Số CCCD" value={e.identityNumber} mono className="sm:col-span-2" />
                <Info label="Ngày cấp" value={e.identityIssuedDate && formatDate(e.identityIssuedDate)} mono />
                <Info label="Nơi cấp" value={e.identityIssuedPlace} />
                <Info label="Thường trú" value={e.permanentAddress} className="sm:col-span-2" />
                <Info label="Nơi ở hiện tại" value={e.address} className="sm:col-span-2" />
              </Section>
              <Section title="Liên hệ khẩn cấp" onEdit={edit('emergency')}>
                <Info
                  label="Họ tên"
                  value={
                    e.emergencyContactName && (
                      <>
                        {e.emergencyContactName}
                        {e.emergencyContactRelation && <span className="text-muted-foreground"> · {e.emergencyContactRelation}</span>}
                      </>
                    )
                  }
                />
                <Info
                  label="Số điện thoại"
                  mono
                  value={e.emergencyContactPhone && <a href={`tel:${e.emergencyContactPhone}`} className="hover:underline">{e.emergencyContactPhone}</a>}
                />
              </Section>
              {/* Trường do admin tự thêm (Cài đặt → Trường tuỳ chỉnh) */}
              {groupBySection(customFields.filter((f) => canSensitive || !f.sensitive)).map((g) => (
                <Section key={g.section} title={g.section} onEdit={canEdit ? () => setCustomSection(g.section) : undefined}>
                  {g.fields.map((f) => (
                    <Info
                      key={f.id}
                      label={f.label}
                      value={formatCustomValue(f, e.customFields?.[f.key])}
                      mono={f.type === 'DATE' || f.type === 'NUMBER'}
                      className={f.type === 'TEXTAREA' ? 'sm:col-span-2' : undefined}
                    />
                  ))}
                </Section>
              ))}
            </TabsContent>

            {canSensitive && (
              <TabsContent value="finance" className="grid gap-6">
                <Section title="Thuế và bảo hiểm" onEdit={edit('tax')}>
                  <Info
                    label="Mã số thuế cá nhân"
                    mono
                    value={
                      e.personalTaxCode && (
                        <>
                          {e.personalTaxCode}
                          {e.personalTaxCode === e.identityNumber && (
                            <span className="ml-2 font-sans text-xs text-muted-foreground">trùng số CCCD</span>
                          )}
                        </>
                      )
                    }
                  />
                  <Info label="Mã số BHXH" value={e.socialInsuranceNumber} mono />
                  <Info label="Nơi khám chữa bệnh ban đầu" value={e.healthInsurancePlace} className="sm:col-span-2" />
                </Section>
                <Section title="Tài khoản nhận lương" onEdit={edit('bank')}>
                  <Info label="Ngân hàng" value={e.bank && (e.bank.shortName ? `${e.bank.shortName} · ${e.bank.name}` : e.bank.name)} className="sm:col-span-2" />
                  <Info label="Số tài khoản" value={e.bankAccountNumber} mono />
                  <Info label="Chủ tài khoản" value={e.bankAccountName} />
                  <Info label="Chi nhánh" value={e.bankBranch} />
                </Section>
              </TabsContent>
            )}

            {canSensitive && (
              <TabsContent value="dependents">
                <DependentsTab employeeId={e.id} canEdit={canEdit} />
              </TabsContent>
            )}

            <TabsContent value="competence">
              <CompetenceTab employeeId={e.id} canEdit={canEdit} />
            </TabsContent>

            <TabsContent value="career">
              <CareerTab employee={e} canEdit={canEdit} />
            </TabsContent>

            {canContracts && (
              <TabsContent value="contracts">
                <ContractsTab employee={e} canManage={can('contracts.manage')} />
              </TabsContent>
            )}

            {canDocuments && (
              <TabsContent value="documents">
                <DocumentsTab employeeId={e.id} canEdit={canEdit} />
              </TabsContent>
            )}

            <TabsContent value="history">
              <HistoryTab employeeId={e.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={e} />
      {canEdit && <SectionDialogs section={section} onClose={() => setSection(null)} employee={e} />}
      {canEdit && (
        <CustomFieldsDialog
          employee={e}
          fields={customFields.filter((f) => f.section === customSection && (canSensitive || !f.sensitive))}
          title={customSection ?? ''}
          open={!!customSection}
          onOpenChange={(o) => !o && setCustomSection(null)}
        />
      )}
    </>
  );
}
