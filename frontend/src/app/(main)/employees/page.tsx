'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, MoreHorizontal, Pencil, Plus, Trash2, Upload, Users, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CodeTag } from '@/components/code-tag';
import { DataTable } from '@/components/data-table/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select } from '@/components/ui/select';
import { useUrlState } from '@/hooks/use-url-state';
import { api, download, fileUrl } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { formatCustomValue, useCustomFields } from '@/lib/custom-fields';
import { useDepartmentOptions, usePositionOptions } from '@/lib/queries';
import { STATUS_LABEL, toOptions, type Employee, type Paginated } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/providers/confirm-provider';
import { EmployeeFormDialog } from './_components/employee-form-dialog';
import { ImportDialog } from './_components/import-dialog';

export default function EmployeesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canCreate = can('employees.create');
  const canUpdate = can('employees.update');
  const canDelete = can('employees.delete');
  const canImport = can('employees.import', 'employees.create');
  const canExport = can('employees.export');
  const { data: customFields = [] } = useCustomFields();
  const listFields = customFields.filter((f) => f.showInList);

  const [q, setQ, { activeFilters, reset }] = useUrlState({ departmentId: '', positionId: '', status: '' });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: departments = [] } = useDepartmentOptions();
  const { data: positions = [] } = usePositionOptions();

  const { data, isFetching } = useQuery({
    queryKey: ['employees', 'list', q],
    queryFn: () => api<Paginated<Employee>>('/employees', { query: q }),
    placeholderData: (prev) => prev,
  });

  // Mở form thêm mới khi vào từ Ctrl+K (?new=1)
  useEffect(() => {
    if (params.get('new') === '1' && canCreate) {
      setEditing(null);
      setFormOpen(true);
      setQ({ new: '' } as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const remove = useMutation({
    mutationFn: (ids: string[]) =>
      ids.length === 1
        ? api(`/employees/${ids[0]}`, { method: 'DELETE' })
        : api('/employees/bulk-delete', { method: 'POST', body: { ids } }),
    onSuccess: (_d, ids) => {
      toast.success(`Đã xoá ${ids.length} nhân viên`);
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const askRemove = async (list: Employee[], done?: () => void) => {
    const ok = await confirm({
      title: list.length === 1 ? `Xoá nhân viên ${list[0].fullName}?` : `Xoá ${list.length} nhân viên đã chọn?`,
      description: 'Hồ sơ được chuyển vào thùng rác (xoá mềm), dữ liệu liên quan vẫn được giữ lại',
      destructive: true,
    });
    if (ok) remove.mutate(list.map((e) => e.id), { onSuccess: done });
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setFormOpen(true);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const { page: _p, limit: _l, ...filters } = q;
      await download('/employees/export', filters, 'nhan-vien.xlsx');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: 'code',
        header: 'Mã NV',
        meta: { title: 'Mã NV', sortKey: 'code', className: 'w-24' },
        cell: ({ row }) => <CodeTag>{row.original.code}</CodeTag>,
      },
      {
        id: 'fullName',
        header: 'Họ tên',
        meta: { title: 'Họ tên', sortKey: 'fullName', alwaysVisible: true },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.original.fullName} src={fileUrl(row.original.avatarUrl)} className="size-8" />
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.fullName}</div>
              <div className="truncate text-xs text-muted-foreground">{row.original.email}</div>
            </div>
          </div>
        ),
      },
      { id: 'phone', header: 'Điện thoại', meta: { title: 'Điện thoại' }, cell: ({ row }) => row.original.phone ?? '—' },
      {
        id: 'department',
        header: 'Phòng ban',
        meta: { title: 'Phòng ban' },
        cell: ({ row }) => row.original.department?.name ?? <span className="text-muted-foreground">—</span>,
      },
      {
        id: 'position',
        header: 'Chức vụ',
        meta: { title: 'Chức vụ' },
        cell: ({ row }) => row.original.position?.name ?? <span className="text-muted-foreground">—</span>,
      },
      {
        id: 'hireDate',
        header: 'Ngày vào làm',
        meta: { title: 'Ngày vào làm', sortKey: 'hireDate' },
        cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{formatDate(row.original.hireDate)}</span>,
      },
      {
        id: 'status',
        header: 'Trạng thái',
        meta: { title: 'Trạng thái', sortKey: 'status' },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      // Trường tuỳ chỉnh được đánh dấu "Hiện trong danh sách"
      ...listFields.map<ColumnDef<Employee>>((f) => ({
        id: `cf_${f.key}`,
        header: f.label,
        meta: { title: f.label },
        cell: ({ row }) => {
          const v = formatCustomValue(f, row.original.customFields?.[f.key]);
          return v ?? <span className="text-muted-foreground">—</span>;
        },
      })),
      {
        id: 'actions',
        meta: { alwaysVisible: true, className: 'w-12 text-right' },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal />
                <span className="sr-only">Thao tác</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => router.push(`/employees/${row.original.id}`)}>
                <Eye /> Xem hồ sơ
              </DropdownMenuItem>
              {canUpdate && (
                <DropdownMenuItem onClick={() => openEdit(row.original)}>
                  <Pencil /> Sửa
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onClick={() => askRemove([row.original])}>
                    <Trash2 /> Xoá
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canUpdate, canDelete, listFields.map((f) => f.id).join()],
  );

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Quản lý hồ sơ toàn bộ nhân sự trong công ty"
        breadcrumbs={[{ label: 'Nhân viên' }]}
        actions={
          <>
            {canExport && (
              <Button variant="outline" onClick={exportExcel} loading={exporting}>
                {!exporting && <Download />} Xuất Excel
              </Button>
            )}
            {canImport && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload /> Nhập Excel
              </Button>
            )}
            {canCreate && (
              <>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus /> Thêm nhân viên
                </Button>
              </>
            )}
          </>
        }
      />

      <DataTable
        id="employees"
        columns={columns}
        data={data}
        loading={isFetching}
        sortBy={q.sortBy}
        order={q.order}
        onSortChange={(sortBy, order) => setQ({ sortBy, order })}
        onPageChange={(page) => setQ({ page })}
        onLimitChange={(limit) => setQ({ limit })}
        onRowClick={(e) => router.push(`/employees/${e.id}`)}
        selectable={canDelete}
        bulkActions={(rows, clear) => (
          <Button variant="destructive" size="sm" onClick={() => askRemove(rows, clear)}>
            <Trash2 /> Xoá {rows.length} nhân viên
          </Button>
        )}
        toolbar={
          <>
            <SearchInput value={q.search} onChange={(search) => setQ({ search })} placeholder="Tìm tên, mã, email, SĐT…" />
            <Combobox
              className="h-8 w-full sm:w-48"
              value={q.departmentId}
              onChange={(departmentId) => setQ({ departmentId })}
              options={departments}
              placeholder="Phòng ban"
              searchPlaceholder="Tìm phòng ban…"
            />
            <Combobox
              className="h-8 w-full sm:w-40"
              value={q.positionId}
              onChange={(positionId) => setQ({ positionId })}
              options={positions}
              placeholder="Chức vụ"
              searchPlaceholder="Tìm chức vụ…"
            />
            <Select
              className="h-8 w-full sm:w-40"
              value={q.status}
              onChange={(status) => setQ({ status })}
              options={toOptions(STATUS_LABEL)}
              placeholder="Trạng thái"
              clearable
              clearLabel="Tất cả trạng thái"
            />
            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X /> Xoá lọc ({activeFilters})
              </Button>
            )}
          </>
        }
        empty={
          q.search || activeFilters ? (
            <EmptyState
              title="Không tìm thấy nhân viên phù hợp"
              description="Thử đổi từ khoá hoặc bỏ bớt bộ lọc"
              action={
                <Button variant="outline" size="sm" onClick={reset}>
                  Xoá bộ lọc
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="Chưa có nhân viên nào"
              description="Thêm từng người hoặc nhập cả danh sách từ Excel"
              action={
                canCreate && (
                  <div className="flex gap-2">
                    {canImport && (
                      <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                        <Upload /> Nhập Excel
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setFormOpen(true)}>
                      <Plus /> Thêm nhân viên
                    </Button>
                  </div>
                )
              }
            />
          )
        }
      />

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
