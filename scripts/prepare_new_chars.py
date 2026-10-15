"""Thêm 2 nhân vật mới (15/10/2026): 16_Min (Quay phim) và 17_Liu (Âm thanh).

Nguồn: Higgsfield gpt_image_2_5 (high, 2k, nền trong), đã thu nhỏ 1/2, nằm ở assets/characters/<id>/src/:
  <tên>_walk_raw.png        3×2  đi bộ trước/sau
  <tên>_actions_raw.png     4×4  ngồi, điện thoại, nói, ăn mừng, buồn
  <tên>_burn_raw.png        2×2  bốc hỏa trước/sau
  <tên>_chair_blue_raw.png  2×2  ngồi ghế xanh 4 góc
  <tên>_chair_ergo_raw.png  2×2  ngồi ghế công thái học 4 góc
  min_cam_raw.png          2×2  cầm máy quay trước/sau (chỉ Min) → hd_cam.png
Bố cục lấy theo bộ hình Huy (assets/characters/01_Huy/src_v2). Cỡ đầu lấy theo một nhân vật cùng giới.
Chạy: python3 -I scripts/prepare_new_chars.py  rồi python3 source/build.py
"""
import statistics, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from prepare_skins import clean, cells, head_width, fit_cell, atlas  # noqa: E402

CH = ROOT / 'assets/characters'
CHARS = {'16_Min': ('min', '15_CongB'), '17_Liu': ('liu', '07_Hao_Hao')}
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


def walk_and_actions(out, src, name, ref):
    r = clean(Image.open(CH / ref / 'hd_walk.png')).crop((96, 0, 192, 128))
    head = head_width(r.crop(r.getbbox()))
    walk = cells(src / f'{name}_walk_raw.png', 3, 2)
    atlas([fit_cell(x, (96, 128), head) for x in walk], 3, 2, (96, 128), out / 'hd_walk.png')
    actions = cells(src / f'{name}_actions_raw.png', 4, 4)
    scale = head / statistics.median(head_width(actions[i]) for i in STANDING)
    for kind, idx in ACTIONS.items():
        k = head / statistics.median(head_width(actions[i]) for i in idx) if kind == 'sit' else scale
        atlas([fit_scaled(actions[i], (96, 128), k, hip=kind == 'sit') for i in idx], 2, 2, (96, 128), out / f'hd_{kind}.png')
    # chiều cao người đứng sau khi thu (dùng để thu tư thế cầm máy quay cho khớp)
    return statistics.median(actions[i].height * scale for i in STANDING)


def cam(out, src, name, stand_h):
    p = src / f'{name}_cam_raw.png'
    if not p.exists():
        return
    frames = cells(p, 2, 2)
    k = stand_h / statistics.median(f.height for f in frames)
    atlas([fit_scaled(f, (96, 128), k) for f in frames], 2, 2, (96, 128), out / 'hd_cam.png')


def burn(out, src, name, ref):
    W, H = 160, 224
    r = Image.open(CH / ref / 'hd_burn.png').convert('RGBA')
    ref_cells = [r.crop((c * W, rr * H, (c + 1) * W, (rr + 1) * H)) for rr in range(2) for c in range(2)]
    target = statistics.median(x.getbbox()[3] - x.getbbox()[1] for x in ref_cells)
    frames = cells(src / f'{name}_burn_raw.png', 2, 2)
    s = target / statistics.median(x.height for x in frames)
    sheet = Image.new('RGBA', (2 * W, 2 * H))
    for i, x in enumerate(frames):
        sm = clean(x.resize((max(1, round(x.width * s)), max(1, round(x.height * s))), Image.Resampling.LANCZOS))
        if sm.width > W - 4 or sm.height > H - 2:
            sm.thumbnail((W - 4, H - 2), Image.Resampling.LANCZOS)
        rr, c = divmod(i, 2)
        sheet.alpha_composite(sm, (c * W + (W - sm.width) // 2, rr * H + H - 1 - sm.height))
    sheet.save(out / 'hd_burn.png')


def chairs(out, src, name):
    # 4 góc theo thứ tự game: 01_front_left, 02_front_right, 03_back_right, 04_back_left (giống bộ Huy).
    W, H = 144, 224
    quad = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for ck in ['blue', 'ergo']:
        im = clean(Image.open(src / f'{name}_chair_{ck}_raw.png'))
        hw, hh = im.width // 2, im.height // 2
        sheet = Image.new('RGBA', (4 * W, 2 * H))
        for i, (qx, qy) in enumerate(quad):
            part = im.crop((qx * hw, qy * hh, (qx + 1) * hw, (qy + 1) * hh))
            part = part.crop(part.getbbox())
            s = min((W - 4) / part.width, (H - 6) / part.height)
            sm = clean(part.resize((max(1, round(part.width * s)), max(1, round(part.height * s))), Image.Resampling.LANCZOS))
            for row in range(2):
                sheet.alpha_composite(sm, (i * W + (W - sm.width) // 2, row * H + H - 4 - sm.height))
        sheet.save(out / f'hd_chair_{ck}.png')


def portrait(out):
    # Ảnh đại diện 48×64: khung đứng mặt trước của sheet đi bộ, thu 1/2.
    stand = Image.open(out / 'hd_walk.png').convert('RGBA').crop((96, 0, 192, 128))
    clean(stand.resize((48, 64), Image.Resampling.LANCZOS)).save(out / 'portrait_48x64.png')


if __name__ == '__main__':
    for cid, (name, ref) in CHARS.items():
        out = CH / cid
        src = out / 'src'
        h = walk_and_actions(out, src, name, ref)
        cam(out, src, name, h)
        burn(out, src, name, ref)
        chairs(out, src, name)
        portrait(out)
        print(cid, 'ok')
