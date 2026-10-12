"""Pack approved furniture art into runtime layers; keep generated originals intact."""
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/seating_v2'
ROT=['01_front_left','02_front_right','03_back_right','04_back_left']
M=json.loads((ROOT/'source/asset_manifest_build.json').read_text())['manifest']
CS=json.loads((ROOT/'source/seat_layers.json').read_text())['office_chair_blue']
def cell(raw,i):
    w,h=raw.size
    im=raw.crop((i%2*w//2,i//2*h//2,(i%2+1)*w//2,(i//2+1)*h//2)).convert('RGBA')
    a=np.array(im);a[:,:,3]=np.where(a[:,:,3]>=230,255,0)
    im=Image.fromarray(a);return im.crop(im.getbbox())
def canvas(size):return Image.new('RGBA',tuple(n*3 for n in size))
def put(out,im,xy,size):out.alpha_composite(im.resize(tuple(n*3 for n in size),Image.Resampling.LANCZOS),tuple(n*3 for n in xy))
def chair(out,s):
    ri=['SW','SE','NE','NW'].index(s['face']);name=ROT[ri]
    v=M['items']['furniture/office_chair_blue']['views'][name];hip=CS[name]['seats'][0]
    im=Image.open(ROOT/'assets/items_hd3x/furniture/office_chair_blue'/f'{name}.png').resize(tuple(n*3 for n in v['size']),Image.Resampling.LANCZOS)
    out.alpha_composite(im,(round((s['cx']-hip['cx'])*3),round((s['cy']-hip['cy'])*3)))
layout={}
raw=Image.open(OUT/'round-table-raw.png')
layout['round_table']=[]
for i,name in enumerate(ROT):
    size=[80,80];table=canvas(size)
    full=cell(raw,i).resize((144,132),Image.Resampling.LANCZOS)
    short=Image.new('RGBA',(144,108));short.alpha_composite(full.crop((0,0,144,72)));short.alpha_composite(full.crop((0,72,144,132)).resize((144,36),Image.Resampling.LANCZOS),(0,72))
    put(table,short,(16,26),(48,36))
    table.save(OUT/f'round-{name}-table.png')
    seats=[dict(cx=18,cy=38,face='SE',z='before'),dict(cx=62,cy=38,face='SW',z='before'),dict(cx=18,cy=58,face='NE',z='after'),dict(cx=62,cy=58,face='NW',z='after')]
    preview=canvas(size)
    for s in seats[:2]:chair(preview,s)
    preview.alpha_composite(table)
    for s in seats[2:]:chair(preview,s)
    preview.save(OUT/f'round-{name}-preview.png')
    layout['round_table'].append(dict(size=size,anchor=[40,72],fp=[2,2],seatsPx=seats,separateChairs=True))
raw=Image.open(OUT/'sofa-raw.png');layout['sofa_blue']=[]
for i,name in enumerate(ROT):
    size=[72,60];im=cell(raw,i);base=canvas(size)
    put(base,im,(8,10 if i<2 else 14),(56,44 if i<2 else 40))
    base.save(OUT/f'sofa-{name}-preview.png')
    near=canvas(size)
    if i<2:
        # Only the foreground armrest belongs in front of the seated figures.
        poly=[(133,109),(184,82),(191,86),(191,162),(133,162)] if i==0 else [(24,82),(30,82),(81,109),(82,162),(24,162)]
        mask=Image.new('L',base.size);ImageDraw.Draw(mask).polygon(poly,fill=255)
        near=base.copy();near.putalpha(Image.fromarray(np.minimum(np.array(base.getchannel('A')),np.array(mask))))
        positions=[(25,27),(45,37)] if i==0 else [(27,37),(47,27)]
    else:
        near=base.copy()
        positions=[(26,24),(46,34)] if i==2 else [(26,34),(46,24)]
    base.save(OUT/f'sofa-{name}-base.png');near.save(OUT/f'sofa-{name}-near.png')
    layout['sofa_blue'].append(dict(size=size,anchor=[48 if i%2==0 else 24,55],fp=[2,1] if i%2==0 else [1,2],sofaLayers=True,seatsPx=[dict(cx=x,cy=y,face=['SW','SE','NE','NW'][i],z='after') for x,y in positions]))
(OUT/'layout.json').write_text(json.dumps(layout,indent=2))
print('Packed four round tables and four layered sofas')
# Approved replacement: generate the two opposing directions by exact mirroring.
from PIL import ImageOps
from prepare_skins import cells, fit_cell, head_width, clean, atlas
pali=OUT/'pali-ergo-v2-raw.png'
if pali.exists():
    frames=cells(pali,2,2)
    ref=clean(Image.open(ROOT/'assets/skins/streetwear/03_Pali/hd_walk.png')).crop((96,0,192,128));ref=ref.crop(ref.getbbox())
    ordered=[]
    for row in range(2):
        front,back=frames[row],frames[2+row]
        ordered.extend([front,ImageOps.mirror(front),ImageOps.mirror(back),back])
    atlas([fit_cell(im,(144,224),head_width(ref)) for im in ordered],4,2,(144,224),OUT/'pali-ergo.png')
