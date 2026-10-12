import json, glob, numpy as np, sys, os
from PIL import Image
sys.path.insert(0,'/home/claude/rb'); from rebuild_funcs import hard, down
src3=open('/home/claude/rb/fix3.py').read(); exec("def contour"+src3.split("def contour")[1].split("def renorm")[0], globals())
def slopes(a):
    bot=contour(a); yb=bot.max(); xb=int(np.median(np.nonzero(bot>=yb-2)[0])); return side_slope(bot,xb,-1), side_slope(bot,xb,1)
def deskew2(im):
    a=np.array(im); al=a[:,:,3]>0; bot=contour(al); yb=bot.max(); xb=int(np.median(np.nonzero(bot>=yb-2)[0]))
    sL=side_slope(bot,xb,-1); sR=side_slope(bot,xb,1); sL=sL if 0.4<=sL<=0.75 else 0.5; sR=sR if 0.4<=sR<=0.75 else 0.5
    H,W=al.shape; dy=np.array([(sL-0.5)*(xb-x) if x<xb else (sR-0.5)*(x-xb) for x in range(W)])
    off=-min(0,dy.min()); out=np.zeros((int(H+off+max(0,dy.max())+2),W,4),np.uint8)
    for x in range(W): s_=int(round(dy[x]+off)); out[s_:s_+H,x]=a[:,x]
    return hard(Image.fromarray(out))
# id, khóa manifest, footprint rot0, cách co (fp / ('h',px)), lớp, căn
ITEMS={'dc73a4c6':('furniture/work_desk',(2,1),'fp','object','corner'),
 '7001f60b':('special/premium_coffee',(1,1),'fp','object','corner'),
 '54d0cf92':('special/ergo_chair',(1,1),('h',28),'object','corner'),
 'e9b56d20':('special/cat_house',(1,1),('h',38),'object','corner'),
 'f86970cc':('special/aquarium',(2,1),'fp','object','center'),
 'd5e0fa45':('special/big_tree',(1,1),('h',56),'object','corner')}
QUAD={'01_front_left':(0,0),'02_front_right':(1,0),'03_back_right':(1,1),'04_back_left':(0,1)}
B=json.load(open('/home/claude/rb/out/_build.json')); M=B['manifest']; OUT='/home/claude/rb/out'; rep=[]
for f in glob.glob('/home/claude/a7/**/hf_*.png',recursive=True):
    j=f.split('_')[-1][:8]; key,(W0,D0),fit,layer,al=ITEMS[j]; S=W0+D0; im=Image.open(f).convert('RGBA')
    it=M['items'].get(key) or {'category':key.split('/')[0],'layer':layer,'blocking':True,'seats':0,'footprint_rot0':[W0,D0],'views':{}}
    M['items'][key]=it; os.makedirs(f'{OUT}/{key}',exist_ok=True); os.makedirs(f'/home/claude/itemhd/{key}',exist_ok=True)
    for r,(v,(qx,qy)) in enumerate(QUAD.items()):
        q=hard(im.crop((qx*512,qy*512,qx*512+512,qy*512+512))); b0=slopes(np.array(q)[:,:,3]>0)
        if key!='special/big_tree': q=deskew2(q)
        a=np.array(q)[:,:,3]>0; H,Wd=a.shape; ys,xs=np.nonzero(a); yb=ys.max(); xb=float(np.median(xs[ys>=yb-2]))
        low=a[int(yb-0.45*H):yb+1]; cols=np.nonzero(low.any(0))[0]; L,R=cols.min(),cols.max(); base=R-L+1
        if W0!=D0: Wn=int(min(S-1,max(1,round(S*(xb-L)/base)))); Dn=S-Wn
        else: Wn,Dn=W0,D0
        s=(fit[1]/H) if fit!='fp' else S*16/base; tw,th=max(1,round(Wd*s)),max(1,round(H*s))
        down(q,tw,th).save(f'{OUT}/{key}/{v}.png')
        hd=q.resize((tw*3,th*3),Image.LANCZOS); b=np.array(hd); b[:,:,3]=np.where(b[:,:,3]>=100,255,0); Image.fromarray(b).save(f'/home/claude/itemhd/{key}/{v}.png')
        ax=int(round(tw/2+(Wn-Dn)*8)) if al=='center' else int(round(xb*s))
        it['views'][v]={'file':f'{v}.png','size':[tw,th],'footprint':[Wn,Dn],'anchor':[ax,th-1],'scale_from_src':round(s,4),'align':al,'source':'higgsfield_v3'}
        b1=slopes(a); rep.append((key,v[:2],[round(x,2) for x in b0],[round(x,2) for x in b1],[Wn,Dn],[tw,th]))
json.dump(B,open('/home/claude/rb/out/_build.json','w'),ensure_ascii=False,indent=1)
for r in sorted(rep): print(r)
