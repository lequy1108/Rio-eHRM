# ROADMAP – Lộ trình chức năng eHRM

Làm xong việc nào thì đổi `- [ ]` thành `- [x]`. Làm theo thứ tự giai đoạn: giai đoạn sau dùng dữ liệu của giai đoạn trước.

**Một việc được tính là xong khi:** có API (kèm validate và phân quyền), có giao diện, chạy thử được, và đã cập nhật Swagger, seed nếu cần, cùng mục "Trạng thái" trong `CLAUDE.md`.

Ký hiệu: **[BE]** backend, **[FE]** frontend, ⭐ nên làm sớm vì giúp dễ dùng hơn hẳn.

## Tổng quan tiến độ

| #  | Giai đoạn                          | Cần có trước     |
| -- | ---------------------------------- | ---------------- |
| 0  | Nền tảng & trải nghiệm dùng chung  | —                |
| 1  | Quản trị hệ thống & tài khoản      | 0                |
| 2  | Cơ cấu tổ chức                     | 0                |
| 3  | Hồ sơ nhân viên đầy đủ             | 2                |
| 4  | Hợp đồng lao động                  | 3                |
| 5  | Thông báo & luồng phê duyệt        | 1, 3             |
| 6  | Ca làm việc & chấm công            | 3, 5             |
| 7  | Nghỉ phép                          | 5, 6             |
| 8  | Đơn từ khác (OT, công tác, giải trình) | 5, 6         |
| 9  | Tiền lương, bảo hiểm, thuế         | 4, 6, 7, 8       |
| 10 | Cổng nhân viên (Self-service)      | 3 → 9            |
| 11 | Tuyển dụng                         | 2, 5             |
| 12 | Hội nhập & nghỉ việc               | 3, 4, 11         |
| 13 | Đánh giá hiệu suất (KPI/OKR)       | 3, 5             |
| 14 | Đào tạo                            | 3                |
| 15 | Tài sản & thiết bị                 | 3                |
| 16 | Báo cáo & thống kê                 | 3 → 9            |
| 17 | Bảo mật, vận hành, triển khai      | làm dần, chốt cuối |
| 18 | Mở rộng: mobile, tích hợp, AI      | sau cùng         |

---

## 0. Nền tảng & trải nghiệm dùng chung

Backend
- [x] Cấu trúc monorepo NestJS + Next.js + PostgreSQL + Docker
- [x] Kết nối DB TypeORM, `BaseEntity` (uuid, timestamps, xoá mềm)
- [x] Response chuẩn `{ success, data }`, xử lý lỗi tập trung, lỗi tiếng Việt
- [x] Phân trang, tìm kiếm, sắp xếp dùng chung
- [x] Swagger, health check, seed dữ liệu mẫu
- [x] Upload file dùng chung (lưu local trước, sau chuyển S3/MinIO): giới hạn dung lượng và loại file
- [x] Xuất Excel dùng chung (exceljs)
- [x] Nhập Excel dùng chung: file mẫu, xem trước, báo lỗi theo từng dòng
- [ ] Tạo PDF dùng chung (hợp đồng, phiếu lương, quyết định)
- [x] Gửi email dùng chung (nodemailer + mẫu email)
- [ ] Hàng đợi tác vụ nền (BullMQ + Redis) cho email, tính lương, import
- [x] Lịch chạy định kỳ (@nestjs/schedule) cho nhắc việc và chốt công

