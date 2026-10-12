"""Thay ảnh 4 góc của bàn làm việc và bàn dựng phim bằng bộ Higgsfield desks_v2 (khớp lưới sàn).

Đầu vào: assets/desks_v2/<id>-sheet.png (+ generation*.json) cho work_desk, editing_workstation, dual_monitor_desk.
Việc làm:
 1. Chạy prepare_desks_v2 cho từng sheet → assets/desks_v2/<id>/ (4 PNG hd3x + layout.json).
 2. Lưu bản cũ một lần vào assets/desks_v2/old_v1/<id>/ để đối chiếu/hoàn tác.
 3. Chép 4 PNG vào assets/items_hd3x/furniture/<id>/ và cập nhật size/anchor/footprint trong
    source/asset_manifest_build.json.
Sau đó: python3 source/build.py
"""
import json, shutil, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import prepare_desks_v2 as prep

SRC = ROOT / 'assets/desks_v2'
ITEMS = {'work_desk': (2, 1), 'editing_workstation': (3, 1), 'dual_monitor_desk': (2, 1)}
ROT = ['01_front_left', '02_front_right', '03_back_right', '04_back_left']

def main():
    gen = {}
    for g in sorted(SRC.glob('generation*.json')): gen.update({k: v for k, v in json.loads(g.read_text()).items() if isinstance(v, dict)})
    mpath = ROOT / 'source/asset_manifest_build.json'
    doc = json.loads(mpath.read_text())
    for fid, (w, d) in ITEMS.items():
        if not (SRC / f'{fid}-sheet.png').exists(): print('bỏ qua', fid, '(chưa có sheet)'); continue
        out = SRC / fid
        prep.main(str(SRC / f'{fid}-sheet.png'), w, d, str(out), gen[fid]['job_id'])
        layout = json.loads((out / 'layout.json').read_text())['views']
        dst = ROOT / 'assets/items_hd3x/furniture' / fid
        old = SRC / 'old_v1' / fid
        if not old.exists():
            shutil.copytree(dst, old)
        item = doc['manifest']['items']['furniture/' + fid]
        for v in ROT:
            shutil.copyfile(out / f'{v}.png', dst / f'{v}.png')
            lv = layout[v]
            item['views'][v].update({'size': lv['size'], 'anchor': lv['anchor'], 'footprint': lv['footprint'],
                                     'align': 'corner', 'source': 'higgsfield_desks_v2 ' + gen[fid]['job_id']})
            item['views'][v].pop('scale_from_src', None)
        item['footprint_rot0'] = [w, d]
        print(fid, {v: (layout[v]['size'], layout[v]['anchor']) for v in ROT})
    mpath.write_text(json.dumps(doc, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
