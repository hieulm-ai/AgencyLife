"""Mô phỏng nhịp lên cấp agency theo XP (15/10/2026).

Dựa trên scripts/economy_v19.py (throughput đo được, 200 năng lượng/ngày thật).
Cấp agency tính bằng XP từ job; khu đất cần tiền + cấp tối thiểu (ZONE_LV).
Chỉ là ước tính để chọn hằng số, không thay dữ liệu người chơi thật.
Chạy: python3 -I scripts/economy_xp.py [--a 20]   (đã chọn a = 20, p = 1,5)
"""
import argparse, json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import economy_v19 as E  # noqa: E402

ZONE_LV = [1, 3, 5, 7, 9, 11, 13, 15, 18, 21, 24, 27]   # khu thứ k (1 = văn phòng gốc) mở từ cấp này
XP_PER_HOUR = 0.75                                        # XP mỗi job = 0.75 × giờ công


def need(n, a, p):            # XP cần để từ cấp n lên n+1
    return round(a * n ** p)


def run(minutes, sessions, a, p, days=400):
    zones, cash, revenue, game_days, lv, xp = 1, 200., 0., 0., 1, 0.
    reach = {}
    for day in range(1, days + 1):
        used = 0.
        for s in range(sessions):
            if game_days:
                cash += revenue / game_days * min(8, (1440 - minutes) / sessions / 60) * .5 * .25
            workers = min(13, 3 + (zones - 1) * 2)
            duration = minutes / sessions / 13
            cap = duration * E.throughput(workers)
            energy = min(200 - used, 120 + (minutes / sessions) * 60 / 90)
            jobs = min(cap, energy / (E.AVG_NEED / 2))
            used += jobs * E.AVG_NEED / 2
            inc = jobs * E.AVG_BASE_REWARD * 5 * 1.45 ** (zones - 1)
            cash += inc; revenue += inc; game_days += duration
            xp += jobs * E.AVG_NEED * XP_PER_HOUR
            while lv < 30 and xp >= need(lv, a, p):
                xp -= need(lv, a, p); lv += 1; reach.setdefault(lv, day)
            while zones < 12 and lv >= ZONE_LV[zones] and cash >= 500 * 2 ** (zones - 1):
                cash -= 500 * 2 ** (zones - 1) + 60; zones += 1
    return {k: reach.get(k) for k in (3, 5, 9, 15, 21, 30)}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--a', type=float, default=20); ap.add_argument('--p', type=float, default=1.5)
    g = ap.parse_args()
    out = {f'{m}p/{s}': run(m, s, g.a, g.p) for m, s in [(30, 1), (90, 2), (180, 3)]}
    print(json.dumps({'a': g.a, 'p': g.p, 'day_reached': out}, ensure_ascii=False))
