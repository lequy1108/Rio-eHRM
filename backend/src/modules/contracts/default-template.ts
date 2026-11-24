/** Mẫu hợp đồng lao động mặc định, tạo khi chưa có mẫu nào. Admin sửa được trong Cài đặt → Hợp đồng */
export const DEFAULT_TEMPLATE = `<p class="center"><strong>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br><strong>Độc lập – Tự do – Hạnh phúc</strong></p>
<p class="center">———————</p>
<h1>HỢP ĐỒNG LAO ĐỘNG</h1>
<p class="center">Số: {{so_hop_dong}}</p>

<p>Hôm nay, {{ngay_ky_chu}}, chúng tôi gồm:</p>

<h2>Bên A: Người sử dụng lao động</h2>
<table class="info">
<tr><td>Tên đơn vị</td><td><strong>{{ten_cong_ty}}</strong></td></tr>
<tr><td>Mã số thuế</td><td>{{ma_so_thue_cong_ty}}</td></tr>
<tr><td>Địa chỉ</td><td>{{dia_chi_cong_ty}}</td></tr>
<tr><td>Điện thoại</td><td>{{dien_thoai_cong_ty}}</td></tr>
<tr><td>Đại diện</td><td>Ông/Bà <strong>{{nguoi_dai_dien}}</strong>, chức vụ {{chuc_vu_nguoi_dai_dien}}</td></tr>
</table>

<h2>Bên B: Người lao động</h2>
<table class="info">
<tr><td>Họ và tên</td><td><strong>{{ho_ten_in_hoa}}</strong></td></tr>
<tr><td>Giới tính</td><td>{{gioi_tinh}}</td></tr>
<tr><td>Ngày sinh</td><td>{{ngay_sinh}}</td></tr>
<tr><td>Quốc tịch</td><td>{{quoc_tich}}</td></tr>
<tr><td>Số CCCD</td><td>{{so_cccd}}, cấp ngày {{ngay_cap_cccd}} tại {{noi_cap_cccd}}</td></tr>
<tr><td>Nơi thường trú</td><td>{{dia_chi_thuong_tru}}</td></tr>
<tr><td>Nơi ở hiện tại</td><td>{{dia_chi_hien_tai}}</td></tr>
<tr><td>Điện thoại</td><td>{{so_dien_thoai}}</td></tr>
</table>

<p>Hai bên thoả thuận ký kết hợp đồng lao động và cam kết làm đúng những điều khoản sau:</p>

<h2>Điều 1. Thời hạn và công việc</h2>
<ol>
<li>Loại hợp đồng: {{loai_hop_dong}}; thời hạn: {{thoi_han}}, từ ngày {{ngay_bat_dau}} đến ngày {{ngay_ket_thuc}}.</li>
<li>Chức danh: {{chuc_danh}}, thuộc {{phong_ban}}.</li>
<li>Địa điểm làm việc: {{dia_diem_lam_viec}}.</li>
<li>Công việc: theo mô tả công việc của chức danh và sự phân công của người quản lý trực tiếp.</li>
</ol>

<h2>Điều 2. Thời giờ làm việc, nghỉ ngơi</h2>
<ol>
<li>Thời giờ làm việc theo nội quy lao động của công ty, không quá 8 giờ/ngày và 48 giờ/tuần.</li>
<li>Nghỉ hằng năm, nghỉ lễ, Tết và nghỉ việc riêng theo quy định của Bộ luật Lao động và nội quy công ty.</li>
</ol>

<h2>Điều 3. Tiền lương, phụ cấp và chế độ</h2>
<ol>
<li>Mức lương cơ bản: <strong>{{luong_co_ban}} đồng/tháng</strong> (bằng chữ: {{luong_co_ban_chu}}).</li>
<li>Phụ cấp: {{phu_cap}}.</li>
<li>Hình thức trả lương: chuyển khoản, trả một lần vào kỳ lương hằng tháng theo quy chế của công ty.</li>
<li>Mức lương đóng bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp: {{luong_bhxh}} đồng/tháng.</li>
<li>Được xét nâng lương, thưởng, đào tạo theo quy chế của công ty.</li>
</ol>

<h2>Điều 4. Quyền và nghĩa vụ của người lao động</h2>
<ol>
<li>Được hưởng lương, phụ cấp, bảo hiểm và các chế độ theo hợp đồng này và quy định của pháp luật.</li>
<li>Hoàn thành công việc được giao; chấp hành nội quy lao động, an toàn, vệ sinh lao động.</li>
<li>Giữ bí mật thông tin kinh doanh, công nghệ của công ty theo quy định.</li>
</ol>

<h2>Điều 5. Quyền và nghĩa vụ của người sử dụng lao động</h2>
<ol>
<li>Bảo đảm việc làm, trả lương đầy đủ, đúng hạn và thực hiện các chế độ theo hợp đồng này.</li>
<li>Điều hành, phân công công việc; khen thưởng, xử lý kỷ luật theo nội quy và pháp luật.</li>
</ol>

<h2>Điều 6. Điều khoản thi hành</h2>
<ol>
<li>Những vấn đề không ghi trong hợp đồng này thực hiện theo nội quy lao động, thoả ước lao động tập thể (nếu có) và pháp luật lao động.</li>
<li>Hợp đồng làm thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản, có hiệu lực từ ngày {{ngay_bat_dau}}.</li>
</ol>

<table class="sign">
<tr><td><strong>NGƯỜI LAO ĐỘNG</strong><br><em>(Ký, ghi rõ họ tên)</em><br><br><br><br><strong>{{ho_ten}}</strong></td>
<td><strong>NGƯỜI SỬ DỤNG LAO ĐỘNG</strong><br><em>(Ký, đóng dấu, ghi rõ họ tên)</em><br><br><br><br><strong>{{nguoi_dai_dien}}</strong></td></tr>
</table>`;

export const DEFAULT_TYPES = [
  { code: 'TV', name: 'Hợp đồng thử việc', hasTerm: true, defaultMonths: 2, isProbation: true },
  { code: 'XDTH12', name: 'Xác định thời hạn 12 tháng', hasTerm: true, defaultMonths: 12, isProbation: false },
  { code: 'XDTH24', name: 'Xác định thời hạn 24 tháng', hasTerm: true, defaultMonths: 24, isProbation: false },
  { code: 'XDTH36', name: 'Xác định thời hạn 36 tháng', hasTerm: true, defaultMonths: 36, isProbation: false },
  { code: 'KXDTH', name: 'Không xác định thời hạn', hasTerm: false, defaultMonths: null, isProbation: false },
  { code: 'CTV', name: 'Cộng tác viên / dịch vụ', hasTerm: true, defaultMonths: 12, isProbation: false },
];
