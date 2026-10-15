"""Ảnh đại diện (avatar) cho nhân vật (15/10/2026): cắt đầu + vai từ ảnh nhân vật độ phân giải cao.

Nguồn: assets/characters/<id>/ref_hires.png (512×768, nền sáng hoặc nền trong).
  06–15: bộ hồ sơ nhân vật NV01–NV10 v2 chủ dự án gửi 15/10.
  01–04, trinh_lac, 16_Min, 17_Liu: vẽ bổ sung bằng Higgsfield theo cùng phong cách.
Ra: assets/characters/<id>/avatar.png (96×96, nền trong).
Chạy: python3 -I scripts/make_avatars.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CH = ROOT / 'assets/characters'


def foreground(im):
    a = np.array(im.convert('RGBA')).astype(int)
    if (a[:, :, 3] < 250).any():                       # đã có nền trong
        return a[:, :, 3] > 40
    corners = np.array([a[2, 2, :3], a[2, -3, :3], a[-3, 2, :3], a[-3, -3, :3]])
    bg = np.median(corners, axis=0)
    d = np.abs(a[:, :, :3] - bg).sum(axis=2)
    return d > 36


def avatar(src, out, size=96):
    im = Image.open(src).convert('RGBA')
    fg = foreground(im)
    ys, xs = np.where(fg)
    top, bot = ys.min(), ys.max()
    h = bot - top
    head = fg[top:top + int(h * .3)]
    hx = np.where(head)[1].mean()
    side = int(h * .5)
    x0 = int(round(hx - side / 2)); y0 = int(top - h * .03)
    mask = Image.fromarray((fg * 255).astype('uint8')).filter(ImageFilter.MaxFilter(3))
    cut = im.copy(); cut.putalpha(mask)
    box = Image.new('RGBA', (side, side))
    box.alpha_composite(cut.crop((x0, y0, x0 + side, y0 + side)))
    box.resize((size, size), Image.Resampling.LANCZOS).save(out)


if __name__ == '__main__':
    for d in sorted(CH.iterdir()):
        src = d / 'ref_hires.png'
        if src.exists():
            avatar(src, d / 'avatar.png')
            print(d.name, 'ok')
