import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

/** Thông tin cột không phụ thuộc kiểu dữ liệu (dùng cho file mẫu và đọc file) */
export interface ExcelColumnBase {
  header: string;
  key: string;
  width?: number;
  /** Ghi chú hiển thị ở ô tiêu đề (file mẫu) */
  note?: string;
  required?: boolean;
}

export interface ExcelColumn<T = Record<string, unknown>> extends ExcelColumnBase {
  /** Lấy giá trị từ bản ghi khi xuất */
  value?: (row: T) => unknown;
}

@Injectable()
export class ExcelService {
  /** Xuất danh sách ra file .xlsx */
  async export<T>(sheetName: string, columns: ExcelColumn<T>[], rows: T[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'eHRM';
    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
    this.styleHeader(ws, columns);
    for (const r of rows) {
      ws.addRow(
        Object.fromEntries(
          columns.map((c) => [c.key, c.value ? c.value(r) : (r as Record<string, unknown>)[c.key]]),
        ),
      );
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /** File mẫu để nhập: dòng tiêu đề + ghi chú + dòng ví dụ + sheet hướng dẫn */
  async template(
    sheetName: string,
    columns: ExcelColumnBase[],
    sample: Record<string, unknown>[],
    guide: string[] = [],
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = columns.map((c) => ({
      header: c.required ? `${c.header} *` : c.header,
      key: c.key,
      width: c.width ?? 18,
    }));
    this.styleHeader(ws, columns);
    sample.forEach((s) => ws.addRow(s));

    // Không dùng ghi chú (comment) trong ô: exceljs lỗi khi đọc lại file có comment đã được Excel lưu.
    // Hướng dẫn và mô tả từng cột đặt ở sheet riêng.
    const g = wb.addWorksheet('Hướng dẫn');
    g.getColumn(1).width = 22;
    g.getColumn(2).width = 90;
    let r = 1;
    guide.forEach((line, i) => {
      const cell = g.getCell(r++, 1);
      cell.value = line;
      if (i === 0) cell.font = { bold: true, size: 13 };
    });
    r++;
    g.getCell(r, 1).value = 'Cột';
    g.getCell(r, 2).value = 'Mô tả';
    g.getRow(r).font = { bold: true };
    r++;
    for (const c of columns) {
      g.getCell(r, 1).value = c.required ? `${c.header} *` : c.header;
      g.getCell(r, 2).value = [c.required ? 'Bắt buộc.' : 'Không bắt buộc.', c.note ?? ''].join(' ').trim();
      r++;
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /**
   * Đọc sheet đầu tiên. Dòng 1 là tiêu đề; khớp tiêu đề với columns (bỏ dấu *, không phân biệt hoa thường).
   * Trả về mảng { __row: số dòng trong Excel, [key]: giá trị }
   */
  async parse(buffer: Buffer, columns: ExcelColumnBase[]) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];

    const norm = (s: string) => s.replace(/\*/g, '').trim().toLowerCase();
    const byHeader = new Map(columns.map((c) => [norm(c.header), c.key]));
    const colKeys: Record<number, string> = {};
    ws.getRow(1).eachCell((cell, col) => {
      const key = byHeader.get(norm(String(cell.value ?? '')));
      if (key) colKeys[col] = key;
    });

    const rows: Array<Record<string, unknown> & { __row: number }> = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, unknown> & { __row: number } = { __row: rowNumber };
      let hasValue = false;
      row.eachCell((cell, col) => {
        const key = colKeys[col];
        if (!key) return;
        const v = this.cellValue(cell.value);
        if (v !== '' && v !== null && v !== undefined) {
          obj[key] = v;
          hasValue = true;
        }
      });
      if (hasValue) rows.push(obj);
    });
    return rows;
  }

  private cellValue(v: ExcelJS.CellValue): unknown {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
      if ('text' in v) return String(v.text).trim(); // hyperlink
      if ('richText' in v) return v.richText.map((t) => t.text).join('').trim();
      if ('result' in v) return v.result; // công thức
    }
    return typeof v === 'string' ? v.trim() : v;
  }

  private styleHeader(ws: ExcelJS.Worksheet, columns: ExcelColumnBase[]) {
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell, i) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: columns[i - 1]?.required ? 'FF1F57D1' : 'FF475569' },
      };
      cell.alignment = { vertical: 'middle' };
    });
  }
}

/** Chuyển ô ngày trong Excel (Date hoặc chuỗi dd/mm/yyyy, yyyy-mm-dd) thành 'yyyy-mm-dd' */
export function toIsoDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    // ExcelJS trả ngày theo UTC
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) {
    const [, d, mo, y] = m;
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return isNaN(Date.parse(iso)) ? null : iso;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m && !isNaN(Date.parse(s))) return s;
  return null;
}

/** 'yyyy-mm-dd' -> 'dd/mm/yyyy' để hiển thị trong Excel */
export function toViDate(iso?: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
