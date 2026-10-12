"""Chuẩn hoá ảnh Higgsfield của các dáng tự tạo mới (07/10/2026) về đúng khung sprite của game.

Đầu vào : assets/creator_src/<key>_walk_raw.png    (3 cột × 2 hàng, đi bộ trước/sau)
          assets/creator_src/<key>_actions_raw.png (4 × 4: ngồi, dùng điện thoại, nói, ăn mừng, buồn)
          Ảnh tải từ Higgsfield (gpt_image_2_5), đã thu nhỏ 1/2 trong sandbox để chuyển về máy làm việc.
Đầu ra  : assets/creator_bases/<char>/hd_walk.png, hd_sit.png, hd_use.png, hd_talk.png, hd_cele.png, hd_sad.png
          cùng khung 96×128 như nhân vật có sẵn; cỡ đầu theo nhân vật mẫu cùng giới (CongB / Hảo Hảo) để đứng cạnh nhau không lệch.
Chạy: python3 -I scripts/prepare_creator_bases.py
"""
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from prepare_skins import clean, cells, head_width, fit_cell, atlas  # noqa: E402
import statistics

SRC = ROOT / 'assets/creator_src'
OUT = ROOT / 'assets/creator_bases'
# key trong màn tự tạo → (thư mục dáng, nhân vật mẫu lấy cỡ đầu)
BASES = {'m2': ('C_short_m', '15_CongB'), 'f2': ('C_short_f', '07_Hao_Hao')}
ACTIONS = {'sit': [0, 1, 4, 5], 'use': [2, 3, 6, 7], 'talk': [8, 9, 12, 13], 'cele': [10, 10, 14, 14], 'sad': [11, 11, 15, 15]}
STANDING = [2, 3, 6, 7, 8, 9, 12, 13]   # dùng điện thoại, nói: đầu không bị tay che, đo cỡ đầu ổn định


def fit_scaled(im, size, scale, hip=False):
    # Một tỉ lệ chung cho cả tấm hành động: tay giơ cao (ăn mừng) hay cúi đầu (buồn) không làm nhân vật to/nhỏ đi.
    w, h = size
    scale = min(scale, (w - 8) / im.width, (h - 4) / im.height)
    sprite = clean(im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.Resampling.LANCZOS))
    x = round((w - sprite.width) / 2)
    y = round(94 - sprite.height * .76) if hip else h - 2 - sprite.height
    y = max(1, min(h - sprite.height - 1, y))
    frame = Image.new('RGBA', size)
    frame.alpha_composite(sprite, (x, y))
    return frame


def prepare(key, char, ref_char):
    ref = clean(Image.open(ROOT / 'assets/characters' / ref_char / 'hd_walk.png')).crop((96, 0, 192, 128))
    head = head_width(ref.crop(ref.getbbox()))
    out = OUT / char
    out.mkdir(parents=True, exist_ok=True)
    walk = cells(SRC / f'{key}_walk_raw.png', 3, 2)
    atlas([fit_cell(x, (96, 128), head) for x in walk], 3, 2, (96, 128), out / 'hd_walk.png')
    done = ['walk']
    raw = SRC / f'{key}_actions_raw.png'
    if raw.exists():
        actions = cells(raw, 4, 4)
        scale = head / statistics.median(head_width(actions[i]) for i in STANDING)
        for kind, idx in ACTIONS.items():
            # Dáng ngồi được AI vẽ to hơn dáng đứng: lấy cỡ đầu riêng của 4 khung ngồi.
            k = head / statistics.median(head_width(actions[i]) for i in idx) if kind == 'sit' else scale
            atlas([fit_scaled(actions[i], (96, 128), k, hip=kind == 'sit') for i in idx], 2, 2, (96, 128), out / f'hd_{kind}.png')
            done.append(kind)
    return done


if __name__ == '__main__':
    report = {k: prepare(k, *v) for k, v in BASES.items() if (SRC / f'{k}_walk_raw.png').exists()}
    (OUT / 'ready.json').write_text(json.dumps({k: {'char': BASES[k][0], 'sheets': v} for k, v in report.items()}, indent=1))
    print(json.dumps(report))
