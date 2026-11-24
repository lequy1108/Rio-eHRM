import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasPermission } from '../../common/permissions';
import { MailService } from '../../common/shared/mail.service';
import { SettingsService } from '../settings/settings.service';
import { User } from '../users/entities/user.entity';
import { ContractsService } from './contracts.service';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const vnHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));

@Injectable()
export class ContractsScheduler {
  private readonly logger = new Logger(ContractsScheduler.name);

  constructor(
    private readonly contracts: ContractsService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Cron('10 0 * * *', { name: 'contracts-start', timeZone: 'Asia/Ho_Chi_Minh' })
  syncStart() {
    return this.contracts.syncStartingToday();
  }

  @Cron('0 * * * *', { name: 'contracts-remind', timeZone: 'Asia/Ho_Chi_Minh' })
  async tick() {
    if (vnHour() === this.settings.get('employee').reminderHour) await this.remindExpiring();
  }

  /** Email nhắc hợp đồng sắp hết hạn chưa gia hạn, đúng các mốc trong Cài đặt → Hợp đồng */
  async remindExpiring() {
    const list = await this.contracts.dueForReminder();
    if (!list.length) return;
    const to = (await this.users.find({ where: { isActive: true } }))
      .filter((u) => hasPermission(u.role?.permissions, 'contracts.manage'))
      .map((u) => u.email);
    const rows = list
      .map(
        (c) =>
          `<li><b>${esc(c.employee!.fullName)}</b> (${esc(c.employee!.code)}, ${esc(c.employee!.department?.name ?? 'chưa có phòng ban')}): ` +
          `hợp đồng ${esc(c.contractNumber)} hết hạn ngày ${c.endDate!.split('-').reverse().join('/')}</li>`,
      )
      .join('');
    this.logger.log(`${list.length} hợp đồng sắp hết hạn, gửi nhắc cho ${to.length} người`);
    await this.mail.send({
      to,
      subject: `${list.length} hợp đồng lao động sắp hết hạn`,
      html: `<p>Các hợp đồng sau sắp hết hạn và chưa được gia hạn:</p><ul>${rows}</ul><p>Vào mục Hợp đồng để gia hạn, tái ký hoặc chấm dứt.</p>`,
    });
  }
}
