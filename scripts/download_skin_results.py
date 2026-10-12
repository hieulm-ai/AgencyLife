"""Download only completed, recorded Higgsfield jobs; never submit generations."""
import json
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'assets/skins/streetwear'

def download(job):
    if job.get('status') != 'completed' or not job.get('result_url'):
        return
    target = ROOT / job['character'] / (job['sheet'] + '_raw.png')
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        tmp = target.with_suffix('.tmp')
        urllib.request.urlretrieve(job['result_url'], tmp)
        with Image.open(tmp) as image:
            image.verify()
        tmp.replace(target)
    print(job['character'], job['sheet'], target.stat().st_size)

if __name__ == '__main__':
    state = json.loads((ROOT / 'generation.json').read_text())
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(download, state['jobs']))
