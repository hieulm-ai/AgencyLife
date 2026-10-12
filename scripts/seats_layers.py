from PIL import Image; import numpy as np, json, base64, os
ROT=['01_front_left','02_front_right','03_back_right','04_back_left']; ROT_FACE=['SW','SE','NE','NW']
def kmeans2d(P,k,it=40):
    idx=np.argsort(P[:,0]); c=P[idx[np.linspace(0,len(P)-1,k).astype(int)]].astype(float)
    for _ in range(it):
        lab=np.argmin(((P[:,None,:]-c[None,:,:])**2).sum(2),1)
        c=np.array([P[lab==i].mean(0) if (lab==i).any() else c[i] for i in range(k)])
    return c,lab
def face_of(dx,dy):   # độ lệch màn hình (ghế − tâm bàn) → hướng nhìn vào tâm bàn trên lưới
    gx=(dx/16+dy/8)/2; gy=(dy/8-dx/16)/2
    if abs(gx)>abs(gy): return 'SE' if gx<0 else 'NW'
    return 'SW' if gy<0 else 'NE'
front=lambda f:f in('SW','SE')
OUT={}
for n,k in [('meeting_table',6),('round_table',4)]:
  OUT[n]={}
  for v in ROT:
    a=np.array(Image.open(f'/home/claude/rb/out/furniture/{n}/{v}.png').convert('RGBA'))
    op=a[:,:,3]>0; r,g,b=[a[:,:,i].astype(int) for i in range(3)]
    white=op&(r>195)&(g>195)&(b>195); blue=op&(b>r+40)&(b>g+15); dark=op&((r+g+b)<170)
    wy,wx=np.nonzero(white); tcx,tcy=wx.mean(),wy.mean()
    from scipy import ndimage
    best=None
    for e in (1,2,3):                       # chọn mức co nhỏ nhất tách được nhiều ghế nhất
        m=ndimage.binary_erosion(blue,iterations=e); lab_,nl=ndimage.label(m)
        comps=[(ndimage.center_of_mass(m,lab_,i),int((lab_==i).sum())) for i in range(1,nl+1)]
        comps=[c for c in comps if c[1]>=12]
        if best is None or len(comps)>len(best): best=comps
    # 4 góc mặt bàn
    L=(wx.min(), wy[wx==wx.min()].mean()); R=(wx.max(), wy[wx==wx.max()].mean())
    T=(wx[wy==wy.min()].mean(), wy.min()); B=(wx[wy==wy.max()].mean(), wy.max())
    # cạnh → hướng nhìn của người ngồi phía ngoài cạnh đó
    EDGES=[(L,T,'SE'),(T,R,'SW'),(R,B,'NW'),(B,L,'NE')]
    cx0,cy0=np.mean([L[0],R[0],T[0],B[0]]),np.mean([L[1],R[1],T[1],B[1]])
    def outside(p,a,b):   # khoảng cách có dấu ra phía ngoài cạnh a→b (dương = ngoài)
        ex,ey=b[0]-a[0],b[1]-a[1]; nx,ny=ey,-ex; ln=(nx*nx+ny*ny)**.5; nx/=ln; ny/=ln
        if (cx0-a[0])*nx+(cy0-a[1])*ny>0: nx,ny=-nx,-ny
        return (p[0]-a[0])*nx+(p[1]-a[1])*ny
    cen=[]; seats=[]
    for (cy,cx),sz in best:
        f=max(EDGES,key=lambda E:outside((cx,cy),E[0],E[1]))[2]
        cen.append((cx,cy)); seats.append({'cx':round(float(cx),1),'cy':round(float(cy+(7 if front(f) else 6)),1),'face':f,'z':'before' if front(f) else 'after'})
    cen=np.array(cen)
    # gán pixel ghế (xanh + đen, không phải mặt bàn) vào ghế gần nhất trong bán kính 16 px → lớp theo hướng người ngồi
    chair=(blue|dark)&~white; cy_,cx_=np.nonzero(chair); far=np.zeros_like(op); near=np.zeros_like(op)
    for y,x in zip(cy_,cx_):
        d=((cen[:,0]-x)**2+(cen[:,1]-y)**2); j=int(np.argmin(d))
        if d[j]>16**2: continue
        (far if front(seats[j]['face']) else near)[y,x]=True
    if n=='meeting_table':   # chân bàn & phần dưới mép trước mặt bàn luôn ở lớp gần
        for x in range(op.shape[1]):
            yy=np.nonzero(white[:,x])[0]
            if len(yy)>=2: near[yy.max()+2:,x]|=op[yy.max()+2:,x]&~far[yy.max()+2:,x]
    lay={}; d=f'/home/claude/split/{n}'; os.makedirs(d,exist_ok=True)
    for nm,m in [('far',far),('near',near),('base',op&~far&~near)]:
        b2=a.copy(); b2[:,:,3]=np.where(m,255,0); p=f'{d}/{v}_{nm}.png'; Image.fromarray(b2).save(p)
        lay[nm]='data:image/png;base64,'+base64.b64encode(open(p,'rb').read()).decode()
    OUT[n][v]={'layers':lay,'seats':seats}
    print(n,v,[(s['cx'],s['face']) for s in seats])
# sofa: 2 chỗ theo đệm ngồi; mặt trước → người vẽ sau sofa, quay lưng → người vẽ trước (lưng sofa che)
OUT['sofa_blue']={}
for ri,v in enumerate(ROT):
    a=np.array(Image.open(f'/home/claude/rb/out/furniture/sofa_blue/{v}.png').convert('RGBA')); op=a[:,:,3]>0
    ys,xs=np.nonzero(op); P=np.stack([xs,ys],1); cen,lab=kmeans2d(P,2); f=ROT_FACE[ri]; seats=[]
    for i,(cx,cy) in enumerate(cen):
        yy=ys[lab==i]
        fy=(np.percentile(yy,85)-1) if front(f) else (cy+10)
        seats.append({'cx':round(float(cx),1),'cy':round(float(fy),1),'face':f,'z':'after' if front(f) else 'before'})
    OUT['sofa_blue'][v]={'seats':seats}; print('sofa',v,seats)
json.dump(OUT,open('/home/claude/split/table_layers.json','w'))
