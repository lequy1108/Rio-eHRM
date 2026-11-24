# CLAUDE.md – Ghi chú dự án eHRM

Đọc file này trước khi làm việc với dự án. Cập nhật mục "Trạng thái" và "Quyết định" mỗi khi thêm module hoặc thay đổi kiến trúc.

## Tổng quan

eHRM là hệ thống quản lý nhân sự điện tử cho doanh nghiệp Việt Nam. Giao diện và thông báo lỗi viết bằng tiếng Việt.

Monorepo, chạy trên Windows (đường dẫn gốc: `C:\Users\ADMIN\Desktop\Project\eHRM`):

| Thư mục     | Stack                                                    | Cổng |
| ----------- | -------------------------------------------------------- | ---- |
| `backend/`  | NestJS 12, TypeORM 1, PostgreSQL 16, JWT (passport-jwt), TypeScript 6 | 4000 |
| `frontend/` | Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript 5 | 3000 |
| Docker      | `docker-compose.yml`: postgres (5432), pgadmin (5050)    |      |

## Lệnh (chạy ở thư mục gốc)

```bash
npm run install:all   # tạo .env từ .env.example + npm install cả 3 package
npm run db:up         # docker compose up -d
npm run dev           # chạy API + web cùng lúc (concurrently)
npm run seed          # dữ liệu mẫu (cần API đã chạy 1 lần để tạo bảng)
npm --prefix backend run build        # kiểm tra build backend
npm --prefix frontend run typecheck   # kiểm tra type frontend
```

- Swagger: http://localhost:4000/api/docs
- Tài khoản web: `admin@ehrm.local` / `Admin@123` (thêm `binh.tran@ehrm.local` HR, `cuong.le@ehrm.local` MANAGER, cùng mật khẩu)
- pgAdmin: `admin@ehrm.com` / `admin123`, host DB `postgres`, user `ehrm` / `ehrm123`

## Quy trình Git (bắt buộc)

Repo: `github.com/lequy1108/Rio-eHRM`, nhánh chính `main`. Chi tiết cho người: `CONTRIBUTING.md`.

- **Không bao giờ commit thẳng lên `main`.** Mỗi việc một nhánh tạo từ `main` mới nhất: `feat/…`, `fix/…`, `refactor/…`, `chore/…`, `docs/…` (chữ thường không dấu, gạch ngang).
- Bắt đầu việc: kiểm tra `git status` sạch, `git switch main`, tạo nhánh. Nếu đang có thay đổi chưa commit của người dùng thì hỏi trước, không tự stash/xoá.
- Commit theo Conventional Commits, mô tả tiếng Việt: `feat(employees): thêm tab người phụ thuộc`. Commit nhỏ theo từng ý; chạy `lint`/`typecheck` trước khi commit.
- Claude commit trong máy ảo (device_bash) với danh tính chủ repo: `git -c user.name="Rioedev" -c user.email="lequy11082003@gmail.com" commit …`. Claude không có quyền đẩy lên GitHub: khi xong, đưa cho người dùng lệnh `git push -u origin <nhánh>` và nội dung PR theo `.github/pull_request_template.md`.
- PR merge bằng **Squash and merge** sau khi CI (`.github/workflows/ci.yml`) xanh. Sau merge: `git switch main && git pull`, xoá nhánh cũ.
- Xong một giai đoạn trong `ROADMAP.md` thì gắn tag SemVer (`v0.3.0`…) và tạo Release.
- Không commit `.env*` (trừ `.env.example`), `uploads/`, `dist/`, `.next/`, `node_modules/`.

## Backend – quy ước

