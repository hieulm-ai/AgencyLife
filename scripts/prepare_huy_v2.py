"""Thay bộ hình HD của Huy (14/10/2026).

Bộ hd_* cũ của 01_Huy được AI vẽ nhầm người (áo thun đen, tóc ngắn) trong khi atlas gốc
và chân dung đúng hồ sơ (tóc nâu, áo phao đen mở ngoài áo be, quần kaki).
Nguồn mới: 5 tấm Higgsfield gpt_image_2_5 (high, 2k, nền trong), đã thu nhỏ 1/2:
  assets/characters/01_Huy/src_v2/huy_walk_raw.png        3×2  đi bộ trước/sau        (job f10a139a)
  assets/characters/01_Huy/src_v2/huy_actions_raw.png     4×4  ngồi, điện thoại, nói, ăn mừng, buồn (5a9f2653)
  assets/characters/01_Huy/src_v2/huy_burn_raw.png        2×2  bốc hỏa trước/sau      (3c482439)
  assets/characters/01_Huy/src_v2/huy_chair_blue_raw.png  2×2  ngồi ghế xanh 4 góc    (641872b5)
  assets/characters/01_Huy/src_v2/huy_chair_ergo_raw.png  2×2  ngồi ghế công thái học (2b437b77)
Bộ cũ giữ ở assets/characters/01_Huy/old_wrong_v1/.
Chạy: python3 -I scripts/prepare_huy_v2.py  rồi python3 source/build.py
"""
import shutil, statistics, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from prepare_skins import clean, cells, head_width, fit_cell, atlas  # noqa: E402

CH = ROOT / 'assets/characters'
OUT = CH / '01_Huy'
SRC = OUT / 'src_v2'
REF = '15_CongB'   # cùng giới, cùng khung: lấy cỡ đầu và vị trí đặt chân theo nhân vật này
ACTIONS = {'sit': [0, 1, 4, 5], 'use': [2, 3, 6, 7], 'talk': [8, 9, 12, 13], 'cele': [10, 10, 14, 14], 'sad': [11, 11, 15, 15]}
STANDING = [2, 3, 6, 7, 8, 9, 12, 13]


def fit_scaled(im, size, scale, hip=False):
    w, h = size
    scale = min(scale, (w - 8) / im.width, (h - 4) / im.height)
    sprite = clean(im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.Resampling.LANCZOS))
    x = round((w - sprite.width) / 2)
    y = round(94 - sprite.height * .76) if hip else h - 2 - sprite.height
    y = max(1, min(h - sprite.height - 1, y))
    frame = Image.new('RGBA', size)
    frame.alpha_composite(sprite, (x, y))
    return frame


def backup():
    old = OUT / 'old_wrong_v1'
    if old.exists():
        return
    old.mkdir()
    for f in OUT.glob('hd_*.png'):
        shutil.copy2(f, old / f.name)


def walk_and_actions():
    ref = clean(Image.open(CH / REF / 'hd_walk.png')).crop((96, 0, 192, 128))
    head = head_width(ref.crop(ref.getbbox()))
    walk = cells(SRC / 'huy_walk_raw.png', 3, 2)
    atlas([fit_cell(x, (96, 128), head) for x in walk], 3, 2, (96, 128), OUT / 'hd_walk.png')
    actions = cells(SRC / 'huy_actions_raw.png', 4, 4)
    scale = head / statistics.median(head_width(actions[i]) for i in STANDING)
    for kind, idx in ACTIONS.items():
        k = head / statistics.median(head_width(actions[i]) for i in idx) if kind == 'sit' else scale
        atlas([fit_scaled(actions[i], (96, 128), k, hip=kind == 'sit') for i in idx], 2, 2, (96, 128), OUT / f'hd_{kind}.png')


def burn():
    W, H = 160, 224
    ref = Image.open(CH / REF / 'hd_burn.png').convert('RGBA')
    ref_cells = [ref.crop((c * W, r * H, (c + 1) * W, (r + 1) * H)) for r in range(2) for c in range(2)]
    # So chiều cao cả hình (gồm lửa và khói): lửa của các nhân vật cùng cỡ nên tỉ lệ ổn định hơn đo riêng thân.
    target = statistics.median(x.getbbox()[3] - x.getbbox()[1] for x in ref_cells)
    frames = cells(SRC / 'huy_burn_raw.png', 2, 2)
    s = target / statistics.median(x.height for x in frames)
    sheet = Image.new('RGBA', (2 * W, 2 * H))
    for i, x in enumerate(frames):
        sm = clean(x.resize((max(1, round(x.width * s)), max(1, round(x.height * s))), Image.Resampling.LANCZOS))
        if sm.width > W - 4 or sm.height > H - 2:
            sm.thumbnail((W - 4, H - 2), Image.Resampling.LANCZOS)
        r, c = divmod(i, 2)
        sheet.alpha_composite(sm, (c * W + (W - sm.width) // 2, r * H + H - 1 - sm.height))
    sheet.save(OUT / 'hd_burn.png')


def chairs():
    # 4 góc theo thứ tự game: 01_front_left, 02_front_right, 03_back_right, 04_back_left.
    # Tấm nguồn 2×2: trên-trái, trên-phải, dưới-phải, dưới-trái. Hàng 2 = khung gõ phím thứ hai (dùng lại khung 1).
    W, H = 144, 224
    quad = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for ck in ['blue', 'ergo']:
        src = clean(Image.open(SRC / f'huy_chair_{ck}_raw.png'))
        hw, hh = src.width // 2, src.height // 2
        sheet = Image.new('RGBA', (4 * W, 2 * H))
        for i, (qx, qy) in enumerate(quad):
            part = src.crop((qx * hw, qy * hh, (qx + 1) * hw, (qy + 1) * hh))
            part = part.crop(part.getbbox())
            s = min((W - 4) / part.width, (H - 6) / part.height)
            sm = clean(part.resize((max(1, round(part.width * s)), max(1, round(part.height * s))), Image.Resampling.LANCZOS))
            for row in range(2):
                sheet.alpha_composite(sm, (i * W + (W - sm.width) // 2, row * H + H - 4 - sm.height))
        sheet.save(OUT / f'hd_chair_{ck}.png')


if __name__ == '__main__':
    backup()
    walk_and_actions()
    burn()
    chairs()
    print('ok')
