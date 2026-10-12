"""Create a portable release with exactly the assets referenced by the current build."""
import json,zipfile,hashlib
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'game'
manifest=json.loads((GAME/'asset-manifest.json').read_text())
paths=['index.html','asset-manifest.json']+[item['path'] for item in manifest]
for item in manifest:
    path=GAME/item['path']
    if path.stat().st_size!=item['bytes']:raise ValueError(f'Stale manifest: {path}')
    with Image.open(path) as image:image.verify()
output=ROOT/'releases';output.mkdir(exist_ok=True)
destination=output/'5bit-agency-tycoon-playtest.zip'
with zipfile.ZipFile(destination,'w',zipfile.ZIP_DEFLATED) as archive:
    for name in paths:archive.write(GAME/name,'5bit-agency-tycoon/'+name)
    archive.write(ROOT/'PLAYTEST_GUIDE.md','5bit-agency-tycoon/PLAYTEST_GUIDE.md')
    archive.writestr('5bit-agency-tycoon/START_HERE.txt','Agency\'s Life Tycoon - Playtest\n\nExtract the whole folder, including assets.\nIn this folder run: python3 -m http.server 8765 --bind 127.0.0.1\nOpen http://127.0.0.1:8765/index.html\n\nNew games start with 3 staff. Existing saves retain their roster.\nMusic and rain: Settings. Skins: Shop. News: envelope. Reputation: crown. Weekly pass: gift.\nSave data lives in this browser for this site address; it is not bundled in the ZIP.\n')
with zipfile.ZipFile(destination) as archive:
    assert archive.testzip() is None
checksum=hashlib.sha256(destination.read_bytes()).hexdigest()
(destination.with_suffix('.sha256')).write_text(checksum+'  '+destination.name+'\n')
print(f'{destination}: {destination.stat().st_size:,} bytes; {len(manifest)} verified assets; SHA256 {checksum}')
