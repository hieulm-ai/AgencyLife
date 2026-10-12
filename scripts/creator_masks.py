"""Tách vùng (da, tóc, áo, quần) trên ảnh nhân vật gốc để màn "Tự tạo nhân vật" đổi màu lúc chạy.

Đầu vào : assets/characters/<base>/hd_<sheet>.png của các dáng gốc trong BASES;
          dáng tự tạo riêng (07/10/2026, Higgsfield): assets/creator_bases/<base>/hd_<sheet>.png (scripts/prepare_creator_bases.py).
Đầu ra  : assets/creator/<base>/<sheet>.png  (ảnh xám: giá trị = mã vùng × 50; 0 = giữ nguyên)
          assets/creator/layout.json         (độ sáng thấp / trung vị / cao của từng vùng để dựng thang màu)
          assets/creator/preview.png         (ảnh kiểm tra: tô màu thử từng vùng)
Cách tách: phân lớp theo màu (HSL) riêng cho từng dáng, rồi làm sạch theo khung hình:
  - điểm ảnh chuyển tiếp ở mép vùng (mép da–tóc, nếp áo sáng, đường may) nhận vùng lân cận có màu gần nhất,
    để khi đổi màu không còn viền răng cưa màu gốc (07/10/2026);
  - tóc/quần cùng tông tối: lấy theo đa số lân cận; mảnh tóc quá nhỏ (thắt lưng, viền) giữ nguyên;
  - áo/quần cùng tông xanh: tách theo độ sáng rồi lấy đa số lân cận;
  - mảnh nhỏ (mắt trắng, nước mắt, lấp lánh) và giày dưới chân giữ nguyên.
Chạy: python3 -I scripts/creator_masks.py
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.color import rgb2lab

ROOT = Path(__file__).resolve().parents[1]
CHARS = ROOT / 'assets/characters'
OUT = ROOT / 'assets/creator'
KEEP, SKIN, HAIR, TOP, BOTTOM = 0, 1, 2, 3, 4
SHEETS = {'walk': (96, 128), 'sit': (96, 128), 'use': (96, 128), 'talk': (96, 128), 'cele': (96, 128), 'sad': (96, 128), 'burn': (160, 224)}
BASES = {'m': '15_CongB', 'f': '07_Hao_Hao', 'm2': 'C_short_m', 'f2': 'C_short_f'}
# Dáng m2/f2 vẽ riêng cho màn tự tạo: áo xanh lá, quần xanh dương, tóc nâu đậm ngắn để tách vùng theo sắc màu.
OWN = {'m2', 'f2'}
def src_dir(key):
    return ROOT / ('assets/creator_bases' if key in OWN else 'assets/characters') / BASES[key]


def hsl(rgb):
    x = rgb.astype(float) / 255
    mx, mn = x.max(-1), x.min(-1)
    l = (mx + mn) / 2
    d = mx - mn
    with np.errstate(divide='ignore', invalid='ignore'):
        s = np.where(d == 0, 0, d / (1 - np.abs(2 * l - 1) + 1e-9))
        r, g, b = x[..., 0], x[..., 1], x[..., 2]
        h = np.zeros_like(l)
        rm = (d > 0) & (mx == r); gm = (d > 0) & (mx == g) & ~rm; bm = (d > 0) & ~rm & ~gm
        h[rm] = ((g - b)[rm] / d[rm]) % 6
        h[gm] = (b - r)[gm] / d[gm] + 2
        h[bm] = (r - g)[bm] / d[bm] + 4
    return h * 60, s, l


def majority(lab, classes, radius):
    """Pixels labelled with one of `classes` take the most common of those labels around them."""
    k = np.ones((2 * radius + 1, 2 * radius + 1))
    counts = [ndi.convolve((lab == c).astype(float), k, mode='constant') for c in classes]
    best = np.array(classes)[np.argmax(np.stack(counts), 0)]
    sel = np.isin(lab, classes)
    out = lab.copy(); out[sel] = best[sel]
    return out


def drop_small(lab, cls, min_area, keep_largest=True):
    comp, n = ndi.label(lab == cls, structure=np.ones((3, 3)))
    if not n:
        return lab
    areas = ndi.sum(np.ones_like(comp), comp, range(1, n + 1))
    big = int(np.argmax(areas)) + 1
    out = lab.copy()
    for i, a in enumerate(areas, 1):
        if a < min_area and not (keep_largest and i == big):
            out[comp == i] = KEEP
    return out


def classify(base, rgba):
    h, s, l = hsl(rgba[..., :3]); a = rgba[..., 3] > 0
    lab = np.zeros(a.shape, np.uint8)
    warm = (h < 40) | (h > 330)
    if base == 'm':   # áo sơ mi trắng sọc xanh nhạt, quần đen, tóc nâu đậm
        lab[a & warm & (s >= .12) & (s < .65) & (l >= .07) & (l < .45)] = HAIR
        lab[a & (s < .12) & (l >= .07) & (l < .5)] = BOTTOM
        lab[a & (((l >= .62) & (s < .35)) | ((h >= 185) & (h <= 260) & (l >= .55)))] = TOP
    else:             # sơ mi xanh lavender nhạt, quần jeans xanh, tóc nâu dài
        lab[a & warm & (s >= .12) & (s < .65) & (l >= .07) & (l < .5)] = HAIR
        blue = a & (h >= 185) & (h <= 275) & (s >= .08) & (l >= .3)
        # Áo xanh lavender ngả tím (hue ≈ 224, bão hoà cao); jeans ngả lam (hue ≈ 210): tách theo sắc, không theo độ sáng.
        lab[blue & ((h >= 217) | ((s > .7) & (l > .8)))] = TOP
        lab[blue & ~((h >= 217) | ((s > .7) & (l > .8)))] = BOTTOM
    lab[a & (h >= 8) & (h < 34) & (l >= .58) & (l < .93) & (s > .35)] = SKIN
    return lab


def classify_own(rgba):
    # Áo xanh lá thuần, quần xanh dương: tách theo sắc, không cần lấy đa số lân cận.
    h, s, l = hsl(rgba[..., :3]); a = rgba[..., 3] > 0
    lab = np.zeros(a.shape, np.uint8)
    warm = (h < 40) | (h > 330)
    lab[a & warm & (s >= .1) & (s < .75) & (l >= .06) & (l < .5)] = HAIR
    lab[a & (h >= 75) & (h <= 170) & (s >= .18) & (l >= .08) & (l <= .85)] = TOP
    lab[a & (h >= 195) & (h <= 255) & (s >= .18) & (l >= .08) & (l <= .88)] = BOTTOM
    lab[a & (h >= 8) & (h < 38) & (l >= .55) & (l < .94) & (s > .3)] = SKIN
    return lab


def clean(base, lab):
    if base in OWN:
        pass
    elif base == 'm':
        lab = majority(lab, [HAIR, BOTTOM], 3)
    else:
        lab = majority(lab, [TOP, BOTTOM], 2)
        lab = majority(lab, [TOP, BOTTOM], 2)
    lab = drop_small(lab, HAIR, 60)          # thắt lưng, viền nâu nhỏ
    lab = drop_small(lab, TOP, 14)           # mắt trắng, nước mắt, lấp lánh
    lab = drop_small(lab, BOTTOM, 14)
    lab = drop_small(lab, SKIN, 6, keep_largest=False)
    # Khói xám (ảnh bốc cháy) cùng tông với quần đen: mảng "quần" nằm cao hơn tâm vùng tóc thì giữ nguyên.
    hy = np.where(lab == HAIR)[0]
    if len(hy):
        comp, n = ndi.label(lab == BOTTOM, structure=np.ones((3, 3)))
        for i in range(1, n + 1):
            if np.where(comp == i)[0].mean() < hy.mean():
                lab[comp == i] = KEEP
    return shoes_keep(lab)


def shoes_keep(lab):
    # Giày: mảng "áo" (không phải mảng lớn nhất) nằm thấp hơn tâm vùng quần thì giữ nguyên.
    ys = np.where(lab == BOTTOM)[0]
    if len(ys):
        comp, n = ndi.label(lab == TOP, structure=np.ones((3, 3)))
        if n:
            areas = ndi.sum(np.ones_like(comp), comp, range(1, n + 1)); big = int(np.argmax(areas)) + 1
            for i in range(1, n + 1):
                yy = np.where(comp == i)[0]
                if i != big and yy.mean() > ys.mean():
                    lab[comp == i] = KEEP
    return lab


def fill_edges(rgb, alpha, lab, passes=10):
    """Điểm ảnh chuyển tiếp chưa thuộc vùng nào (mép da–tóc, nếp áo sáng, đường may quần) nhận vùng lân cận
    nếu màu đủ gần màu trung bình của vùng đó. Viền đen, mắt, miệng, khuyên tai, giày trắng, lửa giữ nguyên."""
    rgbf = rgb.astype(float); lum = rgbf @ [.299, .587, .114]
    # So màu trong không gian Lab, giảm trọng số độ sáng: viền tối của da vẫn cùng sắc với da.
    L = rgb2lab(rgb.astype(np.uint8)) * [0.35, 1, 1]
    means, tol = {}, {}
    for r in (SKIN, HAIR, TOP, BOTTOM):
        sel = lab == r
        if sel.sum() < 10:
            continue
        mu = L[sel].mean(0); d = np.linalg.norm(L[sel] - mu, axis=1)
        means[r] = mu; tol[r] = float(np.percentile(d, 95)) * 1.25 + 6
    k = np.ones((5, 5))
    mx, mn = rgbf.max(-1), rgbf.min(-1)
    whiteish = (lum > 200) & (mx - mn < 40)   # giày trắng, lòng trắng mắt: không nhập vào quần hay da
    for _ in range(passes):
        cand = alpha & (lab == KEEP) & (lum > 38)
        if not cand.any():
            break
        best = np.zeros(lab.shape, np.uint8); bestd = np.full(lab.shape, 1e9)
        for r, mu in means.items():
            near = ndi.convolve((lab == r).astype(float), k, mode='constant') >= 2
            d = np.linalg.norm(L - mu, axis=-1)
            ok = cand & near & (d <= tol[r]) & (d < bestd)
            if r in (SKIN, BOTTOM):
                ok &= ~whiteish
            best[ok] = r; bestd[ok] = d[ok]
        if not best.any():
            break
        lab = np.where(best > 0, best, lab).astype(np.uint8)
    return lab


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    layout = {'bases': {}, 'regions': {'skin': SKIN, 'hair': HAIR, 'top': TOP, 'bottom': BOTTOM}, 'scale': 50}
    previews = []
    for key, base in BASES.items():
        (OUT / base).mkdir(exist_ok=True)
        lum = {r: [] for r in (SKIN, HAIR, TOP, BOTTOM)}
        sheets = []
        for sheet, (fw, fh) in SHEETS.items():
            path = src_dir(key) / f'hd_{sheet}.png'
            if not path.exists():
                continue   # dáng riêng chưa có ảnh bốc cháy: game vẽ dáng đứng + lửa
            sheets.append(sheet)
            im = np.array(Image.open(path).convert('RGBA'))
            mask = np.zeros(im.shape[:2], np.uint8)
            for y0 in range(0, im.shape[0], fh):
                for x0 in range(0, im.shape[1], fw):
                    fr = im[y0:y0 + fh, x0:x0 + fw]
                    lab = clean(key, classify_own(fr) if key in OWN else classify(key, fr))
                    mask[y0:y0 + fh, x0:x0 + fw] = shoes_keep(fill_edges(fr[..., :3], fr[..., 3] > 0, lab))
            Image.fromarray(mask * layout['scale']).save(OUT / base / f'{sheet}.png')
            y = im[..., :3].astype(float) @ [.299, .587, .114]
            for r in lum:
                lum[r].append(y[mask == r])
            previews.append((key, sheet, im, mask))
        stats = {}
        for r, parts in lum.items():
            v = np.concatenate(parts)
            stats[str(r)] = [round(float(np.percentile(v, q)), 1) for q in (3, 50, 97)] if len(v) else [0, 128, 255]
        layout['bases'][key] = {'char': base, 'lum': stats, 'sheets': sheets, **({'own': True} if key in OWN else {})}
    (OUT / 'layout.json').write_text(json.dumps(layout, indent=1))
    # Ảnh kiểm tra: hàng trên ảnh gốc, hàng dưới tô màu rực theo vùng.
    test = {SKIN: (120, 70, 40), HAIR: (40, 200, 90), TOP: (220, 40, 40), BOTTOM: (240, 200, 30)}
    rows = []
    for key, sheet, im, mask in previews:
        tinted = im.copy()
        for r, c in test.items():
            sel = mask == r
            y = im[..., :3].astype(float) @ [.299, .587, .114]
            f = np.clip(y / 200, .35, 1.2)[..., None]
            tinted[sel, :3] = np.clip(np.array(c) * f[sel], 0, 255)
        both = np.concatenate([im, tinted], 0)
        rows.append(Image.fromarray(both))
    W = sum(r.width for r in rows) ; H = max(r.height for r in rows)
    sheet = Image.new('RGBA', (W, H), (235, 225, 200, 255)); x = 0
    for r in rows:
        sheet.alpha_composite(r, (x, 0)); x += r.width
    sheet.save(OUT / 'preview.png')
    print(json.dumps(layout['bases'], indent=1))


if __name__ == '__main__':
    run()
