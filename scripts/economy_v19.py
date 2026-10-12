"""Approximation grounded in current job templates and measured saturated throughput.

No purchases or ruby refills. 200 energy is shared across all sessions in a real
day. Offline revenue follows the game's capped average-income formula. This is
an estimate, not a replacement for multi-week player data.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / 'source/template.html').read_text()
raw = re.search(r'const JOB_TPL=(\[.*?\]);', text, re.S).group(1)
templates = json.loads(re.sub(r'//[^\n]*', '', raw))
AVG_NEED = sum(t[1] for t in templates) / len(templates)
AVG_BASE_REWARD = sum(t[2] for t in templates) / len(templates)
MEASURED = {3: 64/15, 6: 73/9, 9: 113/9}


def throughput(workers):
    # Interpolate measured teams; conservatively keep 9-person capacity above 9.
    if workers <= 3:
        return MEASURED[3] * workers / 3
    if workers >= 9:
        return MEASURED[9]
    low = 3 if workers <= 6 else 6
    return MEASURED[low] + (workers-low)/3*(MEASURED[low+3]-MEASURED[low])


def run(minutes, sessions=1, reward_scale=1, days=180):
    level, cash, revenue, game_days, week_jobs = 1, 200., 0., 0., 0.
    milestones = {}
    for day in range(1, days+1):
        used = 0.
        for session in range(sessions):
            if game_days:
                gap = (1440-minutes)/sessions/60
                cash += revenue/game_days * min(8, gap)*.5*.25
            workers = min(13, 3+(level-1)*2)
            duration = minutes/sessions/13  # 08:00–21:00, 1 sec = 1 game minute
            capacity = duration*throughput(workers)
            # Energy starts full after the gap and regenerates 1 per 90 seconds.
            energy = min(200-used, 120+(minutes/sessions)*60/90)
            jobs = min(capacity, energy/(AVG_NEED/2))
            used += jobs*AVG_NEED/2
            income = jobs*AVG_BASE_REWARD*5*1.45**(level-1)*reward_scale
            cash += income
            revenue += income
            week_jobs += jobs
            before = game_days
            game_days += duration
            if int(game_days//7) > int(before//7):
                if level >= 4 and week_jobs >= 10:
                    cash += .25*500*2**(level-1)
                week_jobs = 0
            while level < 12 and cash >= 500*2**(level-1):
                cash -= 500*2**(level-1)
                level += 1
                # Budget extra workers, desks, chairs and one amenity per plot.
                cash -= 60
                milestones[level] = day
        if level == 12:
            break
    return {'minutes_per_real_day': minutes, 'sessions': sessions,
            'last_level': level, 'days_to_all_plots': milestones.get(12),
            'unlock_days': milestones}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = {'assumptions': ['Full job queue and appropriate staff/furniture',
        'Measured 3/6/9-worker throughput; capped at 9-worker result beyond 9',
        '200 energy per real day; no ruby purchases',
        'No studio/workshop/template income; no refunds or retainer purchases',
        'Average of all 10 job templates; measured queue used 3 simple templates'],
        'average_need': AVG_NEED, 'average_base_reward': AVG_BASE_REWARD,
        'profiles': [run(30), run(90, 2), run(180, 3)]}
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    print(rendered)
    if args.output:
        args.output.write_text(rendered)
