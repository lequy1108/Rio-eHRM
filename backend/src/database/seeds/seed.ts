/**
 * Tạo dữ liệu mẫu: phòng ban, chức vụ, nhân viên và tài khoản admin.
 * Chạy: npm run seed  (cần tạo bảng trước, bằng cách chạy app với DB_SYNC=true hoặc migration:run)
 */
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { EmployeeStatus, Gender } from '../../common/enums';
import { Department } from '../../modules/departments/entities/department.entity';
import { Employee } from '../../modules/employees/entities/employee.entity';
import { Position } from '../../modules/positions/entities/position.entity';
import { AppRole } from '../../modules/roles/role.entity';
import { ensureSystemRoles } from '../../modules/roles/roles.service';
import { User } from '../../modules/users/entities/user.entity';
import { dataSourceOptions } from '../data-source';

async function run() {
  const ds = await new DataSource(dataSourceOptions).initialize();
  const depRepo = ds.getRepository(Department);
  const posRepo = ds.getRepository(Position);
  const empRepo = ds.getRepository(Employee);
  const userRepo = ds.getRepository(User);

  if (await userRepo.exists({ where: { email: 'admin@ehrm.local' } })) {
    console.log('Đã có dữ liệu seed, bỏ qua.');
    await ds.destroy();
    return;
  }

  const [bod, hr, it, acc] = await depRepo.save([
    depRepo.create({ code: 'BOD', name: 'Ban Giám đốc' }),
    depRepo.create({ code: 'HR', name: 'Phòng Nhân sự' }),
    depRepo.create({ code: 'IT', name: 'Phòng Công nghệ' }),
    depRepo.create({ code: 'ACC', name: 'Phòng Kế toán' }),
  ]);
  for (const d of [hr, it, acc]) d.parentId = bod.id;
  await depRepo.save([hr, it, acc]);

  const [ceo, head, staff] = await posRepo.save([
    posRepo.create({ code: 'CEO', name: 'Giám đốc', level: 1 }),
    posRepo.create({ code: 'HEAD', name: 'Trưởng phòng', level: 2 }),
    posRepo.create({ code: 'STAFF', name: 'Nhân viên', level: 3 }),
  ]);

  const e = (
    code: string,
    fullName: string,
    email: string,
    gender: Gender,
    dep: Department,
    pos: Position,
    status = EmployeeStatus.ACTIVE,
  ) =>
    empRepo.create({
      code,
      fullName,
      email,
      gender,
      departmentId: dep.id,
      positionId: pos.id,
      status,
      hireDate: '2024-01-02',
    });

  const [eCeo, eHr, eIt] = await empRepo.save([
    e('NV0001', 'Nguyễn Văn An', 'an.nguyen@ehrm.local', Gender.MALE, bod, ceo),
    e('NV0002', 'Trần Thị Bình', 'binh.tran@ehrm.local', Gender.FEMALE, hr, head),
    e('NV0003', 'Lê Minh Cường', 'cuong.le@ehrm.local', Gender.MALE, it, head),
  ]);
  await empRepo.save([
    e('NV0004', 'Phạm Thu Dung', 'dung.pham@ehrm.local', Gender.FEMALE, it, staff, EmployeeStatus.PROBATION),
    e('NV0005', 'Hoàng Văn Em', 'em.hoang@ehrm.local', Gender.MALE, acc, staff),
  ]);

  bod.managerId = eCeo.id;
  hr.managerId = eHr.id;
  it.managerId = eIt.id;
  await depRepo.save([bod, hr, it]);

  await ensureSystemRoles(ds);
  const roleId = async (code: string) => (await ds.getRepository(AppRole).findOneByOrFail({ code })).id;
  const pwd = await bcrypt.hash('Admin@123', 10);
  await userRepo.save([
    userRepo.create({ email: 'admin@ehrm.local', password: pwd, roleId: await roleId('ADMIN') }),
    userRepo.create({ email: 'binh.tran@ehrm.local', password: pwd, roleId: await roleId('HR'), employeeId: eHr.id }),
    userRepo.create({ email: 'cuong.le@ehrm.local', password: pwd, roleId: await roleId('MANAGER'), employeeId: eIt.id }),
  ]);

  console.log('Seed xong. Đăng nhập: admin@ehrm.local / Admin@123');
  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
