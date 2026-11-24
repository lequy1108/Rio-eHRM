import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join, relative } from 'path';
import { Brackets, In, Repository } from 'typeorm';
import { AuditService } from '../../common/audit/audit.service';
import { paginate, safeSort } from '../../common/dto/pagination-query.dto';
import { AuditAction, EmployeeStatus } from '../../common/enums';
import { PRIVATE_ROOT } from '../../common/shared/upload';
import { formatMoney } from '../../common/utils/vn-money';
import { EmployeesService } from '../employees/employees.service';
import { SettingsService } from '../settings/settings.service';
import { DEFAULT_TEMPLATE, DEFAULT_TYPES } from './default-template';
import {
  CreateAppendixDto,
  CreateContractDto,
  CreateContractTypeDto,
  CreateTemplateDto,
  QueryContractDto,
  TerminateContractDto,
  UpdateAppendixDto,
  UpdateContractDto,
  UpdateContractTypeDto,
  UpdateTemplateDto,
} from './dto';
import { Allowance, Contract, ContractAppendix, ContractStatus, ContractTemplate, ContractType } from './contract.entity';
import { PLACEHOLDERS, renderTemplate, sanitizeTemplate } from './placeholders';

/** Hôm nay theo giờ Việt Nam (YYYY-MM-DD) */
export const todayVN = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const vn = (iso?: string | null) => (iso ? iso.split('-').reverse().join('/') : null);

export type ContractView = Contract & {
  state: 'upcoming' | 'active' | 'expiring' | 'expired' | 'terminated';
  daysLeft: number | null;
  renewedBy?: { id: string; contractNumber: string } | null;
  current?: { jobTitle?: string | null; baseSalary: number; insuranceSalary?: number | null; allowances: Allowance[] };
};