Frontend, trải nghiệm người dùng
- [x] Layout sidebar + header, trang đăng nhập, bảo vệ route
- [x] Modal, phân trang, bảng danh sách có tìm kiếm và bộ lọc
- [x] ⭐ Toast thông báo thành công/lỗi thay cho `alert`
- [x] ⭐ Hộp thoại xác nhận đẹp thay cho `confirm()` của trình duyệt
- [x] ⭐ Skeleton khi đang tải, trạng thái trống có hình minh hoạ và nút hành động
- [x] ⭐ Sidebar thu gọn được, có icon, responsive trên điện thoại (menu hamburger)
- [x] ⭐ Breadcrumb và tiêu đề trang
- [x] Thư viện form và validate phía client (react-hook-form + zod), báo lỗi ngay dưới từng ô
- [x] Thư viện gọi API có cache (TanStack Query): tự tải lại, không nháy trang
- [x] Bộ component UI thống nhất (kiểu shadcn/ui): Select có tìm kiếm, Tabs, Badge, Avatar, Dropdown (DatePicker đang dùng ô ngày của trình duyệt)
- [x] Bảng nâng cao: chọn nhiều dòng, thao tác hàng loạt, ẩn/hiện cột, sắp xếp khi bấm tiêu đề cột
- [x] Lưu bộ lọc trên URL (F5 hoặc chia sẻ link vẫn giữ bộ lọc)
- [x] Tìm kiếm nhanh toàn hệ thống (Ctrl+K): nhân viên, phòng ban, chức năng
- [x] Chế độ tối (dark mode)
- [x] Trang 404, 403 (không có quyền), 500 thân thiện
- [x] Tự đăng xuất khi token hết hạn và báo cho người dùng

## 1. Quản trị hệ thống & tài khoản

- [x] [BE] Đăng nhập JWT, `/auth/me`, đổi mật khẩu
- [x] [BE] Phân quyền theo vai trò: ADMIN, HR, MANAGER, EMPLOYEE
- [x] [BE] CRUD tài khoản (chỉ ADMIN)
- [x] [FE] ⭐ Trang hồ sơ cá nhân + đổi mật khẩu
- [x] [FE] Trang quản lý tài khoản: tạo, khoá/mở, đổi vai trò, gắn với nhân viên, reset mật khẩu
- [ ] [BE+FE] Quên mật khẩu qua email (link có hạn)
- [ ] [BE] Refresh token + thu hồi phiên đăng nhập
- [ ] [BE+FE] Tạo tài khoản tự động khi thêm nhân viên (gửi email mời đặt mật khẩu)
- [x] [BE+FE] Phân quyền chi tiết theo chức năng (xem/thêm/sửa/xoá/duyệt/xuất), tự tạo vai trò mới
- [ ] [BE] Phân quyền theo phạm vi dữ liệu: toàn công ty / chi nhánh / phòng ban mình / chỉ bản thân
- [x] [BE+FE] Nhật ký hoạt động (audit log): ai, làm gì, lúc nào, dữ liệu trước và sau
- [ ] [BE+FE] Cấu hình công ty: tên, logo, mã số thuế, địa chỉ, ngày công chuẩn _(đã có trang Cài đặt: công ty, giao diện, quy tắc nhân sự, email, bảo mật; còn ngày công chuẩn làm cùng Chấm công)_
- [ ] [BE+FE] Danh mục ngày lễ theo năm
- [x] [BE+FE] Danh mục dùng chung: dân tộc, tôn giáo, trình độ, ngân hàng, tỉnh/thành
- [x] [BE+FE] Trang Cài đặt cho admin: tên, logo, favicon, màu chủ đạo, mã NV, thử việc, giờ nhắc, SMTP + gửi thử, chính sách mật khẩu, thời gian đăng nhập
- [x] [BE+FE] Trường tuỳ chỉnh cho hồ sơ nhân viên (chữ, số, ngày, chọn một/nhiều, có/không; bắt buộc, cột danh sách, nhạy cảm; có trong Excel)
- [ ] [BE+FE] Đăng nhập Google/Microsoft (SSO)
- [ ] [BE+FE] Xác thực 2 lớp (2FA, ứng dụng Authenticator)
- [x] [BE] Khoá tài khoản tạm thời khi đăng nhập sai nhiều lần

## 2. Cơ cấu tổ chức

