from PIL import Image; import numpy as np, glob, json, os
from scipy import ndimage
K=4; CH='/home/claude/rb/out/characters'
WALK={'80c448ff':'02_Luwon','9d34e0b5':'03_Pali','95c68c3f':'04_Tamny','0e203168':'trinh_lac_corrected_v2','dc8b5d85':'06_Vu_a_Vu','8360c6a8':'07_Hao_Hao','4cb704e3':'08_Nganh','b1b0158e':'09_Vit_Vang','782a8f52':'10_Con_LT','b5ca89ea':'11_Juice','8cea20d4':'12_ADM','b38ca6a7':'13_AB','a330fc8b':'14_HM','d6c435ab':'15_CongB','dfde063e':'01_Huy'}
SIT={'66fd6450':'01_Huy','3d0be789':'02_Luwon','fba9b284':'03_Pali','405d605a':'04_Tamny','3fbef887':'trinh_lac_corrected_v2','0564d579':'06_Vu_a_Vu','414d93a8':'07_Hao_Hao','adfbb437':'08_Nganh','52b399a0':'09_Vit_Vang','4eca0024':'10_Con_LT','a74587e6':'11_Juice','9963a3de':'12_ADM','e5de9590':'13_AB','e8faf605':'14_HM','76161846':'15_CongB'}
USE={'97f9d49d':'01_Huy','1b003720':'02_Luwon','109847c4':'03_Pali','cf562170':'04_Tamny','095b14c8':'trinh_lac_corrected_v2','89759620':'06_Vu_a_Vu','7b7832a5':'07_Hao_Hao','15910d1e':'08_Nganh','ea9f46fc':'09_Vit_Vang','f4772fe8':'10_Con_LT','569f78d1':'11_Juice','5a0100c9':'12_ADM','f736c105':'13_AB','c51b7c88':'14_HM','cec597cc':'15_CongB'}
BURN={'2f7bcc66':'01_Huy','71f70921':'02_Luwon','98d3115b':'03_Pali','08d0746a':'04_Tamny','5bef3790':'trinh_lac_corrected_v2','e9837f8a':'06_Vu_a_Vu','1f676e4a':'07_Hao_Hao','1c7a66b9':'08_Nganh','1a10dd31':'09_Vit_Vang','4265b71b':'10_Con_LT','28d976fa':'11_Juice','804377cf':'12_ADM','4dbf36c8':'13_AB','680402b0':'14_HM','26613760':'15_CongB'}
FILES=glob.glob('/home/claude/cv3/hf_*.png')+glob.glob('/home/claude/sit/**/hf_*.png',recursive=True)+glob.glob('/home/claude/use/**/hf_*.png',recursive=True)+glob.glob('/home/claude/a2/hf_*.png')+glob.glob('/home/claude/a3/**/hf_*.png',recursive=True)
def find(j):
    if j=='dfde063e': return '/home/claude/rb/huy_iso_src.png'
    if j=='095b14c8': return '/home/claude/use/trinh_use_clean.png'
    for f in FILES:
        if j in f: return f
def load(f):
    a=np.array(Image.open(f).convert('RGBA'))
    if a[:,:,3].min()==255:
        rgb=a[:,:,:3].astype(int); cand=(rgb.min(2)>200)&((rgb.max(2)-rgb.min(2))<25); lab,_=ndimage.label(cand); H,W=cand.shape
        border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}; a[:,:,3]=np.where(np.isin(lab,list(border)),0,255)
    a[:,:,3]=np.where(a[:,:,3]>=128,255,0); op=a[:,:,3]>0; lab,n=ndimage.label(op); sz=ndimage.sum(op,lab,range(1,n+1))
    a[:,:,3]=np.where(np.isin(lab,[i+1 for i,s in enumerate(sz) if s>150]),255,0); return a
