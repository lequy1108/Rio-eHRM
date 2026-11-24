'use client';

import { ArrowRight, Award, Route } from 'lucide-react';
import { formatDate } from '@/lib/format';
import {
  REWARD_KIND_LABEL,
  toOptions,
  WORK_CHANGE_LABEL,
  type Employee,
  type Reward,
  type WorkHistory,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChildSection } from './child-section';

const money = (n?: number | null) => (n ? `${new Intl.NumberFormat('vi-VN').format(n)} đ` : null);

/** Hình thức kỷ luật theo Điều 124 Bộ luật Lao động 2019 */
const DISCIPLINE_FORMS = ['Khiển trách', 'Kéo dài thời hạn nâng lương', 'Cách chức', 'Sa thải'];
const REWARD_FORMS = ['Giấy khen', 'Bằng khen', 'Tiền thưởng', 'Nâng lương trước hạn'];

function Change({ from, to }: { from?: string | null; to?: string | null }) {
  if ((from ?? null) === (to ?? null)) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>{from || 'Trống'}</span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">{to || 'Trống'}</span>
    </span>
  );
}

export function CareerTab({ employee, canEdit }: { employee: Employee; canEdit: boolean }) {
  const applied = (w: WorkHistory | null) => w?.status === 'APPLIED';
  return (
    <div className="grid gap-6">
      <ChildSection<WorkHistory>
        employeeId={employee.id}
        resource="work-history"
        title="Quá trình công tác"
        description="Điều chuyển, thăng chức, bổ nhiệm. Đến ngày hiệu lực, phòng ban, chức vụ và quản lý trong hồ sơ tự cập nhật"
        noun="quyết định công tác"
        icon={Route}
        emptyTitle="Chưa có quyết định nào"
        canEdit={canEdit}
        defaults={() => ({
          type: 'TRANSFER',
          effectiveDate: new Date().toISOString().slice(0, 10),
          toDepartmentId: employee.departmentId ?? '',
          toPositionId: employee.positionId ?? '',
          toManagerId: employee.managerId ?? '',
        })}
        toValues={(w) => ({ ...w, toDepartmentId: w.toDepartmentId ?? '', toPositionId: w.toPositionId ?? '', toManagerId: w.toManagerId ?? '' })}
        validate={(v, w): Record<string, string> =>
          !applied(w) &&
          v.type !== 'OTHER' &&
          (v.toDepartmentId || null) === (employee.departmentId ?? null) &&
          (v.toPositionId || null) === (employee.positionId ?? null) &&
          (v.toManagerId || null) === (employee.managerId ?? null)
            ? { toDepartmentId: 'Chọn phòng ban, chức vụ hoặc quản lý mới khác hiện tại' }
            : {}
        }
        dialogNote={(w) =>
          applied(w) ? (
            <p className="mb-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Quyết định đã áp dụng vào hồ sơ, chỉ sửa được số quyết định và ghi chú
            </p>
          ) : (
            <p className="mb-4 text-sm text-muted-foreground">
              Ngày hiệu lực từ hôm nay trở về trước thì áp dụng ngay, sau hôm nay thì chờ đến ngày
            </p>
          )
        }
        deleteWarning={(w) => (applied(w) ? 'Hồ sơ không tự đổi lại phòng ban, chức vụ cũ. Muốn đổi lại hãy tạo quyết định mới' : undefined)}
        fields={[
          { name: 'type', label: 'Loại', type: 'select', options: toOptions(WORK_CHANGE_LABEL), required: true, disabled: applied },
          { name: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true, disabled: applied },
          { name: 'toDepartmentId', label: 'Phòng ban mới', type: 'department', disabled: applied },
          { name: 'toPositionId', label: 'Chức vụ mới', type: 'position', disabled: applied },
          {
            name: 'toManagerId',
            label: 'Quản lý trực tiếp mới',
            type: 'employee',
            wide: true,
            disabled: applied,
            selectedLabel: (w) => (w ? w.toManager?.fullName : employee.manager?.fullName),
          },
          { name: 'decisionNumber', label: 'Số quyết định', type: 'text', placeholder: 'Vd 12/2026/QĐ-NS' },
          { name: 'note', label: 'Ghi chú', type: 'textarea' },
        ]}
        render={(w) => ({
          title: (
            <span className="inline-flex flex-wrap items-center gap-2">
              {WORK_CHANGE_LABEL[w.type]}
              <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{formatDate(w.effectiveDate)}</span>
            </span>
          ),
          subtitle: (
            <span className="grid gap-0.5">
              <Change from={w.fromDepartment?.name} to={w.toDepartment?.name} />
              <Change from={w.fromPosition?.name} to={w.toPosition?.name} />
              <Change from={w.fromManager?.fullName} to={w.toManager?.fullName} />
            </span>
          ),
          meta: (
            <>
              {w.decisionNumber && <span>Quyết định {w.decisionNumber}</span>}
              {w.note && <span>{w.note}</span>}
            </>
          ),
          aside: (
            <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
              <span className={cn('size-1.5 rounded-full', w.status === 'APPLIED' ? 'bg-success' : 'bg-warning')} />
              {w.status === 'APPLIED' ? 'Đã áp dụng' : 'Chờ hiệu lực'}
            </span>
          ),
        })}
      />

      <ChildSection<Reward>
        employeeId={employee.id}
        resource="rewards"
        title="Khen thưởng và kỷ luật"
        noun="quyết định"
        icon={Award}
        emptyTitle="Chưa có khen thưởng hay kỷ luật"
        canEdit={canEdit}
        defaults={() => ({ kind: 'REWARD', decisionDate: new Date().toISOString().slice(0, 10) })}
        fields={[
          { name: 'kind', label: 'Loại', type: 'select', options: toOptions(REWARD_KIND_LABEL), required: true },
          { name: 'decisionDate', label: 'Ngày quyết định', type: 'date', required: true },
          { name: 'title', label: 'Nội dung', type: 'text', required: true, wide: true, placeholder: 'Vd Nhân viên xuất sắc quý 3' },
          {
            name: 'form',
            label: 'Hình thức',
            type: 'text',
            suggestions: [...REWARD_FORMS, ...DISCIPLINE_FORMS],
            hint: 'Kỷ luật theo Bộ luật Lao động: khiển trách, kéo dài thời hạn nâng lương, cách chức, sa thải',
          },
          { name: 'decisionNumber', label: 'Số quyết định', type: 'text' },
          { name: 'amount', label: 'Số tiền (VND)', type: 'money', hint: 'Tiền thưởng hoặc bồi thường, nếu có' },
          { name: 'reason', label: 'Lý do', type: 'textarea' },
        ]}
        render={(r) => ({
          title: r.title,
          subtitle: r.reason ?? undefined,
          meta: (
            <>
              <span className={cn(r.kind === 'DISCIPLINE' && 'text-destructive')}>{REWARD_KIND_LABEL[r.kind]}</span>
              {r.form && <span>{r.form}</span>}
              <span className="font-mono tabular-nums">{formatDate(r.decisionDate)}</span>
              {r.decisionNumber && <span>Quyết định {r.decisionNumber}</span>}
            </>
          ),
          aside: r.amount ? <span className="font-mono tabular-nums">{money(r.amount)}</span> : undefined,
        })}
      />
    </div>
  );
}