- [x] [BE+FE] Phòng ban dạng cây, trưởng phòng
- [x] [BE+FE] Chức vụ, cấp bậc
- [x] [FE] Chọn trưởng phòng trong form phòng ban
- [ ] [FE] ⭐ Sơ đồ tổ chức trực quan (org chart): kéo thả, bấm vào để xem nhân viên
- [ ] [BE+FE] Chi nhánh / văn phòng / công ty con
- [ ] [BE+FE] Chức danh và ngạch bậc lương (gắn với khung lương ở giai đoạn 9)
- [ ] [BE+FE] Định biên nhân sự theo phòng ban (kế hoạch so với thực tế)
- [x] [BE] Chặn xoá phòng ban còn nhân viên hoặc còn phòng ban con

## 3. Hồ sơ nhân viên đầy đủ

- [x] [BE+FE] Thông tin cơ bản, mã NV tự sinh, phòng ban, chức vụ, trạng thái
- [ ] [FE] ⭐ Trang chi tiết nhân viên chia tab: Tổng quan / Cá nhân / Công việc / Hợp đồng / Lương / Tài liệu / Lịch sử _(đã có Tổng quan, Cá nhân, Năng lực, Công tác, Hợp đồng, Thuế · Ngân hàng, Người phụ thuộc, Tài liệu, Lịch sử; Lương làm cùng module tương ứng)_
- [x] [BE+FE] Ảnh đại diện
- [x] [BE+FE] Thông tin cá nhân mở rộng: CCCD (ngày cấp, nơi cấp), quê quán, địa chỉ thường trú và tạm trú, dân tộc, tôn giáo, hôn nhân
- [x] [BE+FE] Thông tin thuế và bảo hiểm: MST cá nhân, số sổ BHXH, nơi đăng ký khám chữa bệnh
- [x] [BE+FE] Tài khoản ngân hàng nhận lương
- [x] [BE+FE] Người phụ thuộc (giảm trừ gia cảnh): họ tên, quan hệ, MST, thời gian áp dụng
- [x] [BE+FE] Liên hệ khẩn cấp
- [x] [BE+FE] Học vấn, bằng cấp, chứng chỉ (có ngày hết hạn và nhắc gia hạn)
- [x] [BE+FE] Kinh nghiệm làm việc trước đây
- [x] [BE+FE] Kỹ năng, ngoại ngữ
- [x] [BE+FE] Tài liệu đính kèm (CV, bản scan CCCD, bằng cấp) có phân loại
- [x] [BE+FE] Lịch sử công tác: điều chuyển, bổ nhiệm, thăng chức, có hiệu lực theo ngày
- [x] [BE+FE] Khen thưởng và kỷ luật
- [x] [BE+FE] ⭐ Nhập nhân viên hàng loạt từ Excel
- [x] [BE+FE] ⭐ Xuất danh sách nhân viên ra Excel theo bộ lọc
- [ ] [FE] Xem danh sách dạng thẻ (card) hoặc dạng bảng
- [ ] [BE] Tính tự động: tuổi, thâm niên, ngày hết thử việc _(tuổi và thâm niên đã hiển thị; số tháng thử việc đã có trong Cài đặt, ngày hết thử việc mới dùng trong email nhắc, chưa hiện trên hồ sơ)_
- [x] [BE+FE] Lịch sinh nhật và kỷ niệm ngày vào làm _(thẻ 30 ngày tới trên bảng điều khiển)_

## 4. Hợp đồng lao động

- [x] [BE+FE] Loại hợp đồng: thử việc, xác định thời hạn, không xác định thời hạn, cộng tác viên, thời vụ
- [x] [BE+FE] Tạo hợp đồng: số HĐ tự sinh, ngày hiệu lực và hết hạn, lương, phụ cấp
- [x] [BE+FE] Mẫu hợp đồng có biến (họ tên, lương…), sinh PDF để in _(trang in khổ A4, In / Lưu PDF từ trình duyệt)_
- [x] [BE+FE] Phụ lục hợp đồng (thay đổi lương, chức danh)
- [x] [BE+FE] Gia hạn và tái ký từ hợp đồng cũ
- [x] [BE+FE] ⭐ Danh sách hợp đồng sắp hết hạn (30/15/7 ngày) + nhắc tự động
- [x] [BE+FE] Chấm dứt hợp đồng (lý do, ngày)
- [x] [BE+FE] Tải lên bản scan đã ký
- [ ] [BE+FE] Ký số hợp đồng điện tử (tích hợp nhà cung cấp chữ ký số)

