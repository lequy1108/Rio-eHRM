import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmail } from 'class-validator';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { DataSource, In, Repository } from 'typeorm';
import { paginate, safeSort } from '../../common/dto/pagination-query.dto';
import { AuditService } from '../../common/audit/audit.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import type { CustomField } from '../custom-fields/custom-field.entity';
import { SettingsService } from '../settings/settings.service';
import { AuditAction, EmployeeStatus, Gender, MaritalStatus } from '../../common/enums';
import { ExcelColumn, ExcelService, toIsoDate, toViDate } from '../../common/shared/excel.service';
import { UPLOAD_ROOT } from '../../common/shared/upload';
import { Department } from '../departments/entities/department.entity';
import { Position } from '../positions/entities/position.entity';
import { CreateEmployeeDto, QueryEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { Employee } from './entities/employee.entity';

const SORTABLE = ['code', 'fullName', 'email', 'hireDate', 'status', 'createdAt', 'dateOfBirth'];

export const GENDER_LABEL: Record<Gender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  PROBATION: 'Thử việc',
  ACTIVE: 'Chính thức',
  ON_LEAVE: 'Nghỉ dài hạn',
  RESIGNED: 'Đã nghỉ việc',
};
export const MARITAL_LABEL: Record<MaritalStatus, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Ly hôn',
  WIDOWED: 'Goá',
};

/** Ảnh chụp hồ sơ ở dạng hiển thị (tên thay vì id) để ghi lịch sử thay đổi */
export function employeeSnapshot(e: Employee, custom: Record<string, unknown> = {}) {
  return {
    ...custom,
    code: e.code,
    fullName: e.fullName,
    email: e.email,
    phone: e.phone ?? null,
    gender: e.gender ? GENDER_LABEL[e.gender] : null,
    dateOfBirth: e.dateOfBirth ?? null,
    nationality: e.nationality ?? null,
    maritalStatus: e.maritalStatus ? MARITAL_LABEL[e.maritalStatus] : null,
    ethnicity: e.ethnicity?.name ?? null,
    religion: e.religion?.name ?? null,
    educationLevel: e.educationLevel?.name ?? null,
    hometownProvince: e.hometownProvince?.name ?? null,
    identityNumber: e.identityNumber ?? null,
    identityIssuedDate: e.identityIssuedDate ?? null,
    identityIssuedPlace: e.identityIssuedPlace ?? null,
    permanentAddress: e.permanentAddress ?? null,
    address: e.address ?? null,
    emergencyContactName: e.emergencyContactName ?? null,
    emergencyContactRelation: e.emergencyContactRelation ?? null,
    emergencyContactPhone: e.emergencyContactPhone ?? null,
    personalTaxCode: e.personalTaxCode ?? null,
    socialInsuranceNumber: e.socialInsuranceNumber ?? null,
    healthInsurancePlace: e.healthInsurancePlace ?? null,
    bank: e.bank ? (e.bank.shortName ?? e.bank.name) : null,
    bankAccountNumber: e.bankAccountNumber ?? null,
    bankAccountName: e.bankAccountName ?? null,
    bankBranch: e.bankBranch ?? null,
    hireDate: e.hireDate,
    status: STATUS_LABEL[e.status],
    department: e.department?.name ?? null,
    position: e.position?.name ?? null,
    manager: e.manager?.fullName ?? null,
    avatar: e.avatarUrl ? 'Đã có ảnh' : null,
  };
}

const fromLabel = <T extends string>(map: Record<T, string>, label: unknown): T | undefined => {
  const s = String(label ?? '').trim().toLowerCase();
  return (Object.keys(map) as T[]).find((k) => map[k].toLowerCase() === s || k.toLowerCase() === s);
};

