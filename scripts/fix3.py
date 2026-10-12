import json, numpy as np
from PIL import Image
from rebuild_funcs import hard, down
SRC='/home/claude/rb/src'; OUT='/home/claude/rb/out'; ROT=["01_front_left","02_front_right","03_back_right","04_back_left"]
D={'furniture':'5bit_4_goc_furniture_v2/furniture','props':'5bit_4_goc_props_v2/props'}
B=json.load(open(f'{OUT}/_build.json')); M=B['manifest']; log=[]
def contour(a):
    H,W=a.shape; return np.array([np.nonzero(a[:,x])[0].max() if a[:,x].any() else -1 for x in range(W)])
def side_slope(bot,xb,step):
    xs=list(range(xb+step,(-1 if step<0 else len(bot)),step)); xs=[x for x in xs if bot[x]>=0]
    n=len(xs); xs=np.array(xs[int(n*0.1):int(n*0.6)])
    return abs(np.polyfit(xs,bot[xs],1)[0]) if len(xs)>=5 else 0.5
def deskew(im):
    """Nắn xiên: dịch từng cột theo chiều dọc để hai cạnh đáy có độ dốc đúng 1:2 của lưới isometric."""
    a=np.array(im); al=a[:,:,3]>0; bot=contour(al); yb=bot.max(); xb=int(np.median(np.nonzero(bot>=yb-2)[0]))
    sL=side_slope(bot,xb,-1); sR=side_slope(bot,xb,1)
    sL=min(0.85,max(0.25,sL)); sR=min(0.85,max(0.25,sR))
    H,W=al.shape; dy=np.array([(sL-0.5)*(xb-x) if x<xb else (sR-0.5)*(x-xb) for x in range(W)])
    off=-min(0,dy.min()); newH=int(H+off+max(0,dy.max())+2); out=np.zeros((newH,W,4),np.uint8)
    for x in range(W):
        s=int(round(dy[x]+off)); out[s:s+H,x]=a[:,x]
    return hard(Image.fromarray(out)),round(sL,2),round(sR,2)
def renorm(key,deskew_on,W0=None,D0=None,center=False):
    cat,name=key.split('/'); it=M['items'][key]
    for r,v in enumerate(ROT):
        vv=it['views'][v]; im=hard(Image.open(f'{SRC}/{D[cat]}/{name}/{v}.png')); sl=sr=None
        if deskew_on: im,sl,sr=deskew(im)
        a=np.array(im)[:,:,3]>0; H,Wd=a.shape; ys,xs=np.nonzero(a); yb=ys.max(); xb=float(np.median(xs[ys>=yb-2]))
        low=a[int(yb-0.45*H):yb+1]; cols=np.nonzero(low.any(0))[0]; L,R=cols.min(),cols.max(); base=R-L+1
        if W0 is not None: W,Dd=(W0,D0) if r%2==0 else (D0,W0)
        else: W,Dd=vv['footprint']
        S=W+Dd
        if W!=Dd and not center:   # chọn W×D theo tỉ lệ thật của đế sau khi nắn
            Wn=int(min(S-1,max(1,round(S*(xb-L)/base)))); W,Dd=Wn,S-Wn
        s=S*16/base; tw,th=max(1,round(Wd*s)),max(1,round(H*s)); down(im,tw,th).save(f'{OUT}/{key}/{v}.png')
        ax=int(round(tw/2+(W-Dd)*8)) if center else int(round(xb*s))
        vv.update({'size':[tw,th],'footprint':[W,Dd],'anchor':[ax,th-1],'scale_from_src':round(s,4),'align':'center' if center else 'front_corner'})
        if deskew_on: vv['deskew']=[sl,sr]
        log.append(f'{key} {v}: fp {W}×{Dd}, cỡ {tw}×{th}'+(f', nắn dốc {sl}/{sr}→0.5' if deskew_on else ''))
for k in ['furniture/pantry_counter','props/decorative_blue_mark','props/water_dispenser','furniture/bookshelf','furniture/printer_cabinet','furniture/reception_counter']:
    renorm(k,True)
renorm('furniture/meeting_table',False,3,2,center=True)   # thu nhỏ bàn họp: 4×2 → 3×2 ô
json.dump(B,open(f'{OUT}/_build.json','w'),ensure_ascii=False,indent=1); print('\n'.join(log))