## 5. Thông báo & luồng phê duyệt

Đây là phần lõi dùng chung cho mọi loại đơn từ, nên làm trước chấm công và nghỉ phép.

- [ ] [BE] Engine phê duyệt dùng chung: đơn → các bước duyệt → kết quả
- [ ] [BE+FE] Cấu hình luồng duyệt theo loại đơn: 1–n cấp (quản lý trực tiếp, trưởng phòng, HR, người cụ thể)
- [ ] [BE] Điều kiện rẽ nhánh (ví dụ nghỉ trên 3 ngày thì cần thêm giám đốc duyệt)
- [ ] [BE+FE] Duyệt, từ chối (bắt buộc ghi lý do), trả lại để sửa, huỷ đơn
- [ ] [BE+FE] Uỷ quyền duyệt khi người duyệt vắng mặt
- [ ] [FE] ⭐ Trang "Chờ tôi duyệt": duyệt nhanh, duyệt hàng loạt
- [ ] [FE] Lịch sử duyệt của từng đơn dạng timeline
- [ ] [BE+FE] ⭐ Thông báo trong ứng dụng (chuông, số chưa đọc, đánh dấu đã đọc)
- [ ] [BE] Thông báo thời gian thực (WebSocket)
- [ ] [BE] Thông báo qua email theo mẫu
- [ ] [BE] Thông báo qua Zalo OA / Telegram
- [ ] [FE] Người dùng tự chọn loại thông báo muốn nhận
- [ ] [BE+FE] Bảng tin nội bộ: thông báo công ty, ghim tin, xác nhận đã đọc

## 6. Ca làm việc & chấm công

- [ ] [BE+FE] Danh mục ca: giờ vào/ra, nghỉ trưa, ca qua đêm, số công
- [ ] [BE+FE] Phân ca theo phòng ban hoặc nhân viên, ca cố định hoặc xoay ca
- [ ] [FE] ⭐ Lịch phân ca dạng lưới (kéo thả, sao chép tuần)
- [ ] [BE+FE] ⭐ Check-in/out trên web với 1 nút bấm
- [ ] [BE] Giới hạn chấm công theo IP/wifi công ty hoặc GPS (bán kính quanh văn phòng)
- [ ] [BE+FE] Chụp ảnh khi chấm công (chống chấm hộ)
- [ ] [BE] Nhập dữ liệu từ máy chấm công vân tay/khuôn mặt (file hoặc API)
- [ ] [BE] Tính tự động: đi muộn, về sớm, thiếu giờ, quên chấm
- [ ] [BE+FE] Quy định đi muộn: số phút cho phép, số lần mỗi tháng, mức trừ
- [ ] [FE] ⭐ Bảng công tháng: lưới nhân viên × ngày, màu theo trạng thái
- [ ] [BE+FE] HR sửa công thủ công (có lưu lý do)
- [ ] [BE+FE] Chốt công/khoá công theo tháng (sau khi khoá không ai sửa được)
- [ ] [BE+FE] Xuất bảng công ra Excel

## 7. Nghỉ phép

- [ ] [BE+FE] Danh mục loại nghỉ: phép năm, ốm, thai sản, cưới, tang, việc riêng, không lương, nghỉ bù (có lương hoặc không)
- [ ] [BE] Quỹ phép năm: 12 ngày + thâm niên (cứ 5 năm cộng thêm 1 ngày theo Bộ luật Lao động), tính theo tháng làm việc
- [ ] [BE] Chuyển phép tồn sang năm sau, hạn sử dụng phép tồn
- [ ] [FE] ⭐ Tạo đơn nghỉ: chọn ngày trên lịch, nghỉ nửa ngày, tự tính số ngày (trừ cuối tuần và ngày lễ)
- [ ] [FE] ⭐ Xem phép còn lại ngay trong form
- [ ] [BE] Kiểm tra trùng đơn, kiểm tra không đủ phép
- [ ] [FE] Lịch nghỉ của team (xem ai vắng ngày nào)
- [ ] [BE] Đơn đã duyệt tự cập nhật vào bảng công
- [ ] [BE+FE] HR điều chỉnh quỹ phép thủ công
- [ ] [BE+FE] Báo cáo sử dụng phép

