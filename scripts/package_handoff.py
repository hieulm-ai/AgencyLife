"""Package editable sources and runnable game without caches or previous archives."""
from pathlib import Path
import hashlib
import json
import os
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'game/asset-manifest.json').read_text())
files = set()
for folder in ('source', 'assets', 'scripts', 'tests'):
    for path in (ROOT / folder).rglob('*'):
        if path.is_file() and not path.is_symlink() and not any(
            part.startswith('.') or part == '__pycache__' for part in path.relative_to(ROOT).parts
        ) and path.suffix != '.pyc':
            files.add(path)
files.update(ROOT.glob('*.md'))
files.add(ROOT / 'requirements.txt')
files.update(ROOT / 'game' / name for name in ['index.html', 'asset-manifest.json'])
for item in manifest:
    path = ROOT / 'game' / item['path']
    if not path.resolve().is_relative_to((ROOT / 'game').resolve()):
        raise ValueError('Asset outside game directory')
    if path.stat().st_size != item['bytes']:
        raise ValueError(f'Stale manifest: {path}')
    files.add(path)
if not (ROOT / 'NEXT_STEPS.md').is_file():
    raise ValueError('NEXT_STEPS.md is required')
output = ROOT / 'releases/5bit-agency-tycoon-handoff.zip'
output.parent.mkdir(exist_ok=True)
temporary = output.with_suffix('.zip.tmp')
try:
    with zipfile.ZipFile(temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(files):
            archive.write(path, '5bit-agency-tycoon/' + path.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None:
            raise ValueError('ZIP verification failed')
    os.replace(temporary, output)
finally:
    temporary.unlink(missing_ok=True)
checksum = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix('.sha256').write_text(checksum + '  ' + output.name + '\n')
print(f'{output}: {len(files)} files, {output.stat().st_size:,} bytes; SHA256 {checksum}')
