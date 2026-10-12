"""Normalize recorded Streetwear atlases to the existing game's sprite contract."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SKINS = ROOT / 'assets/skins/streetwear'

def clean(im):
    a = np.array(im.convert('RGBA'))
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    return Image.fromarray(a)

def cells(path, cols, rows):
    im = clean(Image.open(path))
    out = []
    for row in range(rows):
        for col in range(cols):
            part = im.crop((round(col*im.width/cols), round(row*im.height/rows),
                            round((col+1)*im.width/cols), round((row+1)*im.height/rows)))
            # Some generated rows spill a few shoe pixels into the following
            # cell. Keep the main vertical band, not those detached remnants.
            a=np.array(part); mass=(a[:,:,3]>0).sum(axis=1)
            occupied=np.flatnonzero(mass>2)
            bands=np.split(occupied,np.where(np.diff(occupied)>5)[0]+1)
            bands=[b for b in bands if len(b)]
            if bands:
                band=max(bands,key=lambda b:mass[b].sum())
                a[:band[0],:,3]=0; a[band[-1]+1:,:,3]=0
                part=Image.fromarray(a)
            box = part.getbbox()
            if not box:
                raise ValueError(f'Empty cell {row},{col}: {path}')
            out.append(part.crop(box))
    return out

def head_width(im):
    a = np.array(im)[:, :, 3] > 0
    # Upper third excludes shoulder/hand width in walking and seated poses.
    return max(np.count_nonzero(row) for row in a[:max(1,round(im.height*.32))])

def fit_cell(im, size, head, bottom=None, hip=False):
    w, h = size
    scale = min(head/max(1,head_width(im)), (w-8)/im.width, (h-4)/im.height)
    sprite = clean(im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))), Image.Resampling.LANCZOS))
    x = round((w-sprite.width)/2)
    y = round(94-sprite.height*.76) if hip else (h-2 if bottom is None else bottom)-sprite.height
    y = max(1,min(h-sprite.height-1,y))
    frame = Image.new('RGBA',size)
    frame.alpha_composite(sprite,(x,y))
    return frame

def atlas(frames, cols, rows, size, path):
    sheet = Image.new('RGBA',(cols*size[0],rows*size[1]))
    for i,im in enumerate(frames):
        sheet.alpha_composite(im,((i%cols)*size[0],(i//cols)*size[1]))
    sheet.save(path)

def prepare(folder):
    ref = clean(Image.open(ROOT/'assets/characters'/folder.name/'hd_walk.png')).crop((96,0,192,128))
    ref = ref.crop(ref.getbbox())
    head = head_width(ref)
    walk = cells(folder/'walk_raw.png',3,2)
    atlas([fit_cell(x,(96,128),head) for x in walk],3,2,(96,128),folder/'hd_walk.png')
    if not all((folder/(k+'_raw.png')).exists() for k in ('actions','blue','ergo')):
        return False
    actions = cells(folder/'actions_raw.png',4,4)
    mapping = {'sit':[0,1,4,5], 'use':[2,3,6,7], 'talk':[8,9,12,13],
               'cele':[10,10,14,14], 'sad':[11,11,15,15]}
    for kind, indices in mapping.items():
        atlas([fit_cell(actions[i],(96,128),head,hip=kind=='sit') for i in indices],2,2,(96,128),folder/('hd_'+kind+'.png'))
    for kind in ('blue','ergo'):
        raw = cells(folder/(kind+'_raw.png'),4,2)
        # AI often duplicates left-facing views. Derive opposing views by exact
        # mirroring, matching the game's existing directional sprite convention.
        ordered=[]
        for row in range(2):
            front,back=raw[row*4],raw[row*4+3]
            ordered += [front,ImageOps.mirror(front),ImageOps.mirror(back),back]
        atlas([fit_cell(x,(144,224),head) for x in ordered],4,2,(144,224),folder/('hd_chair_'+kind+'.png'))
    return True

if __name__=='__main__':
    complete=[]
    folders=sorted(p for p in SKINS.iterdir() if p.is_dir() and (p/'walk_raw.png').exists())
    for folder in folders:
        if prepare(folder): complete.append(folder.name)
    (SKINS/'ready.json').write_text(json.dumps(complete,indent=2))
    # Contact sheet is also a visual QA artifact, using the exact game-sized sprites.
    contact=Image.new('RGB',(1000,3*220),(240,234,219)); draw=ImageDraw.Draw(contact)
    for i,folder in enumerate(folders):
        im=Image.open(folder/'hd_walk.png').crop((96,0,192,128)).resize((120,160),Image.Resampling.NEAREST)
        x=(i%5)*200; y=(i//5)*220
        contact.paste(im,(x+40,y+10),im)
        draw.text((x+15,y+180),folder.name,fill=(35,35,35))
    contact.save(SKINS/'contact-sheet.png')
    print(f'{len(complete)}/{len(folders)} complete skins')