@Injectable()
export class ContractsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    @InjectRepository(Contract) private readonly repo: Repository<Contract>,
    @InjectRepository(ContractType) private readonly types: Repository<ContractType>,
    @InjectRepository(ContractTemplate) private readonly templates: Repository<ContractTemplate>,
    @InjectRepository(ContractAppendix) private readonly appendices: Repository<ContractAppendix>,
    private readonly employees: EmployeesService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Tạo sẵn loại hợp đồng và mẫu mặc định nếu chưa có */
  async onApplicationBootstrap() {
    if (!(await this.types.count({ withDeleted: true }))) {
      await this.types.save(DEFAULT_TYPES.map((t, i) => this.types.create({ ...t, sortOrder: i + 1 })));
      this.logger.log(`Đã tạo ${DEFAULT_TYPES.length} loại hợp đồng mặc định`);
    }
    if (!(await this.templates.count({ withDeleted: true }))) {
      await this.templates.save(
        this.templates.create({ name: 'Hợp đồng lao động (mẫu chung)', content: DEFAULT_TEMPLATE, isDefault: true }),
      );
      this.logger.log('Đã tạo mẫu hợp đồng mặc định');
    }
  }

  /* ================= Loại hợp đồng ================= */

  findTypes(activeOnly = false) {
    return this.types.find({ where: activeOnly ? { isActive: true } : {}, order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  async createType(dto: CreateContractTypeDto) {
    if (await this.types.exists({ where: { code: dto.code } })) throw new ConflictException('Mã loại hợp đồng đã tồn tại');
    const max = await this.types.maximum('sortOrder');
    return this.types.save(
      this.types.create({ ...dto, defaultMonths: dto.hasTerm ? (dto.defaultMonths ?? null) : null, sortOrder: dto.sortOrder ?? (max ?? 0) + 1 }),
    );
  }

  async updateType(id: string, dto: UpdateContractTypeDto) {
    const t = await this.types.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Không tìm thấy loại hợp đồng');
    if (dto.code && dto.code !== t.code && (await this.types.exists({ where: { code: dto.code } }))) {
      throw new ConflictException('Mã loại hợp đồng đã tồn tại');
    }
    Object.assign(t, Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)));
    if (!t.hasTerm) t.defaultMonths = null;
    return this.types.save(t);
  }

  async removeType(id: string) {
    const used = await this.repo.count({ where: { typeId: id } });
    if (used) throw new BadRequestException(`Có ${used} hợp đồng đang dùng loại này. Hãy chọn Ngừng dùng thay vì xoá`);
    await this.types.softDelete(id);
    return { id };
  }

  /* ================= Mẫu hợp đồng ================= */

  placeholders() {
    return PLACEHOLDERS.map(({ key, label, group }) => ({ key, label, group }));
  }

  findTemplates() {
    return this.templates.find({
      order: { isDefault: 'DESC', name: 'ASC' },
      select: { id: true, name: true, description: true, isDefault: true, updatedAt: true, createdAt: true },
    });
  }

  async findTemplate(id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Không tìm thấy mẫu hợp đồng');
    return t;
  }

  private async setDefault(id: string) {
    await this.templates.createQueryBuilder().update().set({ isDefault: false }).where('id != :id', { id }).execute();
  }

  async createTemplate(dto: CreateTemplateDto) {
    const saved = await this.templates.save(this.templates.create({ ...dto, content: sanitizeTemplate(dto.content) }));
    if (saved.isDefault) await this.setDefault(saved.id);
    await this.audit.log({ entityType: 'ContractTemplate', entityId: saved.id, action: AuditAction.CREATE, label: saved.name });
    return saved;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const t = await this.findTemplate(id);
    Object.assign(t, Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)));
    if (dto.content) t.content = sanitizeTemplate(dto.content);
    const saved = await this.templates.save(t);
    if (saved.isDefault) await this.setDefault(saved.id);
    await this.audit.log({
      entityType: 'ContractTemplate',
      entityId: id,
      action: AuditAction.UPDATE,
      label: saved.name,
      before: { name: '' },
      after: { name: saved.name },
    });
    return saved;
  }

  async removeTemplate(id: string) {
    const t = await this.findTemplate(id);
    if (t.isDefault) throw new BadRequestException('Không xoá được mẫu mặc định. Đặt mẫu khác làm mặc định trước');
    await this.templates.softDelete(id);
    return { id };
  }

  /* ================= Hợp đồng ================= */

  /** Trạng thái hiển thị tính theo ngày hôm nay */
  private view(c: Contract, today = todayVN()): ContractView {
    const v = c as ContractView;
    const daysLeft = c.endDate ? Math.round((Date.parse(c.endDate) - Date.parse(today)) / 86_400_000) : null;
    v.daysLeft = daysLeft;
    if (c.status === ContractStatus.TERMINATED) v.state = 'terminated';
    else if (c.startDate > today) v.state = 'upcoming';
    else if (daysLeft !== null && daysLeft < 0) v.state = 'expired';
    else if (daysLeft !== null && daysLeft <= 30) v.state = 'expiring';
    else v.state = 'active';
    return v;
  }

  /** Điều khoản đang áp dụng: hợp đồng + các phụ lục đã có hiệu lực, theo thứ tự ngày */
  private currentTerms(c: Contract, appendices: ContractAppendix[], today = todayVN()) {
    const cur = { jobTitle: c.jobTitle, baseSalary: c.baseSalary, insuranceSalary: c.insuranceSalary, allowances: c.allowances ?? [] };
    for (const a of [...appendices].sort((x, y) => x.effectiveDate.localeCompare(y.effectiveDate))) {
      if (a.effectiveDate > today) continue;
      if (a.jobTitle != null) cur.jobTitle = a.jobTitle;
      if (a.baseSalary != null) cur.baseSalary = a.baseSalary;
      if (a.insuranceSalary != null) cur.insuranceSalary = a.insuranceSalary;
      if (a.allowances != null) cur.allowances = a.allowances;
    }
    return cur;
  }

  private async withRenewals(list: Contract[]) {
    if (!list.length) return [];
    const next = await this.repo.find({
      where: { previousContractId: In(list.map((c) => c.id)) },
      select: { id: true, contractNumber: true, previousContractId: true },
    });
    const today = todayVN();
    return list.map((c) => {
      const v = this.view(c, today);
      const n = next.find((x) => x.previousContractId === c.id);
      v.renewedBy = n ? { id: n.id, contractNumber: n.contractNumber } : null;
      return v;
    });
  }

  private applyState(qb: ReturnType<Repository<Contract>['createQueryBuilder']>, state?: string, days = 30) {
    const today = todayVN();
    const active = `c.status = 'ACTIVE' AND c.startDate <= :today AND (c.endDate IS NULL OR c.endDate >= :today)`;
    if (state === 'active') qb.andWhere(active, { today });
    if (state === 'expiring')
      qb.andWhere(`${active} AND c.endDate <= :until`, { today, until: addDays(today, days) }).andWhere(
        `NOT EXISTS (SELECT 1 FROM contracts n WHERE n."previousContractId" = c.id AND n."deletedAt" IS NULL)`,
      );
    if (state === 'expired') qb.andWhere(`c.status = 'ACTIVE' AND c.endDate < :today`, { today });
    if (state === 'upcoming') qb.andWhere(`c.status = 'ACTIVE' AND c.startDate > :today`, { today });
    if (state === 'terminated') qb.andWhere(`c.status = 'TERMINATED'`);
  }

  async findAll(q: QueryContractDto) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.employee', 'e')
      .leftJoinAndSelect('e.department', 'd')
      .leftJoinAndSelect('c.type', 't');
    if (q.search) {
      qb.andWhere(
        new Brackets((w) =>
          w.where('c.contractNumber ILIKE :s', { s: `%${q.search}%` }).orWhere('e.fullName ILIKE :s').orWhere('e.code ILIKE :s'),
        ),
      );
    }
    if (q.employeeId) qb.andWhere('c.employeeId = :eid', { eid: q.employeeId });
    if (q.typeId) qb.andWhere('c.typeId = :tid', { tid: q.typeId });
    if (q.departmentId) qb.andWhere('e.departmentId = :did', { did: q.departmentId });
    this.applyState(qb, q.state, q.days);
    const sort = safeSort(q, ['contractNumber', 'signDate', 'startDate', 'endDate', 'baseSalary', 'createdAt']);
    qb.orderBy(`c.${sort}`, q.order, 'NULLS LAST')
      .addOrderBy('c.createdAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginate(await this.withRenewals(items), total, q);
  }

  /** Số lượng theo trạng thái cho thẻ thống kê */
  async stats() {
    const out: Record<string, number> = {};
    for (const s of ['active', 'expiring', 'expired', 'upcoming', 'terminated']) {
      const qb = this.repo.createQueryBuilder('c');
      this.applyState(qb, s);
      out[s] = await qb.getCount();
    }
    // Đã hết hạn mà chưa gia hạn (cần xử lý)
    const qb = this.repo.createQueryBuilder('c');
    this.applyState(qb, 'expired');
    out.expiredNotRenewed = await qb
      .andWhere(`NOT EXISTS (SELECT 1 FROM contracts n WHERE n."previousContractId" = c.id AND n."deletedAt" IS NULL)`)
      .getCount();
    return out;
  }

  async findOne(id: string) {
    const c = await this.repo.findOne({
      where: { id },
      relations: { employee: { department: true, position: true }, type: true, previousContract: true, appendices: true },
    });
    if (!c) throw new NotFoundException('Không tìm thấy hợp đồng');
    const [v] = await this.withRenewals([c]);
    v.appendices = (c.appendices ?? []).sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
    v.current = this.currentTerms(c, v.appendices);
    return v;
  }

  /** Số hợp đồng tiếp theo theo mẫu trong Cài đặt */
  async nextNumber(signDate: string, employeeCode = '', typeCode = '') {
    const { numberFormat, seqLength } = this.settings.get('contract');
    const year = Number(signDate.slice(0, 4));
    const row = await this.repo
      .createQueryBuilder('c')
      .withDeleted()
      .select('MAX(c.seqNo)', 'max')
      .where('c.seqYear = :year', { year })
      .getRawOne<{ max: number | null }>();
    const max = Number(row?.max ?? 0);
    let seq = max + 1;
    const build = (n: number) =>
      numberFormat
        .replaceAll('{seq}', String(n).padStart(seqLength, '0'))
        .replaceAll('{year}', String(year))
        .replaceAll('{code}', employeeCode)
        .replaceAll('{type}', typeCode);
    // Tránh trùng với số nhập tay trước đó
    while (await this.repo.exists({ where: { contractNumber: build(seq) }, withDeleted: true })) seq++;
    return { contractNumber: build(seq), seqYear: year, seqNo: seq };
  }

  private snapshot(c: Contract) {
    return {
      contractNumber: c.contractNumber,
      contractType: c.type?.name ?? null,
      signDate: c.signDate,
      startDate: c.startDate,
      endDate: c.endDate ?? null,
      jobTitle: c.jobTitle ?? null,
      workLocation: c.workLocation ?? null,
      baseSalary: formatMoney(c.baseSalary),
      insuranceSalary: c.insuranceSalary != null ? formatMoney(c.insuranceSalary) : null,
      allowances: c.allowances?.length ? c.allowances.map((a) => `${a.name} ${formatMoney(a.amount)}`).join('; ') : null,
      signerName: c.signerName ?? null,
      contractStatus: c.status === ContractStatus.TERMINATED ? `Chấm dứt ${vn(c.terminatedDate)}` : 'Hiệu lực',
      note: c.note ?? null,
    };
  }

  private log(action: AuditAction, c: Contract, before?: Record<string, unknown>, label?: string) {
    return this.audit.log({
      entityType: 'Contract',
      entityId: c.id,
      parentType: 'Employee',
      parentId: c.employeeId,
      action,
      label: label ?? c.contractNumber,
      before,
      after: action === AuditAction.DELETE ? undefined : this.snapshot(c),
    });
  }

  private async validate(c: Partial<Contract>, type: ContractType, excludeId?: string) {
    if (!type.hasTerm) c.endDate = null;
    if (type.hasTerm && !c.endDate) throw new BadRequestException(`${type.name} cần có ngày kết thúc`);
    if (c.endDate && c.endDate < c.startDate!) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    if (c.signDate! > c.startDate!) {
      // Cho phép ký sau ngày bắt đầu nhưng nhắc rõ: thực tế hay gặp khi nhập lại hợp đồng cũ
    }
    // Không cho 2 hợp đồng còn hiệu lực trùng thời gian của cùng một nhân viên
    const qb = this.repo
      .createQueryBuilder('c')
      .where('c.employeeId = :e', { e: c.employeeId })
      .andWhere(`c.status = 'ACTIVE'`)
      .andWhere('c.startDate <= :end', { end: c.endDate ?? '9999-12-31' })
      .andWhere('(c.endDate IS NULL OR c.endDate >= :start)', { start: c.startDate });
    if (excludeId) qb.andWhere('c.id != :id', { id: excludeId });
    const clash = await qb.getOne();
    if (clash) {
      throw new BadRequestException(
        `Trùng thời gian với hợp đồng ${clash.contractNumber} (${vn(clash.startDate)} → ${vn(clash.endDate) ?? 'không thời hạn'}). ` +
          'Hãy chấm dứt hoặc sửa ngày hợp đồng đó trước',
      );
    }
  }

  /** Ký hợp đồng chính thức (không phải thử việc) đã có hiệu lực → nhân viên chuyển sang Chính thức */
  private async syncEmployeeStatus(c: Contract, type: ContractType) {
    if (type.isProbation || c.startDate > todayVN() || c.status !== ContractStatus.ACTIVE) return;
    const emp = await this.employees.findOne(c.employeeId);
    if (emp.status === EmployeeStatus.PROBATION) {
      await this.employees.update(c.employeeId, { status: EmployeeStatus.ACTIVE } as never);
    }
  }

  async create(dto: CreateContractDto) {
    const emp = await this.employees.findOne(dto.employeeId);
    const type = await this.types.findOne({ where: { id: dto.typeId } });
    if (!type) throw new BadRequestException('Loại hợp đồng không tồn tại');
    if (dto.previousContractId && !(await this.repo.exists({ where: { id: dto.previousContractId, employeeId: dto.employeeId } }))) {
      throw new BadRequestException('Hợp đồng trước không thuộc nhân viên này');
    }
    const { contractNumber: _num, ...rest } = dto;
    const c = this.repo.create({
      ...rest,
      allowances: dto.allowances ?? [],
      jobTitle: dto.jobTitle ?? emp.position?.name ?? null,
      workLocation: dto.workLocation ?? (this.settings.get('contract').defaultWorkLocation || null),
      signerName: dto.signerName ?? (this.settings.get('company').representativeName || null),
      signerTitle: dto.signerTitle ?? (this.settings.get('company').representativeTitle || null),
      status: ContractStatus.ACTIVE,
    });
    await this.validate(c, type);
    if (dto.contractNumber) {
      if (await this.repo.exists({ where: { contractNumber: dto.contractNumber } })) throw new ConflictException('Số hợp đồng đã tồn tại');
      c.contractNumber = dto.contractNumber;
    } else {
      Object.assign(c, await this.nextNumber(dto.signDate, emp.code, type.code));
    }
    const saved = await this.repo.save(c);
    const full = await this.findOne(saved.id);
    await this.log(AuditAction.CREATE, full);
    await this.syncEmployeeStatus(full, type);
    return full;
  }

  async update(id: string, dto: UpdateContractDto) {
    const c = await this.findOne(id);
    if (c.status === ContractStatus.TERMINATED) throw new BadRequestException('Hợp đồng đã chấm dứt, không sửa được');
    const before = this.snapshot(c);
    const patch = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    if (patch.contractNumber && patch.contractNumber !== c.contractNumber) {
      if (await this.repo.exists({ where: { contractNumber: patch.contractNumber as string } })) {
        throw new ConflictException('Số hợp đồng đã tồn tại');
      }
    } else delete patch.contractNumber;
    const entity = await this.repo.findOneOrFail({ where: { id } });
    Object.assign(entity, patch);
    const type = await this.types.findOneOrFail({ where: { id: entity.typeId! }, withDeleted: true });
    await this.validate(entity, type, id);
    await this.repo.save(entity);
    const full = await this.findOne(id);
    await this.log(AuditAction.UPDATE, full, before);
    await this.syncEmployeeStatus(full, type);
    return full;
  }

  async terminate(id: string, dto: TerminateContractDto) {
    const c = await this.findOne(id);
    if (c.status === ContractStatus.TERMINATED) throw new BadRequestException('Hợp đồng đã chấm dứt trước đó');
    if (dto.terminatedDate < c.startDate) throw new BadRequestException('Ngày chấm dứt phải sau ngày bắt đầu');
    const before = this.snapshot(c);
    await this.repo.update(id, {
      status: ContractStatus.TERMINATED,
      terminatedDate: dto.terminatedDate,
      terminationReason: dto.terminationReason,
      // Hợp đồng kết thúc sớm: ngày kết thúc thực tế = ngày chấm dứt
      endDate: c.endDate && c.endDate < dto.terminatedDate ? c.endDate : dto.terminatedDate,
    });
    const full = await this.findOne(id);
    await this.log(AuditAction.UPDATE, full, before, `${c.contractNumber}, chấm dứt`);
    return full;
  }

  async remove(id: string) {
    const c = await this.findOne(id);
    if (c.renewedBy) throw new BadRequestException(`Hợp đồng đã được gia hạn bằng ${c.renewedBy.contractNumber}, không xoá được`);
    await this.repo.softDelete(id);
    await this.log(AuditAction.DELETE, c);
    return { id };
  }

  /* ---------- In hợp đồng ---------- */

  async render(id: string, templateId?: string) {
    const c = await this.findOne(id);
    const template = templateId
      ? await this.findTemplate(templateId)
      : await this.templates.findOne({ where: { isDefault: true } });
    if (!template) throw new BadRequestException('Chưa có mẫu hợp đồng. Tạo mẫu trong Cài đặt → Hợp đồng');
    const employee = await this.employees.findOne(c.employeeId);
    const company = this.settings.get('company') as unknown as Record<string, string>;
    const out = renderTemplate(template.content, { contract: c, employee, current: c.current!, company });
    return { ...out, title: `Hợp đồng ${c.contractNumber} - ${employee.fullName}`, template: { id: template.id, name: template.name } };
  }

  /* ---------- Bản scan đã ký ---------- */

  async attachSigned(id: string, file: Express.Multer.File) {
    const c = await this.findOne(id).catch(async (e) => {
      await unlink(file.path).catch(() => undefined);
      throw e;
    });
    const old = await this.repo.findOne({ where: { id }, select: { id: true, signedFilePath: true } });
    await this.repo.update(id, {
      signedFilePath: relative(PRIVATE_ROOT, file.path).replace(/\\/g, '/'),
      signedFileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      signedFileMime: file.mimetype,
      signedFileSize: file.size,
    });
    if (old?.signedFilePath) await unlink(join(PRIVATE_ROOT, old.signedFilePath)).catch(() => undefined);
    await this.audit.log({
      entityType: 'Contract',
      entityId: id,
      parentType: 'Employee',
      parentId: c.employeeId,
      action: AuditAction.UPDATE,
      label: c.contractNumber,
      before: { signedFile: c.signedFileName ?? null },
      after: { signedFile: Buffer.from(file.originalname, 'latin1').toString('utf8') },
    });
    return this.findOne(id);
  }

  async signedFile(id: string) {
    const row = await this.repo.findOne({
      where: { id },
      select: { id: true, signedFilePath: true, signedFileName: true, signedFileMime: true },
    });
    if (!row?.signedFilePath) throw new NotFoundException('Hợp đồng chưa có bản scan');
    const abs = join(PRIVATE_ROOT, row.signedFilePath);
    if (!abs.startsWith(PRIVATE_ROOT) || !existsSync(abs)) throw new NotFoundException('File không còn trên máy chủ');
    return { abs, name: row.signedFileName ?? 'hop-dong.pdf', mime: row.signedFileMime ?? 'application/pdf' };
  }

  /* ---------- Phụ lục ---------- */

  private async appendix(contractId: string, id: string) {
    const a = await this.appendices.findOne({ where: { id, contractId } });
    if (!a) throw new NotFoundException('Không tìm thấy phụ lục');
    return a;
  }

  private appendixSnap(a: ContractAppendix) {
    return {
      appendixNumber: a.appendixNumber,
      effectiveDate: a.effectiveDate,
      jobTitle: a.jobTitle ?? null,
      baseSalary: a.baseSalary != null ? formatMoney(a.baseSalary) : null,
      insuranceSalary: a.insuranceSalary != null ? formatMoney(a.insuranceSalary) : null,
      allowances: a.allowances ? a.allowances.map((x) => `${x.name} ${formatMoney(x.amount)}`).join('; ') || 'Bỏ hết' : null,
      content: a.content ?? null,
    };
  }

  private logAppendix(action: AuditAction, c: Contract, a: ContractAppendix, before?: Record<string, unknown>) {
    return this.audit.log({
      entityType: 'ContractAppendix',
      entityId: a.id,
      parentType: 'Employee',
      parentId: c.employeeId,
      action,
      label: a.appendixNumber,
      before,
      after: action === AuditAction.DELETE ? undefined : this.appendixSnap(a),
    });
  }

  private checkAppendix(c: Contract, a: Partial<ContractAppendix>) {
    if (c.status === ContractStatus.TERMINATED) throw new BadRequestException('Hợp đồng đã chấm dứt, không thêm phụ lục được');
    if (a.effectiveDate! < c.startDate || (c.endDate && a.effectiveDate! > c.endDate)) {
      throw new BadRequestException('Ngày hiệu lực của phụ lục phải nằm trong thời hạn hợp đồng');
    }
    if (a.jobTitle == null && a.baseSalary == null && a.insuranceSalary == null && a.allowances == null && !a.content) {
      throw new BadRequestException('Phụ lục cần có ít nhất một thay đổi hoặc nội dung');
    }
  }

  async addAppendix(contractId: string, dto: CreateAppendixDto) {
    const c = await this.findOne(contractId);
    const { appendixNumber, ...rest } = dto;
    const a = this.appendices.create({ ...rest, contractId, appendixNumber: appendixNumber ?? undefined });
    this.checkAppendix(c, a);
    if (!a.appendixNumber) {
      const n = (await this.appendices.count({ where: { contractId }, withDeleted: true })) + 1;
      a.appendixNumber = `${c.contractNumber}/PL${String(n).padStart(2, '0')}`;
    }
    const saved = await this.appendices.save(a);
    await this.logAppendix(AuditAction.CREATE, c, saved);
    return this.findOne(contractId);
  }

  async updateAppendix(contractId: string, id: string, dto: UpdateAppendixDto) {
    const c = await this.findOne(contractId);
    const a = await this.appendix(contractId, id);
    const before = this.appendixSnap(a);
    Object.assign(a, Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)));
    this.checkAppendix(c, a);
    const saved = await this.appendices.save(a);
    await this.logAppendix(AuditAction.UPDATE, c, saved, before);
    return this.findOne(contractId);
  }

  async removeAppendix(contractId: string, id: string) {
    const c = await this.findOne(contractId);
    const a = await this.appendix(contractId, id);
    await this.appendices.softDelete(id);
    await this.logAppendix(AuditAction.DELETE, c, a);
    return this.findOne(contractId);
  }

  /* ---------- Việc chạy hằng ngày ---------- */

  /** Hợp đồng chính thức bắt đầu hôm nay → cập nhật trạng thái nhân viên */
  async syncStartingToday() {
    const list = await this.repo.find({ where: { startDate: todayVN(), status: ContractStatus.ACTIVE }, relations: { type: true } });
    for (const c of list) if (c.type) await this.syncEmployeeStatus(c, c.type).catch(() => undefined);
  }

  /** Hợp đồng chưa gia hạn còn đúng N ngày (N trong các mốc nhắc) */
  async dueForReminder() {
    const marks = this.settings
      .get('contract')
      .remindDays.split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    if (!marks.length) return [];
    const qb = this.repo
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.employee', 'e')
      .leftJoinAndSelect('e.department', 'd')
      .leftJoinAndSelect('c.type', 't')
      .where(`c.status = 'ACTIVE'`)
      .andWhere('c.endDate IS NOT NULL')
      .andWhere(`(c."endDate" - CURRENT_DATE) IN (:...marks)`, { marks })
      .andWhere(`NOT EXISTS (SELECT 1 FROM contracts n WHERE n."previousContractId" = c.id AND n."deletedAt" IS NULL)`)
      .orderBy('c.endDate', 'ASC');
    return qb.getMany();
  }
}
