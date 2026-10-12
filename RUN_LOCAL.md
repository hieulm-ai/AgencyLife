# Chạy local

Game dùng HTML/CSS/JavaScript thuần, Canvas 2D và localStorage. Không cần dependency để chơi.

Từ thư mục gói:
```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory game
```
Mở http://127.0.0.1:8765/index.html.

## Build lại
```sh
python3 -m pip install -r requirements.txt
python3 source/build.py
```
Script chạy được từ bất kỳ thư mục nào. Bản đồ nằm ở source/map_preset.json, đã trích từ bản bàn giao. Ảnh giao diện/kiến trúc nhúng trước đây nằm ở source/static/; ảnh nhân vật, nội thất và khách hàng gốc nằm ở assets/.

## Gói phát hành
Mang theo game/index.html, toàn bộ game/assets/ và game/asset-manifest.json. URL ảnh là tương đối, dùng được trong thư mục con. Không gửi riêng index.html vì ảnh đã tách ra ngoài.

Build tái sử dụng ảnh không đổi; chỉ thay index.html sau khi ghi và kiểm tra đủ asset. Không tự xóa ảnh cũ để tránh ảnh hưởng tab đang chạy bản trước.

Bản HTML tự chứa game/5bit-agency-tycoon.html giữ nguyên để tham khảo, không cần đưa vào gói phát hành mới. Scripts xử lý ảnh lịch sử trong scripts/ không thuộc quy trình build hiện tại.

## Kiểm tra cảnh họp
```sh
node --test tests/meetings.test.cjs
python3 tests/build_preview.py
```
Mở /meeting-preview.html để chọn 8 khách và 4 góc, thử đến bàn, bán bàn hoặc tiến thời gian. Trang này dùng dữ liệu lưu riêng. Bản chơi chính vẫn là /index.html.
# Bộ Streetwear

Trong game: mở **Cửa hàng kim cương → Trang phục**. Mỗi skin giá 50 ruby; đổi lại đồ gốc miễn phí.

Sau khi thay ảnh raw, chuẩn hóa bằng `python3 scripts/prepare_skins.py`, sau đó build theo hướng dẫn bên dưới. Không cần gọi Higgsfield lại để build.

Kiểm tra logic: `node --test tests/skins.test.cjs tests/meetings.test.cjs`.

## Nhân sự
Game mới bắt đầu với Huy, Luwon, Pali. Mở thanh Nhân sự trên cùng để tuyển người (phí thử nghiệm 20 triệu), cho nghỉ hoặc tuyển lại. Bản lưu cũ giữ đủ đội ngũ hiện có. Skin sở hữu được giữ khi nhân viên nghỉ.

Kiểm tra đầy đủ: `node --test tests/*.test.cjs`.
