"""Pack table-only Higgsfield art and six independent chair placements."""
import json
from pathlib import Path
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/meeting_separate'
raw=Image.open(OUT/'table-raw.png').convert('RGBA')
rotations=['01_front_left','02_front_right','03_back_right','04_back_left']
manifest=json.loads((ROOT/'source/asset_manifest_build.json').read_text())['manifest']
chair_seats=json.loads((ROOT/'source/seat_layers.json').read_text())['office_chair_blue']
views=[]
for i,rot in enumerate(rotations):
    cell=raw.crop(((i%2)*1024,(i//2)*1024,(i%2+1)*1024,(i//2+1)*1024))
    # Discard the generated soft halo; retain solid sprite pixels and crisp edges.
    a=np.array(cell);a[:,:,3]=np.where(a[:,:,3]>=230,255,0);cell=Image.fromarray(a)
    cell=cell.crop(cell.getbbox()).resize((204,153),Image.Resampling.LANCZOS)
    table=Image.new('RGBA',(288,240));table.alpha_composite(cell,(36,42));table.save(OUT/(rot+'-table.png'))
    odd=i%2
    seats=[]
    for side in ['before','after']:
        for n in range(3):
            x,y=(47+16*n,22+8*n) if side=='before' else (12+16*n,40+8*n)
            if odd:x=92-x
            face=('SE' if odd else 'SW') if side=='before' else ('NW' if odd else 'NE')
            seats.append(dict(cx=x,cy=y,face=face,z=side))
    preview=Image.new('RGBA',(288,240))
    def chairs(side):
        for seat in seats:
            if seat['z']!=side:continue
            cr=['SW','SE','NE','NW'].index(seat['face']);name=rotations[cr]
            cv=manifest['items']['furniture/office_chair_blue']['views'][name]
            hip=chair_seats[name]['seats'][0]
            chair=Image.open(ROOT/'assets/items_hd3x/furniture/office_chair_blue'/f'{name}.png').resize(tuple(n*3 for n in cv['size']),Image.Resampling.LANCZOS)
            preview.alpha_composite(chair,(round((seat['cx']-hip['cx'])*3),round((seat['cy']-hip['cy'])*3)))
    chairs('before');preview.alpha_composite(table);chairs('after');preview.save(OUT/(rot+'-preview.png'))
    views.append(dict(size=[96,80],anchor=[56,68],fp=[3,2],seatsPx=seats))
(OUT/'layout.json').write_text(json.dumps(views,indent=2))
(OUT/'generation.json').write_text(json.dumps({'job_id':'558add24-93d2-4f04-bbde-6dfa514e4a0c','model':'gpt_image_2_5','chair_source':'existing office_chair_blue four rotations','description':'Table-only sheet; six chairs instantiated independently at runtime.'},indent=2))