- Mỗi nghiệp vụ là một module trong `src/modules/<tên>/` gồm: `entities/`, `dto/`, `*.service.ts`, `*.controller.ts`, `*.module.ts`. Thêm module mới vào `app.module.ts`.
- Entity kế thừa `BaseEntity` (`src/common/entities/base.entity.ts`): `id` uuid, `createdAt`, `updatedAt`, `deletedAt` (xoá mềm, dùng `repo.softDelete`).
- Quan hệ giữa entity dùng kiểu `Relation<T>` của TypeORM để tránh lỗi import vòng. Luôn khai báo kèm cột khoá ngoại tường minh (vd `departmentId` + `department`).
- Enum dùng chung ở `src/common/enums.ts` (Role, Gender, EmployeeStatus, MaritalStatus, DependentRelation, CatalogType, AuditAction).
- DTO dùng class-validator; `ValidationPipe` bật `whitelist` + `forbidNonWhitelisted` + `transform`. DTO cập nhật dùng `PartialType` từ `@nestjs/swagger`.
- Danh sách có phân trang: query DTO kế thừa `PaginationQueryDto` (page, limit ≤ 100, search, sortBy, order), trả về `paginate(items, total, query)` → `{ items, meta: { page, limit, total, totalPages } }`.
- Response tự bọc bởi `TransformInterceptor` → `{ success: true, data }`. Lỗi qua `AllExceptionsFilter` → `{ success: false, statusCode, message }`; lỗi trùng unique của Postgres (23505) → 409.
- Xác thực: `JwtAuthGuard` toàn cục, mọi route cần đăng nhập trừ khi gắn `@Public()`. Token chỉ mang `sub`; mỗi request `JwtStrategy` đọc lại user + vai trò nên đổi quyền có hiệu lực ngay. Lấy user hiện tại: `@CurrentUser()` (`JwtUser`: sub, email, roleId, roleCode, permissions, employeeId).
- **Phân quyền theo chức năng**: danh sách quyền ở `src/common/permissions.ts` (`PERMISSION_GROUPS`, `SYSTEM_ROLES`). Gắn `@Permissions('employees.update')` lên route (cần ĐỦ các quyền liệt kê); kiểm tra trong code bằng `hasPermission(user.permissions, '...')`. Vai trò lưu ở bảng `roles` (`permissions` jsonb, `'*'` = toàn quyền); `users.roleId` trỏ tới vai trò. Vai trò hệ thống ADMIN/HR/MANAGER/EMPLOYEE tự tạo khi khởi động (`ensureSystemRoles`), ADMIN không sửa/xoá được; luôn giữ ít nhất 1 Quản trị đang hoạt động. Cột enum `users.role` cũ chỉ còn để chuyển dữ liệu (`legacyRole`). Thêm chức năng mới: thêm quyền vào `PERMISSION_GROUPS` (trang Vai trò tự hiện), gắn decorator, ẩn nút ở frontend bằng `can('...')`.
- **Cài đặt hệ thống** (`modules/settings`, `@Global`): nhóm company/branding/employee/mail/security, mặc định + kiểu + validate ở `settings.schema.ts`, lưu bảng `settings` (jsonb), cache trong bộ nhớ. Đọc: `settings.get('employee').probationMonths`. Đổi nhóm phát sự kiện `settings.events.on('changed:mail', …)`. `GET /settings/public` (không cần đăng nhập) cho logo/tên/màu/chính sách mật khẩu. Thêm cài đặt mới: thêm vào `SETTING_DEFAULTS` + class DTO của nhóm + ô nhập ở trang `/settings/<nhóm>`; KHÔNG hard-code giá trị nghiệp vụ trong service.
- **Bản ghi con của nhân viên** (`modules/employees/profile/`): kế thừa `EmployeeChild` (entity) + `EmployeeChildService` (CRUD, audit với parentType 'Employee') và sinh controller bằng `employeeChildController({ path, service, createDto, updateDto, view, edit })` → `/employees/:employeeId/<path>`. Đang có: qualifications, experiences, skills, rewards; documents và work-history viết riêng. DTO cập nhật dùng `emptyToNull` để ô trống xoá giá trị. Chú ý: field khai báo trong class DTO luôn có mặt (undefined) sau khi transform, nên kiểm tra `dto.x !== undefined`, KHÔNG dùng `'x' in dto`.
- **File riêng tư**: `uploadOptions({ private: true })` lưu vào `PRIVATE_ROOT` (`storage/`, không phục vụ tĩnh), tải qua endpoint có kiểm quyền trả `StreamableFile` (TransformInterceptor bỏ qua StreamableFile). `uploads/` chỉ dành cho file công khai (ảnh đại diện, logo).
- **Quá trình công tác**: quyết định có `effectiveDate`; ngày ≤ hôm nay (giờ VN) thì áp dụng ngay, không thì PENDING và cron 00:05 (`applyDue`, chạy cả khi khởi động) cập nhật phòng ban/chức vụ/quản lý qua `EmployeesService.update`. Đã áp dụng thì chỉ sửa số quyết định, ghi chú.
- **Hợp đồng** (`modules/contracts`): loại HĐ (`contract_types`, có `hasTerm`, `defaultMonths`, `isProbation`), hợp đồng, phụ lục (thay đổi có ngày hiệu lực; `current` = hợp đồng + phụ lục đã hiệu lực), mẫu HTML có biến `{{ten_bien}}` (danh sách ở `placeholders.ts`, thêm biến = thêm 1 dòng). Trạng thái hiển thị (`state`: upcoming/active/expiring/expired/terminated) tính theo ngày, không lưu. Số HĐ sinh theo `settings.contract.numberFormat`. Không cho 2 hợp đồng ACTIVE trùng thời gian. Ký HĐ không phải thử việc đã hiệu lực → nhân viên Thử việc tự chuyển Chính thức. In: trang `/print/contracts/[id]` (ngoài layout chính), CSS văn bản ở `src/lib/contract-sheet.ts`. Số tiền bằng chữ: `moneyInWords` (backend `common/utils/vn-money.ts`, frontend `lib/vn-money.ts`, giữ hai bản giống nhau).
- Quyền mới: thêm vào `PERMISSION_GROUPS` và mặc định của vai trò hệ thống trong `SYSTEM_ROLES`; lần khởi động sau vai trò hệ thống tự được cấp (nhờ `roles.knownPermissions`), quyền admin đã chủ động bỏ thì không cấp lại.
- Mật khẩu: kiểm tra bằng `settings.assertPassword(pw)` (DTO chỉ `MinLength(1)`). Đăng nhập sai quá `maxLoginAttempts` thì tạm khoá (`users.lockedUntil`), `PATCH /users/:id/unlock` để mở.
- **Trường tuỳ chỉnh** (`modules/custom-fields`, `@Global`): định nghĩa ở bảng `custom_fields`, giá trị ở `employees.customFields` (jsonb, khoá = `key`). Ghi qua `customFields.merge(current, patch, { checkRequired, canSensitive })` (ép kiểu, kiểm tra lựa chọn, bắt buộc). Lịch sử lưu theo tên trường (`customFields.display`). Trường `sensitive` bị ẩn với người không có quyền `employees.sensitive`. Xuất/nhập Excel tự thêm cột (`customColumns`).
- Mật khẩu hash bằng `bcryptjs` (không dùng `bcrypt` native để tránh lỗi build trên Windows). Cột `password` có `select: false`.
- Sắp xếp: luôn qua `safeSort(query, [cột cho phép], mặc định)` để client không gửi được tên cột lạ.
- Thao tác hàng loạt nhận body `IdsDto` (`{ ids: uuid[] }`, tối đa 500).
- **TypeORM 1.x đã bỏ `loadRelationCountAndMap`**: muốn đếm quan hệ thì chạy một truy vấn `GROUP BY` riêng rồi gắn vào kết quả (xem `departments.service.ts`, hàm `withCounts`).
- Khi `update` một entity đã load kèm quan hệ, `delete` các object quan hệ trước khi `save` để TypeORM dùng cột khoá ngoại mới.
- Tiện ích dùng chung ở `src/common/shared/` (module `SharedModule` là `@Global`, không cần import):
  - `upload.ts`: `uploadOptions({ folder, types, maxSizeMB })` cho `FileInterceptor`. Có `folder` thì lưu đĩa vào `uploads/<folder>` (phục vụ tĩnh tại `/uploads/...`), không có thì giữ trong RAM (dùng cho import). `publicPath(folder, filename)` tạo đường dẫn lưu vào DB.
  - `excel.service.ts`: `export(sheet, columns, rows)`, `template(sheet, columns, sample, guide)`, `parse(buffer, columns)` (khớp theo tiêu đề cột). Kèm `toIsoDate` / `toViDate`. **Không dùng ghi chú (comment) trong ô Excel**: exceljs đọc lỗi file có comment sau khi Excel lưu lại.
  - `mail.service.ts`: `mail.send({ to, subject, html })`. Chưa cấu hình `MAIL_HOST` thì chỉ ghi log.
