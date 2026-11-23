import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction } from '../../common/enums';
import { CreateCustomFieldDto, UpdateCustomFieldDto } from './custom-field.dto';
import { CustomField, CustomFieldType } from './custom-field.entity';

export type CustomValues = Record<string, unknown>;

export const CUSTOM_TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: 'Chữ',
  TEXTAREA: 'Đoạn văn',
  NUMBER: 'Số',
  DATE: 'Ngày',
  SELECT: 'Chọn một',
  MULTISELECT: 'Chọn nhiều',
  BOOLEAN: 'Có/Không',
};

const slugKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'f_$1')
    .slice(0, 40) || 'field';

const isEmpty = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomField) private readonly repo: Repository<CustomField>,
    private readonly audit: AuditService,
  ) {}

  findAll(entity = 'EMPLOYEE', activeOnly = false) {
    return this.repo.find({
      where: { entity, ...(activeOnly ? { isActive: true } : {}) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  private async findOne(id: string) {
    const f = await this.repo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Không tìm thấy trường');
    return f;
  }

  private checkOptions(type: CustomFieldType, options?: string[]) {
    if ((type === CustomFieldType.SELECT || type === CustomFieldType.MULTISELECT) && !options?.length) {
      throw new BadRequestException('Trường dạng chọn cần ít nhất một lựa chọn');
    }
  }

  private snap(f: CustomField) {
    return {
      label: f.label,
      type: CUSTOM_TYPE_LABEL[f.type],
      options: f.options?.join(', ') || null,
      required: f.required ? 'Có' : 'Không',
      section: f.section,
      isActive: f.isActive ? 'Đang dùng' : 'Ngừng dùng',
      showInList: f.showInList ? 'Có' : 'Không',
      sensitive: f.sensitive ? 'Có' : 'Không',
    };
  }

  async create(dto: CreateCustomFieldDto, entity = 'EMPLOYEE') {
    this.checkOptions(dto.type, dto.options);
    let key = dto.key || slugKey(dto.label);
    if (dto.key) {
      if (await this.repo.exists({ where: { entity, key }, withDeleted: true })) throw new ConflictException('Khoá đã được dùng');
    } else {
      const base = key;
      for (let i = 2; await this.repo.exists({ where: { entity, key }, withDeleted: true }); i++) key = `${base}_${i}`;
    }
    const max = await this.repo.maximum('sortOrder', { entity });
    const saved = await this.repo.save(
      this.repo.create({
        ...dto,
        key,
        entity,
        options: dto.type === CustomFieldType.SELECT || dto.type === CustomFieldType.MULTISELECT ? dto.options : [],
        section: dto.section || 'Thông tin bổ sung',
        sortOrder: dto.sortOrder ?? (max ?? 0) + 1,
      }),
    );
    await this.audit.log({ entityType: 'CustomField', entityId: saved.id, action: AuditAction.CREATE, label: saved.label, after: this.snap(saved) });
    return saved;
  }

  async update(id: string, dto: UpdateCustomFieldDto) {
    const f = await this.findOne(id);
    const before = this.snap(f);
    Object.assign(f, dto);
    if (dto.section === '') f.section = 'Thông tin bổ sung';
    this.checkOptions(f.type, f.options);
    const saved = await this.repo.save(f);
    await this.audit.log({ entityType: 'CustomField', entityId: id, action: AuditAction.UPDATE, label: saved.label, before, after: this.snap(saved) });
    return saved;
  }

  async reorder(ids: string[]) {
    await this.repo.manager.transaction(async (m) => {
      for (const [i, id] of ids.entries()) await m.update(CustomField, { id }, { sortOrder: i + 1 });
    });
    return this.findAll();
  }

  /** Xoá định nghĩa trường; dữ liệu đã nhập vẫn nằm trong hồ sơ nhưng không hiển thị nữa */
  async remove(id: string) {
    const f = await this.findOne(id);
    await this.repo.softDelete(id);
    await this.audit.log({ entityType: 'CustomField', entityId: id, action: AuditAction.DELETE, label: f.label });
    return { id };
  }

  /** Chuyển một giá trị thô (từ form hoặc Excel) về đúng kiểu; lỗi thì ném chuỗi mô tả */
  coerce(f: CustomField, raw: unknown): unknown {
    if (isEmpty(raw)) return null;
    switch (f.type) {
      case CustomFieldType.TEXT:
      case CustomFieldType.TEXTAREA: {
        const s = String(raw).trim();
        if (s.length > (f.type === CustomFieldType.TEXT ? 255 : 5000)) throw `${f.label} quá dài`;
        return s || null;
      }
      case CustomFieldType.NUMBER: {
        const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/\s/g, '').replace(',', '.'));
        if (!Number.isFinite(n)) throw `${f.label} phải là số`;
        return n;
      }
      case CustomFieldType.DATE: {
        const s = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).trim();
        const vi = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
        const iso = vi ? `${vi[3]}-${vi[2].padStart(2, '0')}-${vi[1].padStart(2, '0')}` : s;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(iso))) throw `${f.label} không phải ngày hợp lệ`;
        return iso;
      }
      case CustomFieldType.BOOLEAN: {
        if (typeof raw === 'boolean') return raw;
        const s = String(raw).trim().toLowerCase();
        if (['true', '1', 'có', 'co', 'x', 'yes'].includes(s)) return true;
        if (['false', '0', 'không', 'khong', 'no'].includes(s)) return false;
        throw `${f.label} chỉ nhận Có hoặc Không`;
      }
      case CustomFieldType.SELECT: {
        const s = String(raw).trim();
        const match = f.options.find((o) => o.toLowerCase() === s.toLowerCase());
        if (!match) throw `${f.label}: "${s}" không có trong danh sách lựa chọn`;
        return match;
      }
      case CustomFieldType.MULTISELECT: {
        const list = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[,;]/);
        const out: string[] = [];
        for (const item of list.map((x) => x.trim()).filter(Boolean)) {
          const match = f.options.find((o) => o.toLowerCase() === item.toLowerCase());
          if (!match) throw `${f.label}: "${item}" không có trong danh sách lựa chọn`;
          if (!out.includes(match)) out.push(match);
        }
        return out.length ? out : null;
      }
    }
  }

  /**
   * Gộp giá trị mới vào giá trị hiện có và kiểm tra theo định nghĩa trường.
   * Giá trị rỗng = xoá. Khoá lạ bị từ chối. Trường bắt buộc chỉ kiểm tra khi `checkRequired`.
   */
  async merge(current: CustomValues | null | undefined, patch: CustomValues, opts: { checkRequired?: boolean; canSensitive?: boolean } = {}) {
    const defs = await this.findAll('EMPLOYEE', true);
    const byKey = new Map(defs.map((d) => [d.key, d]));
    const out: CustomValues = { ...(current ?? {}) };
    const errors: string[] = [];
    for (const [k, raw] of Object.entries(patch ?? {})) {
      const def = byKey.get(k);
      if (!def) {
        errors.push(`Trường "${k}" không tồn tại hoặc đã ngừng dùng`);
        continue;
      }
      if (def.sensitive && opts.canSensitive === false) {
        errors.push(`Bạn không có quyền sửa trường "${def.label}"`);
        continue;
      }
      try {
        const v = this.coerce(def, raw);
        if (v === null) delete out[k];
        else out[k] = v;
      } catch (e) {
        errors.push(String(e));
      }
    }
    if (opts.checkRequired) {
      for (const d of defs) if (d.required && isEmpty(out[d.key])) errors.push(`Vui lòng nhập ${d.label}`);
    }
    if (errors.length) throw new BadRequestException(errors);
    return out;
  }

  /** Giá trị dạng hiển thị, khoá theo tên trường (dùng cho lịch sử thay đổi) */
  display(defs: CustomField[], values: CustomValues | null | undefined) {
    const out: Record<string, unknown> = {};
    for (const d of defs) {
      const v = values?.[d.key];
      out[d.label] = isEmpty(v) ? null : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Có' : 'Không') : v;
    }
    return out;
  }
}