## 8. Đơn từ khác

- [ ] [BE+FE] Đăng ký làm thêm giờ (OT): hệ số ngày thường 150%, ngày nghỉ 200%, ngày lễ 300%, OT đêm
- [ ] [BE] Giới hạn số giờ OT theo tháng và năm theo luật
- [ ] [BE+FE] Đơn giải trình quên chấm công hoặc đi muộn
- [ ] [BE+FE] Đơn công tác (ngày đi, nơi đến, chi phí dự kiến)
- [ ] [BE+FE] Đơn làm việc từ xa (WFH)
- [ ] [BE+FE] Đơn đổi ca
- [ ] [BE+FE] Đề nghị tạm ứng lương
- [ ] [BE+FE] Mẫu đơn tuỳ biến (HR tự tạo loại đơn mới bằng trình tạo form)

## 9. Tiền lương, bảo hiểm, thuế

- [ ] [BE+FE] Khung lương, bậc lương
- [ ] [BE+FE] Thành phần lương: lương cơ bản, phụ cấp (chịu thuế hoặc không), thưởng, khấu trừ
- [ ] [BE+FE] Công thức lương tuỳ biến (HR tự viết công thức từ các biến)
- [ ] [BE] Lương theo ngày công thực tế, công chuẩn
- [ ] [BE] BHXH, BHYT, BHTN: tỷ lệ công ty và người lao động, mức trần, lương đóng bảo hiểm
- [ ] [BE] Kinh phí công đoàn, đoàn phí
- [ ] [BE] Thuế TNCN: biểu luỹ tiến 7 bậc, giảm trừ bản thân và người phụ thuộc, khoản miễn thuế
- [ ] [BE] Thuế với hợp đồng dưới 3 tháng (khấu trừ 10%), cá nhân không cư trú
- [ ] [BE] Lấy dữ liệu từ bảng công, OT, nghỉ phép, tạm ứng
- [ ] [FE] ⭐ Bảng lương tháng: xem trước, sửa tay từng ô, tính lại
- [ ] [BE+FE] Quy trình: nháp → kiểm tra → duyệt → chốt → đã chi trả
- [ ] [BE+FE] ⭐ Phiếu lương PDF, gửi email hàng loạt, nhân viên xem trên cổng
- [ ] [BE] Xuất file chuyển khoản theo mẫu ngân hàng
- [ ] [BE] Báo cáo tăng/giảm lao động BHXH (mẫu D02-LT)
- [ ] [BE] Báo cáo thuế TNCN theo tháng/quý, quyết toán năm
- [ ] [BE+FE] Thưởng tháng 13, thưởng KPI, thưởng dự án
- [ ] [BE+FE] Lịch sử thay đổi lương của từng nhân viên

## 10. Cổng nhân viên (Self-service)

- [ ] [FE] ⭐ Trang chủ nhân viên: chấm công nhanh, phép còn lại, đơn đang chờ, thông báo, sinh nhật
- [ ] [FE] Xem và đề nghị cập nhật thông tin cá nhân (HR duyệt)
- [ ] [FE] Xem bảng công của tôi, phiếu lương của tôi, hợp đồng của tôi
- [ ] [FE] Tạo và theo dõi đơn của tôi
- [ ] [FE] Danh bạ công ty (tìm đồng nghiệp, xem phòng ban, liên hệ)
- [ ] [FE] Quản lý xem team của mình: công, phép, đơn chờ duyệt
- [ ] [FE] Ứng dụng web cài được trên điện thoại (PWA)