- Trả file (Excel/PDF): `res.set` `Content-Type` + `Content-Disposition: attachment; filename*=UTF-8''<tên đã encode>`. CORS đã `exposedHeaders: ['Content-Disposition']`.
- Nhập Excel theo 2 bước: `POST /<resource>/import?dryRun=true` (kiểm tra, trả lỗi theo dòng) rồi `dryRun=false` (lưu trong 1 transaction, lỗi 1 dòng thì không lưu dòng nào). Mẫu: `employees.service.ts` → `importExcel`.
- Tác vụ định kỳ: `@Cron('0 8 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })` trong file `*.scheduler.ts` của module (xem `employees.scheduler.ts`).
- **Nhật ký thay đổi (audit)**: `AuditService` (`src/common/audit/`, `@Global`) → `audit.log({ entityType, entityId, action, before, after, parentType?, parentId?, label? })`. Truyền ảnh chụp ở dạng hiển thị (tên thay cho id, nhãn tiếng Việt cho enum, xem `employeeSnapshot`); service tự so sánh, bỏ qua UPDATE không đổi gì, tự lấy người thao tác và IP từ `RequestContextInterceptor` (AsyncLocalStorage). Bản ghi con (vd người phụ thuộc) đặt `parentType/parentId` để hiện trong lịch sử của bản ghi cha: `audit.history('Employee', id)`. Ghi log lỗi không làm hỏng thao tác chính.
- **Danh mục dùng chung**: bảng `catalog_items` (type + code duy nhất), tự nạp dữ liệu mẫu khi type còn trống (`catalog-seed.ts`: 54 dân tộc, 34 tỉnh/thành từ 1/7/2025, 30 ngân hàng…). Entity khác tham chiếu bằng `ManyToOne(CatalogItem, { onDelete: 'SET NULL' })`. Tắt `isActive` để ẩn khỏi ô chọn thay vì xoá.
- Thông tin nhạy cảm (thuế, BHXH, ngân hàng) bị ẩn với MANAGER ở `GET /employees/:id` và trong lịch sử (`SENSITIVE_FIELDS` trong controller).
- MST cá nhân từ 1/7/2025 là số CCCD 12 số (Thông tư 86/2024/TT-BTC); validator vẫn nhận MST cũ 10 hoặc 13 số.
- Thông báo lỗi trả về người dùng viết tiếng Việt.
- Schema: dev dùng `DB_SYNC=true` (tự đồng bộ). Production: `DB_SYNC=false` + `migration:generate` / `migration:run`.
- `tsconfig.json` đã chỉnh cho TS 6: có `rootDir: ./src`, `types: ["node"]`, không dùng `baseUrl`.

