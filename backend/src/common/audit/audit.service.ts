import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuditAction } from '../enums';
import { AuditChanges, AuditLog } from './audit-log.entity';
import { requestContext } from './request-context';

type Snapshot = Record<string, unknown>;

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** So sánh hai ảnh chụp dữ liệu, trả về các trường thay đổi */
export function diffSnapshots(before: Snapshot | null, after: Snapshot | null): AuditChanges {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changes: AuditChanges = {};
  for (const k of keys) {
    const from = before?.[k] ?? null;
    const to = after?.[k] ?? null;
    if (!same(from, to)) changes[k] = { from, to };
  }
  return changes;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  /**
   * Ghi nhật ký. Truyền ảnh chụp trước/sau ở dạng hiển thị (tên phòng ban thay vì id…).
   * UPDATE không có thay đổi thì bỏ qua. Lỗi ghi log không làm hỏng thao tác chính.
   */
  async log(params: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    before?: Snapshot | null;
    after?: Snapshot | null;
    parentType?: string;
    parentId?: string;
    label?: string;
  }) {
    const changes =
      params.action === AuditAction.DELETE ? {} : diffSnapshots(params.before ?? null, params.after ?? null);
    if (params.action === AuditAction.UPDATE && !Object.keys(changes).length) return;
    const store = requestContext.getStore();
    try {
      await this.repo.save(
        this.repo.create({
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        parentType: params.parentType ?? null,
        parentId: params.parentId ?? null,
        label: params.label ?? null,
        changes,
        userId: store?.user?.sub ?? null,
        userEmail: store?.user?.email ?? null,
        ip: store?.ip ?? null,
        }),
      );
    } catch (err) {
      this.logger.error(`Không ghi được audit log: ${(err as Error).message}`);
    }
  }

  /** Lịch sử của một đối tượng, gồm cả các đối tượng con (vd người phụ thuộc của nhân viên) */
  async history(entityType: string, entityId: string, page = 1, limit = 50) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where(
        new Brackets((w) =>
          w
            .where('a.entityType = :t AND a.entityId = :id', { t: entityType, id: entityId })
            .orWhere('a.parentType = :t AND a.parentId = :id', { t: entityType, id: entityId }),
        ),
      )
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
