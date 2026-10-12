"""Make only the edge-connected background transparent; preserve enclosed whites."""
from pathlib import Path
from PIL import Image, ImageSequence
from collections import deque
import numpy as np
root=Path(__file__).resolve().parents[1]
src=Image.open(root/'assets/loading/vu-a-vu.gif')
frames=[];durations=[]
for frame in ImageSequence.Iterator(src):
    rgb=frame.convert('RGB');a=np.array(rgb);h,w=a.shape[:2]
    bg=a[0,0].astype(int)
    match=np.max(np.abs(a.astype(int)-bg),axis=2)<=6
    mask=np.zeros((h,w),dtype=bool);q=deque()
    for x in range(w):
        for y in (0,h-1):
            if match[y,x] and not mask[y,x]:mask[y,x]=True;q.append((x,y))
    for y in range(h):
        for x in (0,w-1):
            if match[y,x] and not mask[y,x]:mask[y,x]=True;q.append((x,y))
    while q:
        x,y=q.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0<=nx<w and 0<=ny<h and match[ny,nx] and not mask[ny,nx]:mask[ny,nx]=True;q.append((nx,ny))
    # Reserve palette entry 255 for transparency, preserving enclosed speech bubble and shirt.
    p=rgb.quantize(colors=255);indices=np.array(p);indices[mask]=255
    out=Image.fromarray(indices,'P');palette=p.getpalette()[:765];palette+= [0]*(768-len(palette));out.putpalette(palette)
    out.info['transparency']=255
    frames.append(out);durations.append(frame.info.get('duration',180))
dest=root/'assets/loading/vu-a-vu-transparent.gif'
frames[0].save(dest,save_all=True,append_images=frames[1:],duration=durations,loop=0,transparency=255,disposal=2,optimize=False)
check=Image.open(dest)
assert check.n_frames==src.n_frames
for f in ImageSequence.Iterator(check):assert f.convert('RGBA').getpixel((0,0))[3]==0
print(f'{check.n_frames} frames; timing {durations}; transparent corners verified')