def grid(a,R,C):
    H,W=a.shape[:2]; out=[]
    # cắt theo khoảng trống nếu được, không thì chia đều
    al=a[:,:,3]>0
    def runs(v,minw):
        r=[];s=None
        for i,x in enumerate(v):
            if x and s is None: s=i
            if not x and s is not None:
                if i-s>minw: r.append((s,i))
                s=None
        if s is not None and len(v)-s>minw: r.append((s,len(v)))
        return r
    rows=runs(al.sum(1)>2,40)
    if len(rows)!=R: rows=[(r*H//R,(r+1)*H//R) for r in range(R)]
    for y0,y1 in rows:
        cols=runs(al[y0:y1].sum(0)>2,20)
        if len(cols)!=C: cols=[(c*W//C,(c+1)*W//C) for c in range(C)]
        for x0,x1 in cols:
            q=Image.fromarray(a[y0:y1,x0:x1]); bb=q.getbbox(); out.append(q.crop(bb))
    return out
def flame(b): r,g,bl=[b[:,:,i].astype(int) for i in range(3)]; return (b[:,:,3]>0)&(r>200)&(g>70)&(g<225)&(bl<110)&(r-bl>120)
def skin_side(f,burn=False):
    b=np.array(f); fl=flame(b) if burn else np.zeros(b.shape[:2],bool); bi=b.astype(int)
    ys=np.nonzero((b[:,:,3]>0)&~fl)[0]; top=ys.min(); h=b.shape[0]-top; head=bi[top:top+int(h*0.45)]
    sk=(head[:,:,0]>190)&(head[:,:,1]>120)&(head[:,:,1]<205)&(head[:,:,2]<175)&(head[:,:,0]-head[:,:,2]>40)&(head[:,:,3]>0)&~fl[top:top+int(h*0.45)]
    yy,xs=np.nonzero(sk); return (xs.mean()-b.shape[1]/2)/b.shape[1] if len(xs)>30 else 0.0
def head_w(im):
    b=np.array(im)[:,:,3]>0; h=b.shape[0]; top=b[:max(1,int(h*0.35))]
    return max((np.ptp(np.nonzero(r)[0])+1) if r.any() else 0 for r in top)
def rs(x,s):
    w,h=max(1,round(x.width*s)),max(1,round(x.height*s)); im=x.resize((w,h),Image.LANCZOS); a=np.array(im); a[:,:,3]=np.where(a[:,:,3]>=110,255,0); return Image.fromarray(a)
def build(fr,R,C,FW,FH,s,flips):
    sheet=Image.new('RGBA',(FW*C,FH*R),(0,0,0,0))
    for i,x in enumerate(fr):
        r,c=divmod(i,C); sm=rs(x,s)
        if flips[r]: sm=sm.transpose(Image.FLIP_LEFT_RIGHT)
        if sm.width>FW or sm.height>FH: sm.thumbnail((FW,FH),Image.LANCZOS)
        sheet.alpha_composite(sm,(c*FW+(FW-sm.width)//2, r*FH+FH-K-sm.height+K-1))
    return sheet
rep={}
walkfront={}
for j,cid in WALK.items():
    fr=grid(load(find(j)),2,3); H=max(x.height for x in fr); s=31*K/H
    sh=build(fr,2,3,24*K,32*K,s,[False,False]); sh.save(f'{CH}/{cid}/hd_walk.png'); walkfront[cid]=rs(fr[1],s); rep[cid]={'walk':round(s,4)}
for kind,MAPK in [('sit',SIT),('use',USE)]:
    for j,cid in MAPK.items():
        f=find(j)
        if not f: print('missing',kind,j); continue
        fr=grid(load(f),2,2); s=head_w(walkfront[cid])/np.mean([head_w(x) for x in fr])
        front=np.mean([skin_side(x) for x in fr[:2]]); back=np.mean([skin_side(x) for x in fr[2:]])
        build(fr,2,2,24*K,32*K,s,[front>0.03,back>0.03]).save(f'{CH}/{cid}/hd_{kind}.png'); rep[cid][kind]=(round(float(front),2),round(float(back),2))
for j,cid in BURN.items():
    fr=grid(load(find(j)),2,2); bh=[]
    for x in fr:
        b=np.array(x); m=(b[:,:,3]>0)&~flame(b); ys=np.nonzero(m.any(1))[0]; bh.append(ys.max()-ys.min()+1)
    s=31*K/np.median(bh); front=np.mean([skin_side(x,True) for x in fr[:2]]); back=np.mean([skin_side(x,True) for x in fr[2:]])
    build(fr,2,2,32*K,44*K,s,[front>0.03,back>0.03]).save(f'{CH}/{cid}/hd_burn.png')
json.dump(rep,open('rep.json','w'),indent=1); print('ok',len(rep))
