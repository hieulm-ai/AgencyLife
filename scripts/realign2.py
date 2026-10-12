"""Căn lại đồ vật theo mặt sàn (bản 2).
- Bề rộng đế = phần ảnh ở 45% chiều cao phía dưới (bỏ lá cây, đồ trang trí chìa ra ở phía trên).
- Điểm neo = góc trước đo thật trong ảnh (điểm thấp nhất), không dùng tỉ lệ lý thuyết.
- Giữ nguyên footprint đã chốt (bàn họp cố định 4×2)."""
import json, numpy as np
from PIL import Image
from rebuild_funcs import hard, down
SRC='/home/claude/rb/src'; OUT='/home/claude/rb/out'
DIRS={'furniture':'5bit_4_goc_furniture_v2/furniture','props':'5bit_4_goc_props_v2/props','architecture':'nhi/architecture'}
ROT=["01_front_left","02_front_right","03_back_right","04_back_left"]
SPEC_FIT={}   # lấy lại chế độ co từ rebuild.py
exec(open('/home/claude/rb/rebuild.py').read().split('DIRS=')[0].split('ROT=')[1].split('\n',1)[1])
for cat,items in SPEC.items():
    for name,sp in items.items(): SPEC_FIT[f'{cat}/{name}']=sp
B=json.load(open(f'{OUT}/_build.json')); M=B['manifest']; log=[]
for key,it in M['items'].items():
    if it['layer'] not in ('object','floor'): continue
    cat,name=key.split('/'); sp=SPEC_FIT[key]; fit=sp[2]; W0,D0=sp[0],sp[1]
    for r,v in enumerate(ROT):
        vv=it['views'][v]; im=hard(Image.open(f'{SRC}/{DIRS[cat]}/{name}/{v}.png'))
        a=np.array(im)[:,:,3]>0; H,Wd=a.shape; ys,xs=np.nonzero(a); yb=ys.max()
        xb=float(np.median(xs[ys>=yb-2]))
        low=a[int(yb-0.45*H):yb+1]; cols=np.nonzero(low.any(0))[0]; L,R=cols.min(),cols.max()
        W,D=vv['footprint']
        if fit=='fp': s=(W+D)*16/max(1,(R-L+1))
        elif fit[0]=='h': s=fit[1]/im.height
        else: s=fit[1]/im.width
        tw,th=max(1,round(im.width*s)),max(1,round(im.height*s)); sm=down(im,tw,th); sm.save(f'{OUT}/{key}/{v}.png')
        ax=int(round(xb*s)); ay=th-1
        old=vv['anchor'],vv['size']
        vv.update({'size':[tw,th],'anchor':[ax,ay],'scale_from_src':round(s,4)})
        if abs(old[0][0]-ax)>=3 or abs(old[1][0]-tw)>=3: log.append(f'{key} {v}: neo x {old[0][0]}→{ax}, cỡ {old[1]}→{[tw,th]}')
json.dump(B,open(f'{OUT}/_build.json','w'),ensure_ascii=False,indent=1)
open(f'{OUT}/_realign_log.txt','w').write('\n'.join(log)); print(len(log)); print('\n'.join(log))
