'use client';

import { Briefcase, GraduationCap, Languages } from 'lucide-react';
import { formatDate } from '@/lib/format';
import {
  QUALIFICATION_KIND_LABEL,
  SKILL_KIND_LABEL,
  toOptions,
  type Experience,
  type Qualification,
  type Skill,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChildSection, LevelDots, type Values } from './child-section';

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today())) / 86_400_000);
const range = (from?: string | null, to?: string | null) =>
  from || to ? (
    <span className="font-mono tabular-nums">
      {from ? formatDate(from) : '?'} → {to ? formatDate(to) : 'nay'}
    </span>
  ) : null;
const dateOrder = (a: string, b: string, key: string, msg: string) => (b && a && b < a ? { [key]: msg } : {});

/** Tình trạng hạn chứng chỉ */
function Expiry({ date }: { date?: string | null }) {
  if (!date) return null;
  const d = daysUntil(date);
  const tone = d < 0 ? 'bg-destructive' : d <= 30 ? 'bg-warning' : 'bg-success';
  const text = d < 0 ? 'Đã hết hạn' : d === 0 ? 'Hết hạn hôm nay' : d <= 30 ? `Còn ${d} ngày` : 'Còn hạn';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span className={cn('size-1.5 rounded-full', tone)} />
      {text}
    </span>
  );
}

export function CompetenceTab({ employeeId, canEdit }: { employeeId: string; canEdit: boolean }) {
  return (
    <div className="grid gap-6">
      <ChildSection<Qualification>
        employeeId={employeeId}
        resource="qualifications"
        title="Bằng cấp và chứng chỉ"
        description="Chứng chỉ có ngày hết hạn sẽ được nhắc gia hạn qua email"
        noun="bằng cấp, chứng chỉ"
        icon={GraduationCap}
        emptyTitle="Chưa có bằng cấp, chứng chỉ"
        canEdit={canEdit}
        defaults={() => ({ kind: 'DEGREE' })}
        validate={(v) => dateOrder(String(v.issueDate ?? ''), String(v.expiryDate ?? ''), 'expiryDate', 'Phải sau ngày cấp')}
        fields={[
          { name: 'kind', label: 'Loại', type: 'select', options: toOptions(QUALIFICATION_KIND_LABEL), required: true },
          { name: 'educationLevelId', label: 'Trình độ', type: 'catalog', catalogType: 'EDUCATION', show: (v) => v.kind === 'DEGREE' },
          {
            name: 'name',
            label: 'Tên',
            type: 'text',
            required: true,
            wide: true,
            placeholder: 'Vd Cử nhân Quản trị kinh doanh, IELTS, Chứng chỉ kế toán trưởng',
          },
          { name: 'major', label: 'Chuyên ngành', type: 'text', show: (v) => v.kind === 'DEGREE' },
          { name: 'institution', label: 'Trường / đơn vị cấp', type: 'text' },
          {
            name: 'grade',
            label: 'Xếp loại / điểm',
            type: 'text',
            suggestions: ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình khá', 'Trung bình'],
          },
          { name: 'certificateNumber', label: 'Số hiệu', type: 'text' },
          { name: 'issueDate', label: 'Ngày cấp', type: 'date' },
          { name: 'expiryDate', label: 'Ngày hết hạn', type: 'date', hint: 'Bỏ trống nếu không có thời hạn' },
          { name: 'note', label: 'Ghi chú', type: 'textarea' },
        ]}
        render={(q) => ({
          title: q.name,
          subtitle: [q.major, q.institution].filter(Boolean).join(' · ') || undefined,
          meta: (
            <>
              <span>{QUALIFICATION_KIND_LABEL[q.kind]}</span>
              {q.educationLevel && <span>{q.educationLevel.name}</span>}
              {q.grade && <span>Xếp loại {q.grade}</span>}
              {q.issueDate && (
                <span>
                  Cấp <span className="font-mono tabular-nums">{formatDate(q.issueDate)}</span>
                </span>
              )}
              {q.expiryDate && (
                <span>
                  Hết hạn <span className="font-mono tabular-nums">{formatDate(q.expiryDate)}</span>
                </span>
              )}
            </>
          ),
          aside: <Expiry date={q.expiryDate} />,
        })}
      />

      <ChildSection<Skill>
        employeeId={employeeId}
        resource="skills"
        title="Kỹ năng và ngoại ngữ"
        noun="kỹ năng"
        icon={Languages}
        emptyTitle="Chưa có kỹ năng"
        canEdit={canEdit}
        defaults={() => ({ kind: 'SKILL', level: null })}
        fields={[
          { name: 'kind', label: 'Loại', type: 'select', options: toOptions(SKILL_KIND_LABEL), required: true },
          {
            name: 'name',
            label: 'Tên',
            type: 'text',
            required: true,
            suggestions: ['Tiếng Anh', 'Tiếng Nhật', 'Tiếng Trung', 'Tiếng Hàn', 'Excel', 'Giao tiếp', 'Quản lý dự án'],
          },
          { name: 'level', label: 'Mức độ', type: 'level', wide: true },
          { name: 'note', label: 'Ghi chú', type: 'text', wide: true, placeholder: 'Vd IELTS 7.0, JLPT N2' },
        ]}
        render={(s) => ({
          title: s.name,
          subtitle: s.note ?? undefined,
          meta: <span>{SKILL_KIND_LABEL[s.kind]}</span>,
          aside: <LevelDots value={s.level} />,
        })}
      />

      <ChildSection<Experience>
        employeeId={employeeId}
        resource="experiences"
        title="Kinh nghiệm trước khi vào công ty"
        noun="kinh nghiệm"
        icon={Briefcase}
        emptyTitle="Chưa có kinh nghiệm làm việc"
        canEdit={canEdit}
        defaults={() => ({})}
        validate={(v) => dateOrder(String(v.fromDate ?? ''), String(v.toDate ?? ''), 'toDate', 'Phải sau ngày bắt đầu')}
        fields={[
          { name: 'companyName', label: 'Công ty', type: 'text', required: true, wide: true },
          { name: 'position', label: 'Vị trí', type: 'text', wide: true },
          { name: 'fromDate', label: 'Từ ngày', type: 'date' },
          { name: 'toDate', label: 'Đến ngày', type: 'date' },
          { name: 'description', label: 'Công việc chính', type: 'textarea' },
          { name: 'reference', label: 'Người tham chiếu', type: 'text', wide: true, placeholder: 'Họ tên, chức vụ, số điện thoại' },
        ]}
        render={(x) => ({
          title: x.companyName,
          subtitle: x.position ?? undefined,
          meta: (
            <>
              {range(x.fromDate, x.toDate)}
              {x.reference && <span>Tham chiếu: {x.reference}</span>}
            </>
          ),
        })}
        toValues={(x) => x as unknown as Values}
      />
    </div>
  );
}