## 11. Tuyển dụng

- [ ] [BE+FE] Yêu cầu tuyển dụng từ phòng ban (vị trí, số lượng, lý do, ngân sách) qua luồng duyệt
- [ ] [BE+FE] Tin tuyển dụng: mô tả, yêu cầu, quyền lợi, hạn nộp
- [ ] [FE] Trang tuyển dụng công khai của công ty + form ứng tuyển
- [ ] [BE+FE] Hồ sơ ứng viên: CV, nguồn (TopCV, LinkedIn, giới thiệu…), thẻ phân loại
- [ ] [FE] ⭐ Pipeline dạng Kanban kéo thả: Mới → Sàng lọc → Phỏng vấn → Offer → Nhận việc / Loại
- [ ] [BE+FE] Lịch phỏng vấn, mời người phỏng vấn, gửi email mời ứng viên
- [ ] [BE+FE] Phiếu đánh giá phỏng vấn theo tiêu chí
- [ ] [BE+FE] Gửi thư mời nhận việc (offer letter) theo mẫu
- [ ] [BE] ⭐ Chuyển ứng viên thành nhân viên với 1 nút (không nhập lại dữ liệu)
- [ ] [BE+FE] Kho ứng viên tiềm năng, chặn trùng ứng viên
- [ ] [BE+FE] Báo cáo tuyển dụng: thời gian tuyển, tỷ lệ chuyển đổi, hiệu quả từng nguồn

## 12. Hội nhập & nghỉ việc

- [ ] [BE+FE] Mẫu checklist onboarding theo vị trí (tài khoản, thiết bị, đào tạo, giấy tờ)
- [ ] [BE+FE] Giao việc onboarding cho các bộ phận (IT, HR, quản lý), theo dõi tiến độ
- [ ] [BE+FE] Theo dõi thử việc: nhắc đánh giá trước khi hết thử việc
- [ ] [BE+FE] Đơn xin nghỉ việc qua luồng duyệt
- [ ] [BE+FE] Checklist offboarding: bàn giao công việc, thu hồi tài sản, khoá tài khoản
- [ ] [BE+FE] Phỏng vấn nghỉ việc (khảo sát lý do)
- [ ] [BE] Tính lương cuối, phép chưa dùng, trợ cấp thôi việc
- [ ] [BE] Tự động chuyển trạng thái nhân viên và khoá tài khoản vào ngày nghỉ

## 13. Đánh giá hiệu suất

- [ ] [BE+FE] Kỳ đánh giá: tháng/quý/năm, thời gian mở và đóng
- [ ] [BE+FE] Bộ tiêu chí và mẫu đánh giá theo vị trí
- [ ] [BE+FE] KPI cá nhân và phòng ban: chỉ tiêu, trọng số, kết quả
- [ ] [BE+FE] OKR: mục tiêu → kết quả then chốt, cập nhật tiến độ
- [ ] [BE+FE] Quy trình tự đánh giá → quản lý đánh giá → hiệu chỉnh → chốt
- [ ] [BE+FE] Đánh giá 360° (đồng nghiệp, cấp dưới)
- [ ] [BE+FE] Xếp loại A/B/C/D, phân bố chuẩn
- [ ] [BE] Liên kết kết quả với thưởng và tăng lương
- [ ] [BE+FE] Ghi nhận và khen ngợi đồng nghiệp (kudos)

## 14. Đào tạo

- [ ] [BE+FE] Danh mục khoá học (nội bộ hoặc bên ngoài, online hoặc offline)
- [ ] [BE+FE] Kế hoạch đào tạo năm, ngân sách
- [ ] [BE+FE] Lớp học: lịch, giảng viên, học viên, điểm danh
- [ ] [BE+FE] Đăng ký học qua luồng duyệt
- [ ] [BE+FE] Bài kiểm tra, kết quả, chứng chỉ
- [ ] [BE+FE] Cam kết đào tạo (bồi hoàn chi phí nếu nghỉ việc sớm)
- [ ] [BE+FE] Lộ trình học theo vị trí

