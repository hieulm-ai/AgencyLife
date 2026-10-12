"""Căn ảnh bàn Higgsfield khớp lưới sàn isometric 2:1 và xuất đủ 4 góc hd3x.

Đầu vào: sheet 2 góc của CÙNG một bàn (trái = góc trước 01_front_left, phải = góc sau 04_back_left),
trục dài chạy từ trên-trái xuống dưới-phải như khối hướng dẫn.
Cách căn: tìm 3 góc chân bàn chạm sàn (trái, trước, phải) trên ảnh, rồi biến đổi giữ cạnh đứng thẳng đứng để
3 điểm này nằm trên 3 đỉnh hình thoi footprint (ô 32x16 px thế giới, tức 96x48 ở hd3x). Góc 02/03 lấy bằng lật ngang
01/04 (cùng cách bộ ảnh gốc đã làm), nên hai góc đối xứng luôn khớp nhau.

Dùng: python3 prepare_desks_v2.py <sheet.png> <w> <d> <thư_mục_ra> [job_id]
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageOps
import numpy as np

HW3, HH3, SUP = 48, 24, 4   # nửa ô ở hd3x; dựng ở 4× hd3x rồi thu nhỏ cho mịn cạnh

def key_magenta(im):
    """Ảnh nền magenta #FF00FF (model không hỗ trợ nền trong suốt): tách nền theo khoảng cách màu, khử viền tím."""
    a = np.array(im.convert('RGBA')).astype(np.int32)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    dist = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)
    alpha = np.clip((dist - 90) * 255 / 90, 0, 255)
    tint = (r > g) & (b > g)                       # pha tím ở mép: kéo r, b về g
    a[:, :, 0] = np.where(tint, np.minimum(r, g), r); a[:, :, 2] = np.where(tint, np.minimum(b, g), b)
    a[:, :, 3] = alpha
    return Image.fromarray(a.astype(np.uint8))

def split_sheet(im):
    a = np.array(im)[:, :, 3] >= 128
    cols = a.sum(0); W = a.shape[1]
    runs, x = [], 0
    while x < W:
        if cols[x] < 3:
            s = x
            while x < W and cols[x] < 3: x += 1
            runs.append((s, x))
        else: x += 1
    inner = [r for r in runs if r[0] > 0 and r[1] < W]
    gap = max(inner, key=lambda r: r[1] - r[0])
    cut = (gap[0] + gap[1]) // 2
    return im.crop((0, 0, cut, im.height)), im.crop((cut, 0, W, im.height))

def clean(im):
    """Giữ thành phần liền lớn nhất + các mảnh chạm vào nó (đồ trên bàn), bỏ nhiễu nền."""
    a = np.array(im); m = a[:, :, 3] >= 128
    h, w = m.shape; lab = np.zeros((h, w), np.int32); n = 0; sizes = [0]
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]: continue
        n += 1; st = [(y0, x0)]; lab[y0, x0] = n; c = 0
        while st:
            y, x = st.pop(); c += 1
            for yy, xx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; st.append((yy, xx))
        sizes.append(c)
    keep = {i for i, s in enumerate(sizes) if i and s >= max(sizes) * 0.002}
    km = np.isin(lab, list(keep))
    a[:, :, 3] = np.where(km, a[:, :, 3], 0)
    return Image.fromarray(a), km

def floor_corners(m):
    """Đỉnh trái/phải của đáy bàn = điểm xa nhất theo hướng (−1,1) / (1,1): nằm giữa pháp tuyến cạnh đứng
    và cạnh đáy 2:1, nên đúng cả khi chân bàn thụt vào so với mép mặt bàn."""
    ys, xs = np.nonzero(m)
    x0, x1, ymax = xs.min(), xs.max(), ys.max()
    band = max(2, round((x1 - x0) * 0.004))
    i = np.argmax(ys - xs); L = (float(xs[i]), float(ys[i] + 1))
    j = np.argmax(ys + xs); R = (float(xs[j] + 1), float(ys[j] + 1))
    bx = xs[ys >= ymax - band]
    B = (float(bx.mean() + .5), float(ymax + 1))
    return L, B, R

def upright_fit(L, B, R, w, d):
    """Biến đổi giữ cạnh đứng thẳng đứng: x' = sx(x-Bx); y' = k(x-Bx) + sy(y-By).
    Đỉnh dưới B trùng đúng anchor; trái/phải nằm đúng trên 2 cạnh hình thoi (y khớp, x khớp theo bình phương tối thiểu).
    Không dùng affine 3 điểm tự do vì nó làm nghiêng cạnh đứng của bàn khi ảnh nguồn lệch tỉ lệ dài/sâu."""
    lx, rx = L[0] - B[0], R[0] - B[0]
    sx = (lx * (-w * HW3) + rx * (d * HW3)) / (lx * lx + rx * rx)
    A = np.array([[lx, L[1] - B[1]], [rx, R[1] - B[1]]], float)
    k, sy = np.linalg.solve(A, np.array([-w * HH3, -d * HH3], float))
    return np.array([[sx, 0, -sx * B[0]], [k, sy, -k * B[0] - sy * B[1]]])

