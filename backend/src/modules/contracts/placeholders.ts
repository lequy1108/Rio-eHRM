import { formatMoney, moneyInWords } from '../../common/utils/vn-money';
import type { Employee } from '../employees/entities/employee.entity';
import type { Allowance, Contract } from './contract.entity';

export interface RenderContext {
  contract: Contract;
  employee: Employee;
  /** Điều khoản đang áp dụng (đã tính phụ lục) */
  current: { jobTitle?: string | null; baseSalary: number; insuranceSalary?: number | null; allowances: Allowance[] };
  company: Record<string, string>;
}

const vnDate = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
/** Số tháng từ ngày bắt đầu đến hết ngày kết thúc: 01/01 → 31/12 = 12 tháng */
const months = (start: string, end: string) => {
  const e = new Date(`${end}T00:00:00Z`);
  e.setUTCDate(e.getUTCDate() + 1);
  const [y1, m1, d1] = start.split('-').map(Number);
  const m = (e.getUTCFullYear() - y1) * 12 + (e.getUTCMonth() + 1 - m1) - (e.getUTCDate() < d1 ? 1 : 0);
  return Math.max(m, 0);
};
const GENDER: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

/**
 * Biến dùng trong mẫu hợp đồng: {{ten_bien}}. Thêm biến mới: thêm 1 dòng ở đây,
 * trang soạn mẫu tự hiện trong danh sách chèn biến.
 */
