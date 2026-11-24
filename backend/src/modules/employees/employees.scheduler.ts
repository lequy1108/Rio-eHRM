import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeStatus } from '../../common/enums';
import { hasPermission } from '../../common/permissions';
import { MailService } from '../../common/shared/mail.service';
import { SettingsService } from '../settings/settings.service';
import { User } from '../users/entities/user.entity';
import { Employee } from './entities/employee.entity';
import { EmployeeQualification } from './profile/profile.entities';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Giờ hiện tại theo giờ Việt Nam */
const vnHour = () => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));

@Injectable()
export class EmployeesScheduler {
  private readonly logger = new Logger(EmployeesScheduler.name);

  constructor(
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
    @InjectRepository(EmployeeQualification) private readonly qualifications: Repository<EmployeeQualification>,
  ) {}

  /** Chạy đầu mỗi giờ, chỉ gửi khi đúng giờ nhắc trong Cài đặt → Quy tắc nhân sự */
  @Cron('0 * * * *', { name: 'probation-reminder', timeZone: 'Asia/Ho_Chi_Minh' })
  async tick() {
    if (vnHour() === this.settings.get('employee').reminderHour) {
      await this.remindProbationEnding();
      await this.remindCertificatesExpiring();
    }
  }

  private async hrRecipients() {
    return (await this.users.find({ where: { isActive: true } }))
      .filter((u) => hasPermission(u.role?.permissions, 'employees.update'))
      .map((u) => u.email);
  }

  /** Nhắc chứng chỉ sắp hết hạn (đúng mốc N ngày và mốc 7 ngày, tránh gửi lặp mỗi ngày) */
  async remindCertificatesExpiring() {
    const days = this.settings.get('employee').certificateRemindDays;
    if (!days) return;
    const marks = [...new Set([days, 7, 0].filter((d) => d <= days))];
    const list = await this.qualifications
      .createQueryBuilder('q')
      .innerJoinAndSelect('q.employee', 'e')
      .where('q.expiryDate IS NOT NULL')
      .andWhere('e.status != :s', { s: EmployeeStatus.RESIGNED })
      .andWhere(`(q.expiryDate - CURRENT_DATE) IN (:...marks)`, { marks })
      .orderBy('q.expiryDate', 'ASC')
      .getMany();
    if (!list.length) return;
    const rows = list
      .map(
        (q) =>
          `<li><b>${esc(q.employee!.fullName)}</b> (${esc(q.employee!.code)}): ${esc(q.name)} hết hạn ngày ${new Date(q.expiryDate!).toLocaleDateString('vi-VN')}</li>`,
      )
      .join('');
    const to = await this.hrRecipients();
    this.logger.log(`${list.length} chứng chỉ sắp hết hạn, gửi nhắc cho ${to.length} người`);
    await this.mail.send({
      to,
      subject: `${list.length} chứng chỉ sắp hết hạn`,
      html: `<p>Các chứng chỉ sau sắp hết hạn, cần nhắc nhân viên gia hạn:</p><ul>${rows}</ul>`,
    });
  }

  /** Nhắc người có quyền sửa hồ sơ về nhân viên sắp hết thử việc */
  async remindProbationEnding() {
    const { probationMonths, probationRemindDays } = this.settings.get('employee');
    if (!probationMonths || !probationRemindDays) return;
    const list = await this.employees
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.department', 'd')
      .where('e.status = :s', { s: EmployeeStatus.PROBATION })
      .andWhere(
        `(e.hireDate + make_interval(months => :m))::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + make_interval(days => :days))::date`,
        { m: probationMonths, days: probationRemindDays },
      )
      .orderBy('e.hireDate', 'ASC')
      .getMany();
    if (!list.length) return;

    const recipients = await this.hrRecipients();
    const rows = list
      .map((e) => {
        const end = new Date(e.hireDate);
        end.setMonth(end.getMonth() + probationMonths);
        return `<li><b>${esc(e.fullName)}</b> (${esc(e.code)}, ${esc(e.department?.name ?? 'chưa có phòng ban')}): hết thử việc ngày ${end.toLocaleDateString('vi-VN')}</li>`;
      })
      .join('');

    this.logger.log(`${list.length} nhân viên sắp hết thử việc, gửi nhắc cho ${recipients.length} người`);
    await this.mail.send({
      to: recipients,
      subject: `${list.length} nhân viên sắp hết thử việc`,
      html: `<p>Các nhân viên sau sẽ hết thử việc trong ${probationRemindDays} ngày tới:</p><ul>${rows}</ul><p>Vui lòng đánh giá và cập nhật trạng thái trên hệ thống.</p>`,
    });
  }
}