def fit_view(im, w, d):
    im, m = clean(im)
    L, B, R = floor_corners(m)
    F = upright_fit(L, B, R, w, d)
    ys, xs = np.nonzero(m)
    pts = np.array([[xs.min(), ys.min(), 1], [xs.max() + 1, ys.min(), 1], [xs.min(), ys.max() + 1, 1], [xs.max() + 1, ys.max() + 1, 1]], float)
    q = (F @ pts.T).T
    left = int(np.floor(q[:, 0].min() / 3)) - 1; top = int(np.floor(q[:, 1].min() / 3)) - 1
    right = int(np.ceil(q[:, 0].max() / 3)) + 1; bottom = int(np.ceil(q[:, 1].max() / 3)) + 1
    size = (right - left, bottom - top); anchor = [-left, -top]
    Fi = np.linalg.inv(np.vstack([F, [0, 0, 1]]))[:2]
    # ô đầu ra (u,v) ở 4× hd3x → điểm hd3x (u/SUP + 3*left, v/SUP + 3*top) → ảnh nguồn qua F^-1
    S = np.array([[1 / SUP, 0, 3 * left], [0, 1 / SUP, 3 * top], [0, 0, 1]])
    T = Fi @ S
    big = im.convert('RGBa').transform((size[0] * 3 * SUP, size[1] * 3 * SUP), Image.Transform.AFFINE,
                                       tuple(T.flatten()), resample=Image.Resampling.BICUBIC)
    out = big.resize((size[0] * 3, size[1] * 3), Image.Resampling.LANCZOS).convert('RGBA')
    a = np.array(out); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); a[a[:, :, 3] == 0] = 0
    # Cắt sát nội dung, bám bội số 3 để anchor vẫn là số nguyên px thế giới.
    ys2, xs2 = np.nonzero(a[:, :, 3]); cx0, cy0 = xs2.min() // 3, ys2.min() // 3
    cx1, cy1 = -(-(xs2.max() + 1) // 3), -(-(ys2.max() + 1) // 3)
    out = Image.fromarray(a).crop((cx0 * 3, cy0 * 3, cx1 * 3, cy1 * 3))
    size = (int(cx1 - cx0), int(cy1 - cy0)); anchor = [int(anchor[0] - cx0), int(anchor[1] - cy0)]
    # Báo mức sửa hình học: góc cạnh dài/ngắn trên ảnh nguồn so với 26,565° của lưới 2:1.
    ang = lambda p, q: float(np.degrees(np.arctan2(abs(q[1] - p[1]), abs(q[0] - p[0]))))
    resid = [float(F[0, 0] * (L[0] - B[0]) + w * HW3), float(F[0, 0] * (R[0] - B[0]) - d * HW3)]   # lệch ngang (px hd3x) ở đỉnh trái/phải
    info = {'src_corners': {'left': L, 'bottom': B, 'right': R}, 'src_angle_long': round(ang(L, B), 2),
            'src_angle_short': round(ang(B, R), 2), 'grid_angle': 26.57, 'x_residual_hd3x': [round(v, 1) for v in resid],
            'vertical_scale': round(float(F[1, 1]), 4)}
    return out, size, anchor, info

def main(sheet, w, d, outdir, job=''):
    w, d = int(w), int(d); outdir = Path(outdir); outdir.mkdir(parents=True, exist_ok=True)
    src = Image.open(sheet).convert('RGBA')
    if np.array(src)[:, :, 3].min() == 255: src = key_magenta(src)   # sheet nền magenta
    front, back = split_sheet(src)
    meta = {'source_sheet': Path(sheet).name, 'higgsfield_job': job, 'footprint_rot0': [w, d], 'views': {}}
    for name, im, fp in (('01_front_left', front, [w, d]), ('04_back_left', back, [w, d])):
        out, size, anchor, info = fit_view(im, w, d)
        out.save(outdir / f'{name}.png')
        meta['views'][name] = {'size': list(size), 'anchor': anchor, 'footprint': fp, 'fit': info}
        mirror = {'01_front_left': '02_front_right', '04_back_left': '03_back_right'}[name]
        ImageOps.mirror(out).save(outdir / f'{mirror}.png')
        meta['views'][mirror] = {'size': list(size), 'anchor': [size[0] - anchor[0], anchor[1]], 'footprint': [d, w], 'fit': 'mirror of ' + name}
    (outdir / 'layout.json').write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'fit'} for k, v in meta['views'].items()}))
    for k, v in meta['views'].items():
        if isinstance(v['fit'], dict): print(k, v['fit']['src_angle_long'], v['fit']['src_angle_short'])

if __name__ == '__main__':
    main(*sys.argv[1:])
