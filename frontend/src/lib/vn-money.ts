// Bản sao của backend/src/common/utils/vn-money.ts (giữ hai bản giống nhau)
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

/** Đọc một nhóm 3 chữ số. `full` = đọc cả "không trăm" khi đứng sau nhóm khác */
function readTriple(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const out: string[] = [];
  if (h > 0 || full) out.push(`${DIGITS[h]} trăm`);
  if (t > 1) {
    out.push(`${DIGITS[t]} mươi`);
    if (u === 1) out.push('mốt');
    else if (u === 4) out.push('tư');
    else if (u === 5) out.push('lăm');
    else if (u > 0) out.push(DIGITS[u]);
  } else if (t === 1) {
    out.push('mười');
    if (u === 5) out.push('lăm');
    else if (u > 0) out.push(DIGITS[u]);
  } else if (u > 0) {
    if (h > 0 || full) out.push('lẻ');
    out.push(DIGITS[u]);
  }
  return out.join(' ');
}

/** Số tiền bằng chữ tiếng Việt: 12500000 → "Mười hai triệu năm trăm nghìn đồng" */
export function moneyInWords(value: number | null | undefined): string {
  const n = Math.round(Math.abs(Number(value ?? 0)));
  if (!n) return 'Không đồng';
  const groups: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) groups.push(x % 1000);
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const full = i < groups.length - 1;
    parts.push(`${readTriple(groups[i], full)} ${UNITS[i]}`.trim());
  }
  const s = parts.join(' ') + ' đồng';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const formatMoney = (v: number | null | undefined) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(v ?? 0)));
