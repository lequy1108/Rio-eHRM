# Quy trình làm việc với Git

Làm như một team: **không ai đẩy thẳng lên `main`**. Mọi thay đổi đi qua nhánh riêng → Pull Request (PR) → CI xanh → review → merge.

## 1. Bắt đầu một việc mới

```bash
git switch main
git pull                      # lấy bản mới nhất
git switch -c feat/ten-viec   # tạo nhánh mới từ main
```

Đặt tên nhánh theo loại việc, chữ thường không dấu, nối bằng gạch ngang:

| Tiền tố | Dùng khi | Ví dụ |
| --- | --- | --- |
| `feat/` | Chức năng mới | `feat/hop-dong-lao-dong` |
| `fix/` | Sửa lỗi | `fix/dialog-nhay-khi-huy` |
| `refactor/` | Sửa code, không đổi hành vi | `refactor/tach-employee-service` |
| `chore/` | Cấu hình, thư viện, CI | `chore/them-ci` |
| `docs/` | Chỉ sửa tài liệu | `docs/huong-dan-cai-dat` |

Mỗi nhánh làm **một việc**. Việc lớn thì chia nhiều PR nhỏ (dễ review, dễ quay lại).

## 2. Commit

Theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/vi/): `loại(phạm vi): mô tả ngắn`, mô tả viết tiếng Việt, không dấu chấm cuối.

```
feat(employees): thêm tab người phụ thuộc
fix(auth): không khoá tài khoản khi đăng nhập đúng sau lần sai
refactor(settings): gom validate vào settings.schema
chore(ci): chạy typecheck cho frontend
```

- Commit nhỏ, mỗi commit một ý, code vẫn chạy được.
- Trước khi commit: `git status` xem lại, không để lọt `.env`, file tạm, `console.log` gỡ lỗi.

## 3. Đẩy nhánh và mở Pull Request

```bash
git push -u origin feat/ten-viec
```

GitHub sẽ hiện nút **Compare & pull request**. Điền theo mẫu có sẵn (mục đích, cách kiểm tra, ảnh chụp nếu đổi giao diện).
Có GitHub CLI thì: `gh pr create --fill`.

## 4. CI và review

- CI (GitHub Actions) tự chạy kiểm tra kiểu dữ liệu và build cho backend, frontend. Đỏ thì sửa trên cùng nhánh rồi push tiếp, PR tự cập nhật.
- Người review đọc code, thử theo mục "Cách kiểm tra". Sửa theo góp ý bằng commit mới trên nhánh.
- Làm một mình thì vẫn tự review: đọc lại toàn bộ "Files changed" trên GitHub trước khi merge.

## 5. Merge

- Chọn **Squash and merge** để `main` mỗi PR là một commit gọn, tiêu đề theo chuẩn ở mục 2.
- Xoá nhánh sau khi merge (GitHub có nút Delete branch).
- Về máy: `git switch main && git pull`, xoá nhánh cũ `git branch -d feat/ten-viec`.

## 6. Phát hành phiên bản

Khi xong một nhóm chức năng (vd một giai đoạn trong `ROADMAP.md`), gắn tag theo [SemVer](https://semver.org/lang/vi/):

```bash
git switch main && git pull
git tag -a v0.3.0 -m "Giai đoạn 3: hồ sơ nhân viên đầy đủ"
git push origin v0.3.0
```

Trên GitHub → Releases → Draft a new release từ tag đó, ghi các thay đổi chính.

## Cài đặt một lần trên GitHub

Settings → Branches → **Add branch ruleset** (hoặc Branch protection rule) cho `main`:

- Require a pull request before merging
- Require status checks to pass → chọn `Backend (kiểu dữ liệu + build)` và `Frontend (kiểu dữ liệu + build)`
- Block force pushes

Settings → General → Pull Requests: chỉ bật **Allow squash merging**, bật **Automatically delete head branches**.