/** Cột dùng cho xuất và nhập Excel */
const EXCEL_COLUMNS: ExcelColumn<Employee>[] = [
  { header: 'Mã NV', key: 'code', width: 12, note: 'Bỏ trống để hệ thống tự sinh' },
  { header: 'Họ tên', key: 'fullName', width: 26, required: true },
  { header: 'Email', key: 'email', width: 30, required: true },
  { header: 'Số điện thoại', key: 'phone', width: 15 },
  { header: 'Giới tính', key: 'gender', width: 10, note: 'Nam / Nữ / Khác', value: (e) => (e.gender ? GENDER_LABEL[e.gender] : '') },
  { header: 'Ngày sinh', key: 'dateOfBirth', width: 13, note: 'dd/mm/yyyy', value: (e) => toViDate(e.dateOfBirth) },
  { header: 'Số CCCD', key: 'identityNumber', width: 16 },
  { header: 'Địa chỉ', key: 'address', width: 32 },
  { header: 'Ngày vào làm', key: 'hireDate', width: 14, required: true, note: 'dd/mm/yyyy', value: (e) => toViDate(e.hireDate) },
  { header: 'Trạng thái', key: 'status', width: 14, note: 'Thử việc / Chính thức / Nghỉ dài hạn / Đã nghỉ việc', value: (e) => STATUS_LABEL[e.status] },
  { header: 'Mã phòng ban', key: 'departmentCode', width: 14, value: (e) => e.department?.code ?? '' },
  { header: 'Phòng ban', key: 'departmentName', width: 22, value: (e) => e.department?.name ?? '' },
  { header: 'Mã chức vụ', key: 'positionCode', width: 12, value: (e) => e.position?.code ?? '' },
  { header: 'Chức vụ', key: 'positionName', width: 18, value: (e) => e.position?.name ?? '' },
];

