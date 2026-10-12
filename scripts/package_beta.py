"""Package only the current playable build and its referenced assets."""
import hashlib,json,re,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'game'
DEST=ROOT.parent/'Agency-Life-Tycoon-Beta-V31.zip'
html=(GAME/'index.html').read_text()
manifest=json.loads((GAME/'asset-manifest.json').read_text())
paths=['index.html','asset-manifest.json']+[item['path'] for item in manifest]
assert len(paths)==len(set(paths)), 'Duplicate asset'
refs=set(re.findall(r'assets/[A-Za-z0-9_./-]+',html))
assert refs<=set(paths), 'Unlisted assets: '+str(refs-set(paths))
for item in manifest:
 p=(GAME/item['path']).resolve()
 assert p.is_relative_to(GAME.resolve()) and p.is_file(), item['path']
 assert p.stat().st_size==item['bytes'], item['path']
launcher='''import functools,http.server,pathlib,webbrowser,argparse,sys
ROOT=pathlib.Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description="Agency's Life Tycoon beta")
parser.add_argument('--check',action='store_true',help='Check packaged files without starting a server')
args=parser.parse_args()
if args.check:
 import hashlib,json
 for name,digest in json.loads((ROOT/'checksums.json').read_text()).items():
  if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:
   raise SystemExit('File missing or modified: '+name)
 print('All packaged files verified.');sys.exit(0)
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT/'game'))
try:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),handler)
except OSError:
 print('Port 8765 is unavailable. Close the previous game server, then retry.');sys.exit(1)
url='http://localhost:8765/index.html'
print('Game: '+url+' | Ctrl+C to stop')
webbrowser.open(url)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
'''
guide='''AGENCY’S LIFE TYCOON — BETA V31
11/10/2026

CHẠY GAME
1. Giải nén ZIP thành một thư mục.
2. Cần Python 3 (bản 3.9 trở lên). Không cần cài thư viện thêm để chơi.
3. Trên Mac: mở Terminal tại thư mục đã giải nén, chạy: python3 run_game.py
   Trên Windows: mở Terminal tại thư mục đó, chạy: py run_game.py
4. Trình duyệt sẽ mở http://localhost:8765/index.html. Giữ cửa sổ Terminal mở khi chơi.
5. Dừng máy chủ bằng Ctrl+C. Nếu cổng đã được dùng, dừng máy chủ cũ rồi chạy lại.
Không mở index.html trực tiếp bằng file:// vì game cần tải danh sách tài nguyên.

GIỮ TIẾN ĐỘ
Tiến độ lưu trong trình duyệt, theo địa chỉ website. Dùng đúng localhost:8765
và cùng hồ sơ trình duyệt để tiếp tục ván cũ. 127.0.0.1, cổng khác, trình duyệt
khác hoặc chế độ ẩn danh dùng kho lưu khác.
Trước khi đổi máy/trình duyệt: Cài đặt → Tải bản lưu.
Máy mới: Cài đặt → Khôi phục từ file. Trở lại ván trước cho phép đổi về bản trước nhập.
ZIP này không chứa tiến độ hoặc dữ liệu tài khoản của người phát triển.

LƯƠNG NHÂN SỰ
Lương khác nhau theo vai trò (1,5–3,5 tr/ngày), nhân sự nổi bật +20%.
Chốt một lần mỗi ngày game; thiếu tiền ghi nợ và trả ở kỳ sau.
Người chơi/linh vật không tính lương. Bản lưu cũ không truy thu.

THỬ BETA
- Mục tiêu khoảng 4 job/ngày cho 3 người làm việc + người chơi lễ tân.
- Thử nhận/giao job, đặt/xoay/di chuyển nội thất, đóng và mở lại game.
- Điện thoại chơi ngang; xoay dọc tạm dừng mô phỏng, năng lượng vẫn hồi.
- Nếu gặp lỗi, ghi: trình duyệt/thiết bị, ngày game, các bước, ảnh màn hình.
  Có thể gửi kèm file lưu nếu muốn tái hiện đúng ván.

GIỚI HẠN BẢN BETA
Chưa kết nối máy chủ tài khoản/cloud dùng chung; chức năng thử bạn bè chỉ mô phỏng.
Chưa kiểm chứng cảm ứng đa điểm trên điện thoại vật lý.
Game có thể dùng font thay thế nếu không tải được Google Fonts.
Bản này chưa được đưa lên website công khai.

KIỂM TRA GÓI
python3 run_game.py --check (Windows: py run_game.py --check)
Lệnh đối chiếu tất cả tệp với checksums.json, không mở trình duyệt.
'''
files={'game/'+name:(GAME/name).read_bytes() for name in paths}
files['run_game.py']=launcher.encode();files['HUONG-DAN.txt']=guide.encode()
files['checksums.json']=json.dumps({name:hashlib.sha256(raw).hexdigest() for name,raw in sorted(files.items())},indent=2).encode()
with zipfile.ZipFile(DEST,'w',zipfile.ZIP_DEFLATED) as z:
 for name,raw in sorted(files.items()):z.writestr('Agency-Life-Tycoon-Beta/'+name,raw)
with zipfile.ZipFile(DEST) as z:assert z.testzip() is None
print(json.dumps({'zip':str(DEST),'files':len(files),'assets':len(manifest),'bytes':DEST.stat().st_size,'sha256':hashlib.sha256(DEST.read_bytes()).hexdigest()},indent=2))