export const PLACEHOLDERS: { key: string; label: string; group: string; get: (c: RenderContext) => string }[] = [
  // Công ty
  { key: 'ten_cong_ty', label: 'Tên công ty', group: 'Công ty', get: (c) => c.company.name },
  { key: 'ma_so_thue_cong_ty', label: 'Mã số thuế công ty', group: 'Công ty', get: (c) => c.company.taxCode },
  { key: 'dia_chi_cong_ty', label: 'Địa chỉ công ty', group: 'Công ty', get: (c) => c.company.address },
  { key: 'dien_thoai_cong_ty', label: 'Điện thoại công ty', group: 'Công ty', get: (c) => c.company.phone },
  { key: 'nguoi_dai_dien', label: 'Người ký phía công ty', group: 'Công ty', get: (c) => c.contract.signerName || c.company.representativeName },
  { key: 'chuc_vu_nguoi_dai_dien', label: 'Chức vụ người ký', group: 'Công ty', get: (c) => c.contract.signerTitle || c.company.representativeTitle },
  // Người lao động
  { key: 'ho_ten', label: 'Họ tên', group: 'Người lao động', get: (c) => c.employee.fullName },
  { key: 'ho_ten_in_hoa', label: 'Họ tên in hoa', group: 'Người lao động', get: (c) => c.employee.fullName.toUpperCase() },
  { key: 'ma_nhan_vien', label: 'Mã nhân viên', group: 'Người lao động', get: (c) => c.employee.code },
  { key: 'gioi_tinh', label: 'Giới tính', group: 'Người lao động', get: (c) => (c.employee.gender ? GENDER[c.employee.gender] : '') },
  { key: 'ngay_sinh', label: 'Ngày sinh', group: 'Người lao động', get: (c) => vnDate(c.employee.dateOfBirth) },
  { key: 'quoc_tich', label: 'Quốc tịch', group: 'Người lao động', get: (c) => c.employee.nationality ?? '' },
  { key: 'so_cccd', label: 'Số CCCD', group: 'Người lao động', get: (c) => c.employee.identityNumber ?? '' },
  { key: 'ngay_cap_cccd', label: 'Ngày cấp CCCD', group: 'Người lao động', get: (c) => vnDate(c.employee.identityIssuedDate) },
  { key: 'noi_cap_cccd', label: 'Nơi cấp CCCD', group: 'Người lao động', get: (c) => c.employee.identityIssuedPlace ?? '' },
  { key: 'dia_chi_thuong_tru', label: 'Địa chỉ thường trú', group: 'Người lao động', get: (c) => c.employee.permanentAddress ?? '' },
  { key: 'dia_chi_hien_tai', label: 'Nơi ở hiện tại', group: 'Người lao động', get: (c) => c.employee.address ?? '' },
  { key: 'so_dien_thoai', label: 'Số điện thoại', group: 'Người lao động', get: (c) => c.employee.phone ?? '' },
  { key: 'email', label: 'Email', group: 'Người lao động', get: (c) => c.employee.email },
  { key: 'ma_so_thue_ca_nhan', label: 'MST cá nhân', group: 'Người lao động', get: (c) => c.employee.personalTaxCode ?? '' },
  { key: 'so_bhxh', label: 'Mã số BHXH', group: 'Người lao động', get: (c) => c.employee.socialInsuranceNumber ?? '' },
  { key: 'phong_ban', label: 'Phòng ban', group: 'Người lao động', get: (c) => c.employee.department?.name ?? '' },
  // Hợp đồng
  { key: 'so_hop_dong', label: 'Số hợp đồng', group: 'Hợp đồng', get: (c) => c.contract.contractNumber },
  { key: 'loai_hop_dong', label: 'Loại hợp đồng', group: 'Hợp đồng', get: (c) => c.contract.type?.name ?? '' },
  { key: 'ngay_ky', label: 'Ngày ký', group: 'Hợp đồng', get: (c) => vnDate(c.contract.signDate) },
  {
    key: 'ngay_ky_chu',
    label: 'Ngày ký dạng "ngày … tháng … năm …"',
    group: 'Hợp đồng',
    get: (c) => {
      const [y, m, d] = c.contract.signDate.split('-');
      return `ngày ${d} tháng ${m} năm ${y}`;
    },
  },
  { key: 'ngay_bat_dau', label: 'Ngày bắt đầu', group: 'Hợp đồng', get: (c) => vnDate(c.contract.startDate) },
  { key: 'ngay_ket_thuc', label: 'Ngày kết thúc', group: 'Hợp đồng', get: (c) => vnDate(c.contract.endDate) || 'không xác định' },
  {
    key: 'thoi_han',
    label: 'Thời hạn (vd 12 tháng)',
    group: 'Hợp đồng',
    get: (c) => (c.contract.endDate ? `${months(c.contract.startDate, c.contract.endDate)} tháng` : 'Không xác định thời hạn'),
  },
  { key: 'chuc_danh', label: 'Chức danh', group: 'Hợp đồng', get: (c) => c.current.jobTitle ?? '' },
  { key: 'dia_diem_lam_viec', label: 'Địa điểm làm việc', group: 'Hợp đồng', get: (c) => c.contract.workLocation ?? c.company.address },
  // Lương
  { key: 'luong_co_ban', label: 'Lương cơ bản (số)', group: 'Lương', get: (c) => formatMoney(c.current.baseSalary) },
  { key: 'luong_co_ban_chu', label: 'Lương cơ bản (bằng chữ)', group: 'Lương', get: (c) => moneyInWords(c.current.baseSalary) },
  {
    key: 'luong_bhxh',
    label: 'Lương đóng BHXH',
    group: 'Lương',
    get: (c) => formatMoney(c.current.insuranceSalary ?? c.current.baseSalary),
  },
  {
    key: 'phu_cap',
    label: 'Danh sách phụ cấp',
    group: 'Lương',
    get: (c) =>
      c.current.allowances.length
        ? c.current.allowances.map((a) => `${a.name}: ${formatMoney(a.amount)} đồng/tháng`).join('; ')
        : 'Không có',
  },
  {
    key: 'tong_phu_cap',
    label: 'Tổng phụ cấp',
    group: 'Lương',
    get: (c) => formatMoney(c.current.allowances.reduce((s, a) => s + a.amount, 0)),
  },
  {
    key: 'tong_thu_nhap',
    label: 'Tổng thu nhập (lương + phụ cấp)',
    group: 'Lương',
    get: (c) => formatMoney(c.current.baseSalary + c.current.allowances.reduce((s, a) => s + a.amount, 0)),
  },
  {
    key: 'tong_thu_nhap_chu',
    label: 'Tổng thu nhập (bằng chữ)',
    group: 'Lương',
    get: (c) => moneyInWords(c.current.baseSalary + c.current.allowances.reduce((s, a) => s + a.amount, 0)),
  },
];

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** Thay {{bien}} bằng giá trị (đã escape). Biến không có dữ liệu → để trống và báo lại */
export function renderTemplate(content: string, ctx: RenderContext) {
  const map = new Map(PLACEHOLDERS.map((p) => [p.key, p]));
  const empty = new Set<string>();
  const unknown = new Set<string>();
  const html = content.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, key: string) => {
    const p = map.get(key.toLowerCase());
    if (!p) {
      unknown.add(key);
      return `<mark>{{${esc(key)}}}</mark>`;
    }
    const v = p.get(ctx) ?? '';
    if (!v) {
      empty.add(p.label);
      return '<span class="blank">……………………</span>';
    }
    return esc(v);
  });
  return { html, empty: [...empty], unknown: [...unknown] };
}

/** Bỏ thẻ script, thuộc tính on*, javascript: trong mẫu do người dùng soạn */
export function sanitizeTemplate(html: string) {
  return html
    .replace(/<\s*(script|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
