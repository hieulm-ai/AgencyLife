# Bật online cho Agency's Life Tycoon (Supabase, gói miễn phí)

Cập nhật 08/10/2026. Giao diện Supabase, Google và Facebook có thể đổi tên mục; nếu không thấy đúng chữ như dưới đây, tìm mục có nghĩa tương đương.

## Tóm tắt

| Bước | Ai làm | Việc | Xong khi |
| --- | --- | --- | --- |
| 1 | Anh/chị | Tạo dự án Supabase (gói Free) | Có Project URL |
| 2 | Anh/chị | Chạy `supabase-schema.sql` trong SQL Editor | Thấy các bảng `profiles`, `saves`, `mail`… |
| 3 | Anh/chị | Bật đăng nhập Email, Google, Facebook | Ba nhà cung cấp ở trạng thái Enabled |
| 4 | Anh/chị | Chọn nơi đặt trang game, khai báo địa chỉ trang trong Supabase | Có địa chỉ web của game |
| 5 | Anh/chị → Claude | Gửi **Project URL** và **anon/publishable key** | Claude tạo `online/config.json`, build lại |
| 6 | Cùng kiểm tra | Đăng nhập 3 cách, 2 máy, kết bạn, tặng quà | Đạt các cổng ở cuối tài liệu |

**Không gửi cho ai:** `service_role` key (secret key), mật khẩu cơ sở dữ liệu, Client Secret của Google, App Secret của Facebook.

## 1. Tạo dự án

1. Vào supabase.com → đăng nhập → **New project**.
2. Đặt tên (ví dụ `agency-life-tycoon`), đặt mật khẩu cơ sở dữ liệu (tự giữ), chọn khu vực gần Việt Nam (ví dụ Singapore).
3. Chờ dự án khởi tạo xong.

## 2. Tạo bảng và quy tắc

1. Mở **SQL Editor** → **New query**.
2. Dán toàn bộ nội dung tệp `online/supabase-schema.sql` → **Run**.
3. Kiểm tra: **Table Editor** có các bảng `profiles`, `saves`, `offices`, `friend_requests`, `friendships`, `blocks`, `mail`, `gift_pool`.

Tệp này chạy lại được nhiều lần (khi có bản cập nhật), không xóa dữ liệu đã có.

## 3. Đăng nhập

**Authentication → Sign In / Providers**

- **Email**: bật. Nếu bật "Confirm email", người chơi phải bấm liên kết trong email trước khi đăng nhập lần đầu (game đã có thông báo cho trường hợp này).
- **Google**: tạo OAuth Client trong Google Cloud Console (loại Web application). Mục *Authorized redirect URIs* dán đường dẫn callback mà Supabase hiển thị ở trang cấu hình Google. Dán Client ID + Client Secret vào Supabase.
- **Facebook**: tạo app trên Facebook for Developers, thêm sản phẩm Facebook Login. Mục *Valid OAuth Redirect URIs* dán callback của Supabase. Dán App ID + App Secret vào Supabase. Meta yêu cầu app có đường dẫn chính sách quyền riêng tư; app ở chế độ phát triển chỉ cho tài khoản được thêm vào app đăng nhập.

## 4. Nơi đặt trang game và địa chỉ quay về

Supabase không đặt trang web tĩnh, nên trang game cần nơi khác (ví dụ Cloudflare Pages, Netlify, GitHub Pages). Tải lên toàn bộ thư mục `game/` sau khi build.

Sau khi có địa chỉ (ví dụ `https://agency-tycoon.pages.dev`):

**Authentication → URL Configuration**
- *Site URL*: địa chỉ trang game.
- *Redirect URLs*: thêm địa chỉ trang game (thêm cả địa chỉ chạy thử nếu có).

Trang chơi thử trên claude.ai không dùng được Google/Facebook (không khai báo được làm địa chỉ quay về); ở đó dùng "Máy chủ thử trên máy này".

## 5. Kết nối game với máy chủ

Trong Supabase: **Project Settings → API** (hoặc **API Keys**), lấy:
- **Project URL**, ví dụ `https://abcd1234.supabase.co`
- **anon public key** (dự án mới có thể gọi là *publishable key*). Khóa này được phép nằm trong trang web; quyền thật do quy tắc trong `supabase-schema.sql` quyết định.

Tạo tệp `online/config.json` theo mẫu `online/config.example.json`, rồi chạy `python3 source/build.py`. Trang game sẽ hiện "Máy chủ Supabase" trong Cài đặt → Tài khoản.

## 6. Cổng kiểm tra trước khi mời người chơi

| Cổng | Cách thử | Đạt khi |
| --- | --- | --- |
| Đăng nhập | Email, Google, Facebook trên máy tính và điện thoại | Cả 3 cách vào được, đăng xuất được |
| Lưu đám mây | Chơi ở máy A, đăng nhập máy B | Máy B hỏi chọn tiến độ và tải đúng văn phòng máy A |
| Bảo mật | Người lạ (chưa kết bạn) mở tham quan bằng cách sửa mã trang | Không đọc được văn phòng, bản lưu, thư |
| Quà | Tặng cùng 1 bạn 2 lần trong ngày; tặng 2 bạn khác nhau | Lần 2 bị từ chối; tặng bạn khác vẫn được |
| Nhận quà | Bấm Nhận 2 lần, mở 2 tab cùng bấm Nhận tất cả | Mỗi quà chỉ vào Kho 1 lần |
| Chặn | A chặn B | B không thấy văn phòng A, không gửi lời mời/quà được |

## Giới hạn hiện tại

- Tiền và ruby trong bản lưu vẫn do trình duyệt tính; người chơi sửa được bản lưu của chính mình. Chưa có bảng xếp hạng nên chấp nhận ở bản thử.
- Xóa tài khoản đăng nhập: người chơi bấm "Xóa dữ liệu online của tôi" (xóa dữ liệu game); tài khoản đăng nhập do quản trị xóa ở **Authentication → Users**.
- Gói Free tạm dừng dự án sau 1 tuần không có hoạt động (theo trang giá Supabase ngày 08/10/2026).
