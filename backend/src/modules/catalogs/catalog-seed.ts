import { CatalogType } from '../../common/enums';

type Seed = { code: string; name: string; shortName?: string };

/** 54 dân tộc Việt Nam (theo danh mục của Tổng cục Thống kê) */
const ETHNICITIES = [
  'Kinh', 'Tày', 'Thái', 'Mường', 'Khmer', 'Hoa', 'Nùng', 'Mông', 'Dao', 'Gia Rai', 'Ê Đê', 'Ba Na', 'Sán Chay',
  'Chăm', 'Cơ Ho', 'Xơ Đăng', 'Sán Dìu', 'Hrê', 'Ra Glai', 'Mnông', 'Thổ', 'Xtiêng', 'Khơ Mú', 'Bru - Vân Kiều',
  'Cơ Tu', 'Giáy', 'Tà Ôi', 'Mạ', 'Giẻ - Triêng', 'Co', 'Chơ Ro', 'Xinh Mun', 'Hà Nhì', 'Chu Ru', 'Lào', 'La Chí',
  'Kháng', 'Phù Lá', 'La Hủ', 'La Ha', 'Pà Thẻn', 'Lự', 'Ngái', 'Chứt', 'Lô Lô', 'Mảng', 'Cơ Lao', 'Bố Y', 'Cống',
  'Si La', 'Pu Péo', 'Rơ Măm', 'Brâu', 'Ơ Đu',
];

const RELIGIONS = ['Không', 'Phật giáo', 'Công giáo', 'Tin Lành', 'Cao Đài', 'Phật giáo Hoà Hảo', 'Hồi giáo', 'Khác'];

const EDUCATION = ['Trung học cơ sở', 'Trung học phổ thông', 'Trung cấp', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ', 'Khác'];

/** 34 đơn vị hành chính cấp tỉnh từ 01/07/2025 (Nghị quyết 202/2025/QH15) */
const PROVINCES = [
  'Thành phố Hà Nội', 'Thành phố Huế', 'Thành phố Hải Phòng', 'Thành phố Đà Nẵng', 'Thành phố Hồ Chí Minh',
  'Thành phố Cần Thơ', 'Tỉnh Tuyên Quang', 'Tỉnh Cao Bằng', 'Tỉnh Lai Châu', 'Tỉnh Lào Cai', 'Tỉnh Thái Nguyên',
  'Tỉnh Điện Biên', 'Tỉnh Lạng Sơn', 'Tỉnh Sơn La', 'Tỉnh Phú Thọ', 'Tỉnh Bắc Ninh', 'Tỉnh Quảng Ninh',
  'Tỉnh Hưng Yên', 'Tỉnh Ninh Bình', 'Tỉnh Thanh Hoá', 'Tỉnh Nghệ An', 'Tỉnh Hà Tĩnh', 'Tỉnh Quảng Trị',
  'Tỉnh Quảng Ngãi', 'Tỉnh Gia Lai', 'Tỉnh Khánh Hoà', 'Tỉnh Lâm Đồng', 'Tỉnh Đắk Lắk', 'Tỉnh Đồng Nai',
  'Tỉnh Tây Ninh', 'Tỉnh Vĩnh Long', 'Tỉnh Đồng Tháp', 'Tỉnh An Giang', 'Tỉnh Cà Mau',
];

const BANKS: Seed[] = [
  { code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng TMCP Ngoại thương Việt Nam' },
  { code: 'CTG', shortName: 'VietinBank', name: 'Ngân hàng TMCP Công Thương Việt Nam' },
  { code: 'BIDV', shortName: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam' },
  { code: 'AGRIBANK', shortName: 'Agribank', name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam' },
  { code: 'TCB', shortName: 'Techcombank', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam' },
  { code: 'MB', shortName: 'MB', name: 'Ngân hàng TMCP Quân đội' },
  { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng TMCP Á Châu' },
  { code: 'VPB', shortName: 'VPBank', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
  { code: 'TPB', shortName: 'TPBank', name: 'Ngân hàng TMCP Tiên Phong' },
  { code: 'STB', shortName: 'Sacombank', name: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
  { code: 'HDB', shortName: 'HDBank', name: 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh' },
  { code: 'VIB', shortName: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam' },
  { code: 'SHB', shortName: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội' },
  { code: 'SSB', shortName: 'SeABank', name: 'Ngân hàng TMCP Đông Nam Á' },
  { code: 'OCB', shortName: 'OCB', name: 'Ngân hàng TMCP Phương Đông' },
  { code: 'MSB', shortName: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam' },
  { code: 'EIB', shortName: 'Eximbank', name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam' },
  { code: 'LPB', shortName: 'LPBank', name: 'Ngân hàng TMCP Lộc Phát Việt Nam' },
  { code: 'NAB', shortName: 'Nam A Bank', name: 'Ngân hàng TMCP Nam Á' },
  { code: 'BAB', shortName: 'Bac A Bank', name: 'Ngân hàng TMCP Bắc Á' },
  { code: 'ABB', shortName: 'ABBANK', name: 'Ngân hàng TMCP An Bình' },
  { code: 'PVCB', shortName: 'PVcomBank', name: 'Ngân hàng TMCP Đại Chúng Việt Nam' },
  { code: 'KLB', shortName: 'KienlongBank', name: 'Ngân hàng TMCP Kiên Long' },
  { code: 'NCB', shortName: 'NCB', name: 'Ngân hàng TMCP Quốc Dân' },
  { code: 'SGB', shortName: 'Saigonbank', name: 'Ngân hàng TMCP Sài Gòn Công Thương' },
  { code: 'BVB', shortName: 'BVBank', name: 'Ngân hàng TMCP Bản Việt' },
  { code: 'VAB', shortName: 'VietABank', name: 'Ngân hàng TMCP Việt Á' },
  { code: 'SHBVN', shortName: 'Shinhan Bank', name: 'Ngân hàng TNHH MTV Shinhan Việt Nam' },
  { code: 'HSBC', shortName: 'HSBC', name: 'Ngân hàng TNHH MTV HSBC (Việt Nam)' },
  { code: 'WOO', shortName: 'Woori Bank', name: 'Ngân hàng TNHH MTV Woori Việt Nam' },
];

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/^(Thành phố|Tỉnh|Thanh pho|Tinh) /i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();

const fromNames = (names: string[]): Seed[] => names.map((name) => ({ code: slug(name), name }));

export const CATALOG_SEED: Record<CatalogType, Seed[]> = {
  [CatalogType.ETHNICITY]: fromNames(ETHNICITIES),
  [CatalogType.RELIGION]: fromNames(RELIGIONS),
  [CatalogType.EDUCATION]: fromNames(EDUCATION),
  [CatalogType.PROVINCE]: fromNames(PROVINCES),
  [CatalogType.BANK]: BANKS,
};