export interface ImportResult {
  total: number;
  valid: number;
  created: number;
  errors: { row: number; messages: string[] }[];
  preview: Array<{ row: number; code?: string; fullName: string; email: string; department?: string }>;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
    private readonly dataSource: DataSource,
    private readonly excel: ExcelService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly customFields: CustomFieldsService,
  ) {}

  /** Ảnh chụp hồ sơ gồm cả trường tuỳ chỉnh (khoá theo tên trường) */
  private async snapshot(e: Employee, defs?: CustomField[]) {
    const list = defs ?? (await this.customFields.findAll('EMPLOYEE'));
    return employeeSnapshot(e, this.customFields.display(list, e.customFields));
  }

  private buildQuery(query: Partial<QueryEmployeeDto>) {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.department', 'department')
      .leftJoinAndSelect('e.position', 'position');

    if (query.search) {
      qb.andWhere('(e.fullName ILIKE :s OR e.code ILIKE :s OR e.email ILIKE :s OR e.phone ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.departmentId) qb.andWhere('e.departmentId = :d', { d: query.departmentId });
    if (query.positionId) qb.andWhere('e.positionId = :p', { p: query.positionId });
    if (query.status) qb.andWhere('e.status = :st', { st: query.status });
    return qb;
  }

  async findAll(query: QueryEmployeeDto) {
    const qb = this.buildQuery(query)
      .orderBy(`e.${safeSort(query, SORTABLE)}`, query.order)
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, query);
  }

  async findOne(id: string) {
    const emp = await this.repo.findOne({
      where: { id },
      relations: {
        department: true,
        position: true,
        manager: true,
        ethnicity: true,
        religion: true,
        educationLevel: true,
        hometownProvince: true,
        bank: true,
      },
    });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');
    return emp;
  }

  /** Lịch sử thay đổi hồ sơ (gồm cả người phụ thuộc) */
  async history(id: string, page = 1, limit = 50) {
    await this.findOne(id);
    return this.audit.history('Employee', id, page, limit);
  }

  async create(dto: CreateEmployeeDto) {
    await this.ensureUnique(dto.email, dto.code);
    const code = dto.code || (await this.generateCode());
    const customFields = await this.customFields.merge({}, dto.customFields ?? {}, { checkRequired: !!dto.customFields });
    const nationality = dto.nationality ?? (this.settings.get('employee').defaultNationality || null);
    const saved = await this.repo.save(this.repo.create({ ...dto, code, nationality, customFields }));
    const full = await this.findOne(saved.id);
    await this.audit.log({
      entityType: 'Employee',
      entityId: full.id,
      action: AuditAction.CREATE,
      label: full.fullName,
      after: await this.snapshot(full),
    });
    return full;
  }

  async update(id: string, dto: UpdateEmployeeDto, opts: { canSensitive?: boolean } = {}) {
    if (dto.managerId && dto.managerId === id) {
      throw new BadRequestException('Nhân viên không thể là quản lý của chính mình');
    }
    const emp = await this.findOne(id);
    const defs = await this.customFields.findAll('EMPLOYEE');
    const before = await this.snapshot(emp, defs);
    await this.ensureUnique(dto.email, dto.code, id);
    const { customFields: cf, ...rest } = dto;
    Object.assign(emp, rest);
    if (cf) emp.customFields = await this.customFields.merge(emp.customFields, cf, { checkRequired: true, canSensitive: opts.canSensitive });
    // Gán lại quan hệ theo id mới (tránh TypeORM giữ object cũ)
    for (const rel of ['department', 'position', 'manager', 'ethnicity', 'religion', 'educationLevel', 'hometownProvince', 'bank'] as const) {
      delete emp[rel];
    }
    await this.repo.save(emp);
    const after = await this.findOne(id);
    await this.audit.log({
      entityType: 'Employee',
      entityId: id,
      action: AuditAction.UPDATE,
      label: after.fullName,
      before,
      after: await this.snapshot(after, defs),
    });
    return after;
  }

  async remove(id: string) {
    const emp = await this.findOne(id);
    await this.repo.softDelete(id);
    await this.audit.log({ entityType: 'Employee', entityId: id, action: AuditAction.DELETE, label: emp.fullName });
    return { id };
  }

  async bulkRemove(ids: string[]) {
    const list = await this.repo.find({ where: { id: In(ids) }, select: { id: true, fullName: true } });
    const res = await this.repo.softDelete({ id: In(ids) });
    for (const e of list) {
      await this.audit.log({ entityType: 'Employee', entityId: e.id, action: AuditAction.DELETE, label: e.fullName });
    }
    return { affected: res.affected ?? 0 };
  }

  async setAvatar(id: string, url: string) {
    const emp = await this.findOne(id);
    const old = emp.avatarUrl;
    await this.repo.update(id, { avatarUrl: url });
    await this.audit.log({
      entityType: 'Employee',
      entityId: id,
      action: AuditAction.UPDATE,
      label: emp.fullName,
      before: { avatar: old ? 'Ảnh cũ' : null },
      after: { avatar: 'Ảnh mới' },
    });
    if (old?.startsWith('/uploads/')) {
      await unlink(join(UPLOAD_ROOT, old.replace('/uploads/', ''))).catch(() => undefined);
    }
    return { avatarUrl: url };
  }

  /** Thống kê nhanh cho dashboard */
  /**
   * Sinh nhật và kỷ niệm ngày vào làm trong `days` ngày tới (tính cả hôm nay), nhân viên chưa nghỉ việc.
   * Sinh ngày 29/2 thì năm không nhuận tính vào 28/2.
   */
  async upcomingEvents(days = 30) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const base = new Date(`${today}T00:00:00Z`);
    const list = await this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.department', 'd')
      .where('e.status != :s', { s: EmployeeStatus.RESIGNED })
      .getMany();

    const next = (iso: string) => {
      const [, m, d] = iso.split('-').map(Number);
      for (const y of [base.getUTCFullYear(), base.getUTCFullYear() + 1]) {
        const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        const day = m === 2 && d === 29 && !leap ? 28 : d;
        const dt = new Date(Date.UTC(y, m - 1, day));
        if (dt >= base) return dt;
      }
      return null;
    };

    type Ev = { type: 'BIRTHDAY' | 'ANNIVERSARY'; date: string; inDays: number; years: number; employee: Partial<Employee> };
    const out: Ev[] = [];
    for (const e of list) {
      const who = { id: e.id, code: e.code, fullName: e.fullName, avatarUrl: e.avatarUrl, department: e.department };
      for (const [type, src] of [['BIRTHDAY', e.dateOfBirth], ['ANNIVERSARY', e.hireDate]] as const) {
        if (!src) continue;
        const dt = next(String(src).slice(0, 10));
        if (!dt) continue;
        const inDays = Math.round((dt.getTime() - base.getTime()) / 86_400_000);
        const years = dt.getUTCFullYear() - Number(String(src).slice(0, 4));
        if (inDays > days || (type === 'ANNIVERSARY' && years < 1)) continue;
        out.push({ type, date: dt.toISOString().slice(0, 10), inDays, years, employee: who as Partial<Employee> });
      }
    }
    return out.sort((a, b) => a.inDays - b.inDays || a.employee.fullName!.localeCompare(b.employee.fullName!, 'vi'));
  }

  async stats() {
    const total = await this.repo.count();
    const byStatus = await this.repo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('e.status')
      .getRawMany<{ status: EmployeeStatus; count: number }>();
    const byDepartment = await this.repo
      .createQueryBuilder('e')
      .leftJoin('e.department', 'd')
      .select("COALESCE(d.name, 'Chưa phân bổ')", 'department')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('d.name')
      .orderBy('count', 'DESC')
      .getRawMany<{ department: string; count: number }>();
    const byGender = await this.repo
      .createQueryBuilder('e')
      .select("COALESCE(e.gender::text, 'UNKNOWN')", 'gender')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('e.gender')
      .getRawMany<{ gender: Gender | 'UNKNOWN'; count: number }>();
    const recentHires = await this.repo.find({
      relations: { department: true, position: true },
      order: { hireDate: 'DESC', createdAt: 'DESC' },
      take: 5,
    });
    const newThisMonth = await this.repo
      .createQueryBuilder('e')
      .where("date_trunc('month', e.hireDate) = date_trunc('month', CURRENT_DATE)")
      .getCount();

    // Biến động 12 tháng gần nhất, tính từ ngày vào làm.
    // Chưa có ngày nghỉ việc nên người đã nghỉ (RESIGNED) không được tính ở mọi tháng.
    const trendRows: { month: string; total: number; hires: number }[] = await this.repo.query(
      `SELECT to_char(m, 'YYYY-MM') AS month,
              (SELECT COUNT(*)::int FROM employees e
                WHERE e."deletedAt" IS NULL AND e.status <> 'RESIGNED'
                  AND e."hireDate" < m + interval '1 month') AS total,
              (SELECT COUNT(*)::int FROM employees e
                WHERE e."deletedAt" IS NULL
                  AND e."hireDate" >= m AND e."hireDate" < m + interval '1 month') AS hires
         FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '11 months',
                              date_trunc('month', CURRENT_DATE), interval '1 month') AS m
        ORDER BY m`,
    );
    return { total, newThisMonth, byStatus, byDepartment, byGender, recentHires, headcountTrend: trendRows };
  }

  // ---------------------------------------------------------------- Excel

  /** Cột Excel cho trường tuỳ chỉnh đang dùng */
  private async customColumns(canSensitive = true): Promise<ExcelColumn<Employee>[]> {
    const defs = (await this.customFields.findAll('EMPLOYEE', true)).filter((d) => canSensitive || !d.sensitive);
    return defs.map((d) => ({
      header: d.label,
      key: `cf:${d.key}`,
      width: 18,
      required: d.required,
      note: d.options.length ? d.options.join(' / ') : d.type === 'DATE' ? 'dd/mm/yyyy' : d.type === 'BOOLEAN' ? 'Có / Không' : undefined,
      value: (e: Employee) => {
        const v = e.customFields?.[d.key];
        if (v === undefined || v === null) return '';
        if (Array.isArray(v)) return v.join(', ');
        if (typeof v === 'boolean') return v ? 'Có' : 'Không';
        if (d.type === 'DATE') return toViDate(String(v));
        return v;
      },
    }));
  }

  async exportExcel(query: Partial<QueryEmployeeDto>, canSensitive = true) {
    const items = await this.buildQuery(query).orderBy('e.code', 'ASC').getMany();
    return this.excel.export('Nhân viên', [...EXCEL_COLUMNS, ...(await this.customColumns(canSensitive))], items);
  }

  async importTemplate() {
    const custom = await this.customColumns();
    const cols = [...EXCEL_COLUMNS.filter((c) => !['departmentName', 'positionName'].includes(c.key)), ...custom];
    const guide = [
        'HƯỚNG DẪN NHẬP NHÂN VIÊN',
        '1. Điền dữ liệu vào sheet "Nhân viên" từ dòng 2, xoá dòng ví dụ trước khi nhập.',
        '2. Cột có dấu * là bắt buộc: Họ tên, Email, Ngày vào làm.',
        `3. Mã NV: bỏ trống để hệ thống tự sinh (${this.formatCode(1)}, ${this.formatCode(2)}…). Nếu điền thì không được trùng.`,
        '4. Ngày nhập theo dạng dd/mm/yyyy, ví dụ 01/12/2026.',
        '5. Giới tính: Nam / Nữ / Khác. Trạng thái: Thử việc / Chính thức / Nghỉ dài hạn / Đã nghỉ việc (mặc định Thử việc).',
        '6. Mã phòng ban và Mã chức vụ phải có sẵn trong hệ thống (xem ở trang Phòng ban, Chức vụ).',
        '7. Hệ thống kiểm tra toàn bộ file trước; chỉ nhập khi không còn dòng lỗi.',
    ];
    if (custom.length) {
      guide.push('8. Các cột trường tuỳ chỉnh:');
      for (const c of custom) guide.push(`   • ${c.header}${c.required ? ' (bắt buộc)' : ''}${c.note ? `: ${c.note}` : ''}`);
      guide.push('   Trường chọn nhiều giá trị: ngăn cách bằng dấu phẩy.');
    }
    return this.excel.template(
      'Nhân viên',
      cols,
      [
        {
          code: '',
          fullName: 'Nguyễn Văn Mẫu',
          email: 'mau.nguyen@congty.vn',
          phone: '0901234567',
          gender: 'Nam',
          dateOfBirth: '15/08/1995',
          identityNumber: '001095012345',
          address: 'Hà Nội',
          hireDate: '01/12/2026',
          status: 'Thử việc',
          departmentCode: 'IT',
          positionCode: 'STAFF',
        },
      ],
      guide,
    );
  }

  /** Nhập nhân viên từ Excel. dryRun = chỉ kiểm tra, không lưu */
  async importExcel(buffer: Buffer, dryRun: boolean): Promise<ImportResult> {
    let rows: Awaited<ReturnType<ExcelService['parse']>>;
    const customCols = await this.customColumns();
    try {
      rows = await this.excel.parse(buffer, [...EXCEL_COLUMNS, ...customCols]);
    } catch {
      throw new BadRequestException('Không đọc được file. Hãy dùng file .xlsx theo mẫu.');
    }
    if (!rows.length) throw new BadRequestException('File không có dữ liệu');
    if (rows.length > 2000) throw new BadRequestException('Mỗi lần nhập tối đa 2000 dòng');

    const [departments, positions] = await Promise.all([
      this.dataSource.getRepository(Department).find(),
      this.dataSource.getRepository(Position).find(),
    ]);
    const depByCode = new Map(departments.map((d) => [d.code.toLowerCase(), d]));
    const posByCode = new Map(positions.map((p) => [p.code.toLowerCase(), p]));

    const emails = rows.map((r) => String(r.email ?? '').toLowerCase()).filter(Boolean);
    const codes = rows.map((r) => String(r.code ?? '')).filter(Boolean);
    const existing = await this.repo
      .createQueryBuilder('e')
      .withDeleted()
      .select(['e.email', 'e.code'])
      .where('LOWER(e.email) IN (:...emails)', { emails: emails.length ? emails : [''] })
      .orWhere('e.code IN (:...codes)', { codes: codes.length ? codes : [''] })
      .getMany();
    const takenEmails = new Set(existing.map((e) => e.email.toLowerCase()));
    const takenCodes = new Set(existing.map((e) => e.code));
    const seenEmails = new Set<string>();
    const seenCodes = new Set<string>();

    const errors: ImportResult['errors'] = [];
    const valid: Array<Partial<Employee> & { __row: number }> = [];

    for (const r of rows) {
      const msg: string[] = [];
      const fullName = String(r.fullName ?? '').trim();
      const email = String(r.email ?? '').trim().toLowerCase();
      const code = r.code ? String(r.code).trim() : undefined;

      if (!fullName) msg.push('Thiếu họ tên');
      if (!email) msg.push('Thiếu email');
      else if (!isEmail(email)) msg.push(`Email "${email}" không hợp lệ`);
      else if (takenEmails.has(email)) msg.push(`Email "${email}" đã tồn tại`);
      else if (seenEmails.has(email)) msg.push(`Email "${email}" bị trùng trong file`);

      if (code) {
        if (takenCodes.has(code)) msg.push(`Mã NV "${code}" đã tồn tại`);
        else if (seenCodes.has(code)) msg.push(`Mã NV "${code}" bị trùng trong file`);
      }

      const hireDate = toIsoDate(r.hireDate);
      if (!r.hireDate) msg.push('Thiếu ngày vào làm');
      else if (!hireDate) msg.push(`Ngày vào làm "${String(r.hireDate)}" không đúng dạng dd/mm/yyyy`);

      const dateOfBirth = toIsoDate(r.dateOfBirth);
      if (r.dateOfBirth && !dateOfBirth) msg.push(`Ngày sinh "${String(r.dateOfBirth)}" không đúng dạng dd/mm/yyyy`);

      const gender = r.gender ? fromLabel(GENDER_LABEL, r.gender) : undefined;
      if (r.gender && !gender) msg.push(`Giới tính "${String(r.gender)}" không hợp lệ`);

      const status = r.status ? fromLabel(STATUS_LABEL, r.status) : EmployeeStatus.PROBATION;
      if (!status) msg.push(`Trạng thái "${String(r.status)}" không hợp lệ`);

      const dep = r.departmentCode ? depByCode.get(String(r.departmentCode).toLowerCase()) : undefined;
      if (r.departmentCode && !dep) msg.push(`Không có phòng ban mã "${String(r.departmentCode)}"`);
      const pos = r.positionCode ? posByCode.get(String(r.positionCode).toLowerCase()) : undefined;
      if (r.positionCode && !pos) msg.push(`Không có chức vụ mã "${String(r.positionCode)}"`);

      if (email) seenEmails.add(email);
      if (code) seenCodes.add(code);

      let customFields: Record<string, unknown> = {};
      const cfRaw = Object.fromEntries(
        customCols.map((c) => [c.key.slice(3), r[c.key] instanceof Date ? (r[c.key] as Date).toISOString().slice(0, 10) : r[c.key]]),
      );
      try {
        customFields = await this.customFields.merge({}, cfRaw, { checkRequired: true });
      } catch (e) {
        const res = (e as { getResponse?: () => { message?: string | string[] } }).getResponse?.();
        msg.push(...([] as string[]).concat(res?.message ?? String(e)));
      }

      if (msg.length) {
        errors.push({ row: r.__row, messages: msg });
        continue;
      }
      valid.push({
        __row: r.__row,
        code,
        fullName,
        email,
        phone: r.phone ? String(r.phone) : null,
        gender: gender ?? null,
        dateOfBirth,
        identityNumber: r.identityNumber ? String(r.identityNumber) : null,
        address: r.address ? String(r.address) : null,
        hireDate: hireDate!,
        status: status!,
        departmentId: dep?.id ?? null,
        positionId: pos?.id ?? null,
        department: dep,
        customFields,
        nationality: this.settings.get('employee').defaultNationality || null,
      });
    }

    const result: ImportResult = {
      total: rows.length,
      valid: valid.length,
      created: 0,
      errors,
      preview: valid.slice(0, 20).map((v) => ({
        row: v.__row,
        code: v.code,
        fullName: v.fullName!,
        email: v.email!,
        department: v.department?.name,
      })),
    };
    if (dryRun || errors.length) return result;

    // Lưu tất cả trong 1 transaction: lỗi 1 dòng thì không lưu dòng nào
    const createdIds: string[] = [];
    await this.dataSource.transaction(async (m) => {
      const repo = m.getRepository(Employee);
      let next = await this.nextCodeNumber(repo);
      for (const { __row: _row, department: _dep, ...data } of valid) {
        if (!data.code) data.code = this.formatCode(next++);
        const saved = await repo.save(repo.create(data));
        createdIds.push(saved.id);
      }
    });
    for (const id of createdIds) {
      const e = await this.findOne(id);
      await this.audit.log({
        entityType: 'Employee',
        entityId: id,
        action: AuditAction.CREATE,
        label: `${e.fullName} (nhập từ Excel)`,
        after: await this.snapshot(e),
      });
    }
    result.created = valid.length;
    return result;
  }

  // ---------------------------------------------------------------- helpers

  private async ensureUnique(email?: string, code?: string, exceptId?: string) {
    if (email) {
      const qb = this.repo.createQueryBuilder('e').withDeleted().where('LOWER(e.email) = LOWER(:email)', { email });
      if (exceptId) qb.andWhere('e.id <> :id', { id: exceptId });
      if (await qb.getExists()) throw new BadRequestException(`Email ${email} đã được dùng cho nhân viên khác`);
    }
    if (code) {
      const qb = this.repo.createQueryBuilder('e').withDeleted().where('e.code = :code', { code });
      if (exceptId) qb.andWhere('e.id <> :id', { id: exceptId });
      if (await qb.getExists()) throw new BadRequestException(`Mã nhân viên ${code} đã tồn tại`);
    }
  }

  private async nextCodeNumber(repo: Repository<Employee> = this.repo) {
    const prefix = this.settings.get('employee').codePrefix.replace(/[^A-Za-z0-9_-]/g, '');
    const last = await repo
      .createQueryBuilder('e')
      .withDeleted()
      .where('e.code ~ :re', { re: `^${prefix}[0-9]+$` })
      .orderBy('LENGTH(e.code)', 'DESC')
      .addOrderBy('e.code', 'DESC')
      .getOne();
    return last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  }

  /** Mã NV theo Cài đặt → Quy tắc nhân sự: tiền tố + số thứ tự đệm 0 */
  private formatCode(n: number) {
    const { codePrefix, codeLength } = this.settings.get('employee');
    return `${codePrefix}${String(n).padStart(codeLength, '0')}`;
  }

  private async generateCode() {
    return this.formatCode(await this.nextCodeNumber());
  }
}
