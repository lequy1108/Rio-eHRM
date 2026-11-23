# eHRM – Hệ thống quản lý nhân sự điện tử

Monorepo gồm:

| Thư mục     | Công nghệ                                   | Cổng |
| ----------- | ------------------------------------------- | ---- |
| `backend/`  | NestJS 12 · TypeORM 1 · PostgreSQL · JWT    | 4000 |
| `frontend/` | Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TanStack Query · Radix UI | 3000 |
| Docker      | PostgreSQL 16 + pgAdmin                     | 5432 / 5050 |

## Yêu cầu

- Node.js **20.19+** (khuyên dùng 22 LTS)
- Docker Desktop (để chạy PostgreSQL), hoặc PostgreSQL cài sẵn trên máy

## Chạy lần đầu

```bash
# 1. Tạo file .env + cài thư viện cho cả 3 package
npm run install:all

# 2. Bật PostgreSQL (Docker)
npm run db:up

# 3. Chạy backend + frontend cùng lúc
npm run dev
```

Lần chạy đầu, backend tự tạo bảng (vì `DB_SYNC=true` trong `backend/.env`). Sau khi backend đã lên, mở terminal khác và tạo dữ liệu mẫu:

```bash
npm run seed
```

Truy cập:

- Web: http://localhost:3000 — đăng nhập `admin@ehrm.local` / `Admin@123`
- Swagger API: http://localhost:4000/api/docs
- pgAdmin: http://localhost:5050 (`admin@ehrm.com` / `admin123`, host DB là `postgres`)

Tài khoản mẫu khác (cùng mật khẩu `Admin@123`): `binh.tran@ehrm.local` (HR), `cuong.le@ehrm.local` (Quản lý).

> Không dùng Docker? Tạo database `ehrm` trong PostgreSQL của bạn rồi sửa thông tin kết nối trong `backend/.env`.

## Cấu trúc backend

```
backend/src
├── main.ts                 # Bootstrap: prefix /api, CORS, ValidationPipe, Swagger
├── app.module.ts           # Guard/Interceptor/Filter toàn cục
├── config/                 # Đọc biến môi trường
├── database/
│   ├── data-source.ts      # Cấu hình cho TypeORM CLI (migration)
│   ├── migrations/
│   └── seeds/seed.ts       # Dữ liệu mẫu
├── common/
│   ├── decorators/         # @Public(), @Roles(), @CurrentUser()
│   ├── guards/             # JwtAuthGuard (mặc định bắt đăng nhập), RolesGuard
│   ├── filters/            # Chuẩn hoá lỗi { success:false, message }
│   ├── interceptors/       # Chuẩn hoá kết quả { success:true, data }
│   ├── dto/                # PaginationQueryDto, paginate(), safeSort(), IdsDto
│   ├── shared/             # Upload file, Excel, gửi email (dùng chung)
│   ├── entities/           # BaseEntity: id uuid, createdAt, updatedAt, deletedAt (soft delete)
│   └── enums.ts            # Role, Gender, EmployeeStatus
└── modules/
    ├── auth/               # POST /auth/login, GET /auth/me, POST /auth/change-password
    ├── users/              # Quản lý tài khoản (chỉ ADMIN)
    ├── employees/          # Hồ sơ nhân viên, xuất/nhập Excel, ảnh đại diện, nhắc hết thử việc
    ├── departments/        # Phòng ban (dạng cây), /departments/tree
    ├── positions/          # Chức vụ
    └── health/             # GET /health
```

### Phân quyền

Mọi API đều cần JWT, trừ route có `@Public()`. Giới hạn theo vai trò bằng `@Roles(Role.HR, ...)`. `ADMIN` luôn có toàn quyền.

| Vai trò   | Quyền hiện tại                                      |
| --------- | --------------------------------------------------- |
| ADMIN     | Toàn quyền, quản lý tài khoản                        |
| HR        | Thêm/sửa/xoá nhân viên, phòng ban, chức vụ           |
| MANAGER   | Xem nhân viên & thống kê                             |
| EMPLOYEE  | Xem phòng ban, chức vụ, thông tin cá nhân (`/auth/me`) |

### Thêm module mới

```bash
cd backend
npx nest g resource modules/attendance --no-spec
```

Sau đó cho entity kế thừa `BaseEntity`, thêm module vào `app.module.ts`, và thêm link vào `frontend/src/components/sidebar.tsx`.

### Migration (khi lên production)

Đặt `DB_SYNC=false` trong `.env`, rồi:

```bash
npm --prefix backend run migration:generate   # sinh migration từ thay đổi entity
npm --prefix backend run migration:run
```

## Cấu trúc frontend

```
frontend/src
├── app/
│   ├── login/              # Trang đăng nhập
│   └── (main)/             # Các trang cần đăng nhập (sidebar + header)
│       ├── dashboard/
│       ├── employees/
│       ├── departments/
│       └── positions/
├── components/
│   ├── ui/                 # Bộ component kiểu shadcn (Button, Dialog, Select, Combobox…)
│   ├── data-table/         # Bảng dữ liệu: sắp xếp, chọn nhiều, ẩn cột, phân trang
│   └── layout/             # Sidebar, menu người dùng, tìm kiếm Ctrl+K
├── hooks/                  # useUrlState, useDebounce, useLocalStorage
├── lib/                    # api, types, queries, navigation (menu), format
└── providers/              # Auth, hộp xác nhận, React Query, theme
```

Đổi địa chỉ API trong `frontend/.env.local` (`NEXT_PUBLIC_API_URL`).

Quy ước code chi tiết cho backend và frontend: xem `CLAUDE.md`. Lộ trình chức năng: xem `ROADMAP.md`.

## Gửi email

Mặc định email chỉ được ghi ra log của backend. Muốn gửi thật, điền SMTP vào `backend/.env`:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=ban@gmail.com
MAIL_PASS=<App Password của Gmail>
MAIL_FROM=eHRM <ban@gmail.com>
```

## Hướng phát triển tiếp

- [ ] Chấm công (check-in/out, ca làm việc)
- [ ] Nghỉ phép (đơn xin nghỉ, duyệt nhiều cấp, quỹ phép năm)
- [ ] Hợp đồng lao động
- [ ] Tính lương (BHXH/BHYT/BHTN, thuế TNCN)
- [ ] Tuyển dụng, đánh giá KPI, đào tạo
- [ ] Refresh token, xuất PDF, hàng đợi tác vụ nền

Danh sách đầy đủ: `ROADMAP.md`.
