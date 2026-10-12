# Agency’s Life Tycoon

Game quản lý agency bằng HTML/CSS/JavaScript và Canvas 2D.

## Chạy game

Cần Python 3. Tại thư mục kho:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory game
```

Mở http://localhost:8765/index.html. Giữ đúng địa chỉ và hồ sơ trình duyệt để tiếp tục bản lưu. Có thể xuất/nhập bản lưu trong Cài đặt.

## Bản cập nhật 13/10/2026

- Giao diện gọn hơn cho công việc, đội ngũ, cửa hàng và báo cáo ngày.
- Avatar nhân vật, skin, icon riêng cho các loại job và lựa chọn phản hồi khách.
- Nút từ chối job ngay trên thẻ công việc chờ.
- Lương theo vai trò, chốt lương hàng ngày và theo dõi nợ lương.
- Màn hình tải, bố cục toàn màn hình và các điều chỉnh chơi beta.

## Phát triển

```sh
python3 -m pip install -r requirements.txt
python3 source/build.py
node --test tests/*.test.cjs
```

Bản cập nhật vượt qua 315 kiểm thử. `source/` là mã nguồn, `assets/` là ảnh gốc, `game/` là bản đã build. Khi đưa lên hosting tĩnh, chọn `game/` làm thư mục phục vụ.

## Tài khoản

Chưa cấu hình dịch vụ tài khoản thật. Xem `online/HUONG-DAN-SUPABASE.md` để thiết lập; không đưa khóa bí mật lên kho. Bản hiện tại vẫn lưu tiến độ trong trình duyệt.