## Frontend – quy ước

Thư viện: TanStack Query (gọi API + cache), react-hook-form + zod 4 (form), Radix UI qua gói `radix-ui` (component), cmdk (tìm kiếm), sonner (toast), next-themes (sáng/tối), lucide-react (icon), @tanstack/react-table v8 (bảng).

- Trang cần đăng nhập nằm trong `src/app/(main)/`. Layout có sidebar thu gọn được, menu ngăn kéo trên điện thoại, ô tìm kiếm Ctrl+K, menu người dùng. Chưa đăng nhập thì chuyển về `/login?next=<url đang xem>`.
- Menu và quyền xem trang khai báo một chỗ trong `src/lib/navigation.ts` (`NAV`). Thêm module = thêm 1 dòng (href, label, icon, roles, keywords cho Ctrl+K). Vào trang không đủ quyền sẽ hiện `<Forbidden />`.
- Gọi API: `api<T>(path, { method, body, query })`, `upload<T>(path, file)`, `download(path, query)` trong `src/lib/api.ts`. Tự gắn token, bóc `data`, gặp 401 thì báo hết phiên và về trang đăng nhập.
- Dữ liệu đọc dùng `useQuery` với `queryKey` bắt đầu bằng tên resource: `['employees', 'list', q]`. Ghi dùng `useMutation`, xong thì `invalidateQueries({ queryKey: ['employees'] })`. Mutation lỗi tự hiện toast; muốn tự xử lý (gắn lỗi vào ô form) thì đặt `meta: { silent: true }`.
- Quyền ở frontend: `const { can } = useAuth(); can('employees.update')` (đủ các quyền, Quản trị luôn true). Menu dùng `anyOf` trong `NAV`. Không còn `hasRole`.
- Giao diện theo cài đặt: `useBranding()` (tên, logo, màu, chính sách mật khẩu) trong `src/lib/branding.tsx`; `BrandingEffect` áp màu chủ đạo, favicon, tên tab. Logo dùng `<LogoMark />`, tên dùng `<AppName />`, không viết cứng chữ eHRM.
- Bản ghi con trong hồ sơ: `<ChildSection>` (`employees/[id]/_components/child-section.tsx`) nhận cấu hình `fields` (text, textarea, date, money, select, catalog, level, department, position, employee) và `render` từng dòng; tự lo danh sách, hộp thoại thêm/sửa, xoá. Mở file cần đăng nhập: `openFile(path)`, tải về: `download(path)`.
- Trường tuỳ chỉnh: `useCustomFields()`, `formatCustomValue`, `groupBySection` (`src/lib/custom-fields.tsx`); ô nhập `CustomFieldInput`.
- Danh sách cho ô chọn: `useRoleOptions()`, `useDepartmentOptions()`, `usePositionOptions()`, `useEmployeeOptions(search)`, `useCatalogOptions(type)` trong `src/lib/queries.ts`. Nhãn trường cho lịch sử thay đổi: `FIELD_LABEL` trong `src/lib/types.ts` (thêm trường mới vào snapshot thì thêm nhãn ở đây).
- Kiểu dữ liệu, nhãn tiếng Việt (`STATUS_LABEL`, `ROLE_LABEL`, `GENDER_LABEL`) và `toOptions()` ở `src/lib/types.ts`; giữ đồng bộ với entity/enum backend. Định dạng ngày/thâm niên/tuổi ở `src/lib/format.ts`.
- Auth: `useAuth()` → `user`, `hasRole('HR', ...)` (ADMIN luôn true), `logout`, `refreshUser`.
- Xác nhận: `const confirm = useConfirm(); if (await confirm({ title, description, destructive: true })) ...`. Không dùng `window.confirm/alert`.
- Thông báo: `toast.success(...)` / `toast.error(...)` từ `sonner`.
- Component UI ở `src/components/ui/` (kiểu shadcn): `Button` (có `loading`), `Input`, `Textarea`, `Select` (value rỗng = chưa chọn, `clearable`), `Combobox` (có tìm kiếm, gõ không dấu), `Dialog` + `DialogBody` (thân cuộn được), `AlertDialog`, `DropdownMenu`, `Tabs`, `Badge`, `Avatar`, `Checkbox`, `Tooltip`, `Sheet`, `Skeleton`, `Card`, `Table`, `Popover`, `Command`.
- Component ứng dụng: `PageHeader` (tiêu đề + breadcrumb + nút), `FormField` (nhãn, `*`, lỗi dưới ô), `EmptyState`, `StatusBadge`, `EmployeePicker` (chọn nhân viên, tìm trên server), `PasswordInput`, `Forbidden`.
- **Trang danh sách**: dùng `DataTable` (`components/data-table`) + `useUrlState({ filterA: '', ... })` để trang/tìm kiếm/sắp xếp/bộ lọc nằm trên URL. Cột khai báo `meta: { title, sortKey, className, alwaysVisible }`. Có sẵn chọn nhiều dòng (`selectable` + `bulkActions`), ẩn/hiện cột (lưu localStorage), skeleton, trạng thái trống. Mẫu đầy đủ: `app/(main)/employees/page.tsx`.
- **Form**: react-hook-form + `zodResolver(schema)`; Select/Combobox bọc trong `<Controller>`. Nội dung giữa `DialogHeader` và `DialogFooter` luôn đặt trong `<DialogBody>` (khung `DialogContent` không cuộn, chỉ thân cuộn). Khi sửa, gửi `null` cho ô bị xoá trống. Mẫu: `employees/_components/employee-form-dialog.tsx`.
- Component riêng của một trang đặt trong thư mục `_components/` cạnh `page.tsx`.
- `useSearchParams` cần `<Suspense>`: layout `(main)` đã bọc sẵn.
- Style: Tailwind 4 + biến màu kiểu shadcn trong `globals.css` (`bg-primary`, `text-muted-foreground`, `border`, `bg-card`…). Có chế độ tối (`.dark`). Dùng `cn()` từ `lib/utils` để gộp class.
- `next.config.ts` đặt `turbopack.root` = thư mục frontend (thư mục cha cũng có package-lock.json). Gói CSS bên thứ ba import bằng đường dẫn tương đối tới `node_modules/.../*.css` trong `globals.css` (Turbopack trên Windows từng không tìm thấy `tw-animate-css` khi import theo tên gói).
- **Hướng thiết kế (unslop, 23/11/2026)** — giữ khi làm trang mới:
  - Tính cách: ngăn nắp, đáng tin, gần gũi. Thế giới: tủ hồ sơ phòng nhân sự (bìa hồ sơ, thẻ nhân viên, mã số).
  - Bề mặt, chữ, viền dùng xám trung tính. Màu nhấn `--primary` (#0049EA) chỉ cho nút chính, mục đang chọn, link và **một** thứ quan trọng trong mỗi biểu đồ; phần còn lại dùng bậc xám (`bg-foreground/12…/70`). Không gán màu theo giới tính, không bóng màu, không gradient đổi sắc.
  - Chi tiết riêng: mọi mã (NV0008, mã phòng ban, chức vụ) hiển thị bằng `<CodeTag>` (`components/code-tag.tsx`). Ngày tháng và số dạng mono `tabular-nums`, ngày luôn `dd/mm/yyyy` (`formatDate`).
  - Điểm nhấn: Bảng điều khiển có biểu đồ đường biến động nhân sự 12 tháng (`dashboard/_components/headcount-chart.tsx`, dữ liệu `headcountTrend` trong `/employees/stats`); trang chi tiết nhân viên có thẻ nhân viên (`employees/_components/employee-badge.tsx`).
  - Chữ: tiêu đề trang 28px đậm 500, tiêu đề thẻ đậm 500, chỉ logo dùng 600. Nhãn viết hoa chữ đầu câu, không viết hoa toàn bộ, không giãn chữ.
  - Câu chữ: tiêu đề nêu ngữ cảnh (vd "Nhân sự tháng 11/2026"), không lời chào, không dấu chấm than; nhãn, nút, mô tả một câu không có dấu chấm cuối. Thẻ số liệu: nhãn + con số + so sánh có mốc ("+1 so với tháng 10"), không icon trang trí.
- Logo: `LogoMark` trong `components/layout/sidebar.tsx` dùng `public/logo.png`; favicon là `src/app/favicon.ico`, `icon.png`, `apple-icon.png`; bản gốc 1024px ở `docs/brand/logo-1024.png`. Màu `--primary` = màu logo `#0049EA`.
- **Hiệu ứng (mức cân bằng, đã qua unslop)**: thư viện `motion` (`motion/react`), dùng chung ở `components/motion` (`spring`, `easeApple`, `PageTransition`). Mỗi trang chỉ có **một** hiệu ứng vào trang (`app/(main)/template.tsx`: hiện dần + nhích 8px). Không thêm stagger, số đếm, thanh chạy khi tải trang, không làm mờ (blur) khi chuyển cảnh, không hiệu ứng lặp vô hạn trang trí.
  - Class CSS trong `globals.css`: `pressable` (nút lún 0.97 khi nhấn), `lift` (thẻ bấm được: đổi viền/nền khi rê chuột, không nhấc lên), `glass` (nền đặc cho menu/popover), `overlay` (nền tối sau hộp thoại, không blur); animation `animate-sheet-in/out` (hộp thoại), `animate-pop-in/out` (menu, popover; kèm `origin-(--radix-…-transform-origin)`), `animate-fade-in/out`, `animate-shimmer` (skeleton). Một đường cong `ease-(--ease-apple)`.
  - Thanh chọn trượt dùng `motion.span layoutId` (sidebar, Tabs). Phần chữ phải đặt `relative z-10` để không bị viên trượt che.
  - Đổi sáng/tối luôn gọi `switchTheme(setTheme, value)` (`lib/theme.ts`) để có hiệu ứng mờ chuyển.
  - Trong CSS **chỉ viết `backdrop-filter` chuẩn**, không viết thêm `-webkit-backdrop-filter` (trình tối ưu sẽ gộp và Chrome mất hiệu ứng mờ).
  - Mọi hiệu ứng tự tắt khi người dùng bật "Giảm chuyển động" trong hệ điều hành (`MotionConfig reducedMotion="user"` + media query trong `globals.css`).
- Font Be Vietnam Pro qua `next/font/google` (cần mạng khi build). `<html>` và `<body>` có `suppressHydrationWarning` (next-themes và extension trình duyệt chèn thuộc tính).

## Trạng thái

Đã có (xong Giai đoạn 0, trừ PDF và hàng đợi BullMQ):
- Auth: đăng nhập, `/auth/me`, đổi mật khẩu; tự đăng xuất khi token hết hạn
- Users (chỉ ADMIN): CRUD, khoá/mở, đổi vai trò, gắn nhân viên, `PATCH /users/:id/password` đặt lại mật khẩu; không tự khoá/xoá/hạ quyền chính mình
- Employees: CRUD, tự sinh mã `NV0001`, lọc, sắp xếp, `/stats`, `/export` (Excel), `/import` + `/import/template`, `/bulk-delete`, `/:id/avatar`; nhắc HR nhân viên sắp hết thử việc lúc 8h hằng ngày (2 tháng thử việc, cố định trong code)
- Departments: CRUD, cây tổ chức `/tree`, đếm nhân viên, chặn xoá khi còn nhân viên hoặc phòng con, chặn chọn cấp trên tạo vòng lặp
- Positions: CRUD, đếm nhân viên
- Catalogs: `GET /catalogs?type=&activeOnly=`, `/catalogs/counts`, CRUD cho HR
- Hồ sơ mở rộng: cá nhân (CCCD, quê quán, dân tộc, tôn giáo, hôn nhân, địa chỉ), liên hệ khẩn cấp, thuế/BHXH, ngân hàng; người phụ thuộc `/employees/:id/dependents`; lịch sử `/employees/:id/history`
- Audit log cho nhân viên và người phụ thuộc
- Cài đặt `/settings` (công ty, giao diện, quy tắc nhân sự, trường tuỳ chỉnh, vai trò và quyền, bảo mật, email); `/roles` CRUD + `/roles/permissions`; `/custom-fields` CRUD + `/order`
- Hợp đồng: `/contracts` (+ `/stats`, `/next-number`, `/:id/render`, `/:id/terminate`, `/:id/signed-file`, `/:id/appendices`), `/contract-types`, `/contract-templates` (+ `/placeholders`); cài đặt nhóm `contract` sửa được với quyền `contracts.manage` qua `GET/PUT /settings/contract`
- Health: `/health`
- Giao diện: đăng nhập, Bảng điều khiển, Nhân viên (danh sách + chi tiết 5 tab), Phòng ban, Danh mục, Chức vụ, Tài khoản, Hồ sơ của tôi, 404/403/lỗi

Lộ trình chi tiết và checklist: xem **`ROADMAP.md`** (19 giai đoạn, 0–18, sắp theo thứ tự phụ thuộc).
- Trước khi làm, đọc giai đoạn liên quan trong `ROADMAP.md` để biết phần nào đã xong và phần nào cần có trước.
- Làm xong việc nào thì tích `- [x]` trong `ROADMAP.md` và cập nhật danh sách "Đã có" ở trên.
- Thứ tự chính: 0 Nền tảng UX → 1 Quản trị → 2 Tổ chức → 3 Hồ sơ → 4 Hợp đồng → 5 Phê duyệt & thông báo → 6 Chấm công → 7 Nghỉ phép → 8 Đơn từ → 9 Lương → 10 Cổng nhân viên → 11–15 Tuyển dụng, Onboarding, KPI, Đào tạo, Tài sản → 16 Báo cáo → 17 Bảo mật & triển khai → 18 Mở rộng.

## Quyết định & lưu ý

- Môi trường remote không được ghi file `.env*`; người dùng tạo bằng `npm run setup:env` (`scripts/setup-env.cjs`).
- pgAdmin không chấp nhận email đuôi `.local` nên dùng `admin@ehrm.com`.
- Chưa có refresh token; JWT hết hạn theo `JWT_EXPIRES_IN` (mặc định 1d).
