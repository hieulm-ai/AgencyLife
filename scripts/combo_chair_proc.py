import glob, json, numpy as np
from PIL import Image
from scipy import ndimage
ids=['2ffc86fa','53a91a80','fe6d17d1','d38423c7','dba69d74','35f995cd','9f650dbe','05d40f73','7dae94d7','e694d49b','bc37783f','342bd990','4f5777ce','3da17de8','c86f1e76','d29c65fc','f0d8c735','45cfd8b3','52b8088b','838454f8','879bc581','5b029d4c','93ca81d6','db3c5452','43ba034c','8ca20fae','9b9d3334','116de1c4','e19c71bb','daa98a51']
order=['01_Huy','02_Luwon','03_Pali','04_Tamny','trinh_lac_corrected_v2','06_Vu_a_Vu','07_Hao_Hao','08_Nganh','09_Vit_Vang','10_Con_LT','11_Juice','12_ADM','13_AB','14_HM','15_CongB']
fs=glob.glob('/home/claude/a9/**/*.png',recursive=True)
M=json.load(open('/home/claude/rb/out/_build.json'))['manifest']
CHAIR={'blue':'furniture/office_chair_blue','ergo':'special/ergo_chair'}
VIEWS=['01_front_left','02_front_right','03_back_right','04_back_left']; QUAD=[(0,0),(1,0),(1,1),(0,1)]
K=4; FW,FH=36,56
def clean(a):
    a[:,:,3]=np.where(a[:,:,3]>=128,255,0); op=a[:,:,3]>0; lab,n=ndimage.label(op)
    if n: sz=ndimage.sum(op,lab,range(1,n+1)); a[:,:,3]=np.where(np.isin(lab,[i+1 for i,s in enumerate(sz) if s>200]),255,0)
    return a
def base(a):   # bề rộng & tâm dải chân ghế (12% dưới cùng)
    al=a[:,:,3]>0; ys=np.nonzero(al.any(1))[0]; y1=ys.max(); y0=int(y1-(y1-ys.min())*0.12); band=al[y0:y1+1]; xs=np.nonzero(band.any(0))[0]
    return xs.max()-xs.min()+1, (xs.max()+xs.min())/2, y1
# chuẩn của ghế trong game (world px)
REF={}
for ck,key in CHAIR.items():
    for v in VIEWS:
        vv=M['items'][key]['views'][v]; im=Image.open(f'/home/claude/itemhd/{key}/{v}.png').resize(tuple(vv['size']),Image.LANCZOS)
        w,cx,yb=base(np.array(im)); REF[(ck,v)]=(w,cx-vv['anchor'][0])
rep={}
for k,j in enumerate(ids):
    cid=order[k//2]; ck=['blue','ergo'][k%2]; src=np.array(Image.open([f for f in fs if j in f][0]).convert('RGBA'))
    frames=[]
    for (qx,qy) in QUAD:
        q=clean(src[qy*512:(qy+1)*512, qx*512:(qx+1)*512].copy()); im=Image.fromarray(q); im=im.crop(im.getbbox()); frames.append(im)
    # tỉ lệ: bề rộng chân ghế khớp ghế trong game (lấy trung vị 4 góc)
    # tỉ lệ theo NHÂN VẬT: bề rộng đầu (2 góc trước) = bề rộng đầu khi đi bộ
    def head_w(im):
        b=np.array(im)[:,:,3]>0; h=b.shape[0]; top=b[:max(1,int(h*0.22))]
        return max((np.ptp(np.nonzero(r)[0])+1) if r.any() else 0 for r in top)
    wf=Image.open(f'/home/claude/rb/out/characters/{cid}/hd_walk.png').crop((96,0,192,128))
    hw_world=head_w(wf)/4.0
    s=float(np.median([hw_world/head_w(fr) for fr in frames[:2]]))
    sheet=Image.new('RGBA',(FW*K*4,FH*K),(0,0,0,0))
    for i,(v,fr) in enumerate(zip(VIEWS,frames)):
        hd=fr.resize((max(1,round(fr.width*s*K)),max(1,round(fr.height*s*K))),Image.LANCZOS); a=np.array(hd); a[:,:,3]=np.where(a[:,:,3]>=110,255,0); hd=Image.fromarray(a)
        w,cx,yb=base(a); off=REF[(ck,v)][1]*K   # tâm chân ghế so với điểm neo của ghế
        x=int(round(i*FW*K+FW*K/2+off-cx)); y=int(FH*K-1-yb)
        sheet.alpha_composite(hd,(max(i*FW*K,x),max(0,y)))
    sheet.save(f'/home/claude/rb/out/characters/{cid}/hd_chair_{ck}.png'); rep[f'{cid}/{ck}']=round(s,4)
json.dump(rep,open('rep.json','w')); print(rep)