## 15. Tài sản & thiết bị

- [ ] [BE+FE] Danh mục tài sản: loại, mã, serial, giá trị, ngày mua, bảo hành
- [ ] [BE+FE] Cấp phát và thu hồi (biên bản bàn giao PDF)
- [ ] [BE+FE] Lịch sử sử dụng từng tài sản
- [ ] [BE+FE] Đề nghị cấp tài sản qua luồng duyệt
- [ ] [BE+FE] Báo hỏng, sửa chữa, thanh lý
- [ ] [FE] In mã QR dán lên tài sản

## 16. Báo cáo & thống kê

- [x] [BE+FE] Dashboard cơ bản: tổng nhân sự, theo trạng thái, theo phòng ban
- [ ] [FE] ⭐ Dashboard theo vai trò (Admin/HR, Quản lý, Nhân viên) _(Admin/HR/Quản lý đã có; Nhân viên chờ chấm công, phép)_
- [ ] [FE] Biểu đồ: biến động nhân sự theo tháng, tỷ lệ nghỉ việc, tuyển mới
- [ ] [BE+FE] Cơ cấu nhân sự: độ tuổi, giới tính, thâm niên, trình độ
- [ ] [BE+FE] Báo cáo công, phép, OT, đi muộn
- [ ] [BE+FE] Báo cáo chi phí lương, bảo hiểm theo phòng ban
- [ ] [BE+FE] Bộ tạo báo cáo tuỳ biến (chọn cột, lọc, nhóm)
- [ ] [BE] Gửi báo cáo định kỳ qua email
- [ ] [BE+FE] Xuất mọi báo cáo ra Excel và PDF

## 17. Bảo mật, vận hành, triển khai

- [ ] [BE] Giới hạn số request (rate limit), helmet, CORS chặt
- [ ] [BE] Mã hoá dữ liệu nhạy cảm (CCCD, tài khoản ngân hàng, lương)
- [ ] [BE+FE] Tuân thủ Nghị định 13/2023 về bảo vệ dữ liệu cá nhân: đồng ý xử lý dữ liệu, quyền xem/xoá dữ liệu
- [ ] [BE] Chuyển sang migration (tắt `DB_SYNC`), migration ban đầu
- [ ] [BE] Ghi log có cấu trúc (pino), theo dõi lỗi (Sentry)
- [ ] [BE] Sao lưu database tự động, hướng dẫn khôi phục
- [ ] [BE+FE] Test: unit test cho service quan trọng (lương, phép, công), e2e cho luồng chính
- [ ] [BE+FE] Dockerfile cho backend và frontend, docker-compose cho production
- [ ] [BE+FE] CI/CD (GitHub Actions): lint, test, build, deploy
- [ ] [BE+FE] Môi trường staging và production, quản lý biến môi trường
- [ ] [FE] Tối ưu hiệu năng: lazy load, ảnh tối ưu
- [ ] [BE] Index database cho các truy vấn lớn (bảng công, lương)

## 18. Mở rộng

- [ ] [FE] Đa ngôn ngữ Việt/Anh
- [ ] [BE+FE] Hỗ trợ nhiều công ty trên cùng hệ thống (multi-tenant)
- [ ] Ứng dụng di động (React Native/Expo): chấm công GPS, đơn từ, phiếu lương, thông báo đẩy
- [ ] [BE] Public API + webhook để tích hợp phần mềm kế toán (MISA, Fast), ERP
- [ ] [BE] Tích hợp Google Calendar / Outlook cho lịch nghỉ và lịch phỏng vấn
- [ ] [BE] Tích hợp Slack / Microsoft Teams / Zalo
- [ ] [BE+FE] Trợ lý AI: hỏi đáp chính sách nhân sự, lọc CV, tóm tắt đánh giá
- [ ] [BE+FE] Khảo sát nội bộ, đo mức độ gắn kết nhân viên (eNPS)
