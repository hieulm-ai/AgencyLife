import glob, json, numpy as np
exec(open('/home/claude/hd/hd.py').read().split('rep={}')[0])   # dùng lại hàm load/grid/skin_side/head_w/rs/build
order=['01_Huy','02_Luwon','03_Pali','04_Tamny','trinh_lac_corrected_v2','06_Vu_a_Vu','07_Hao_Hao','08_Nganh','09_Vit_Vang','10_Con_LT','11_Juice','12_ADM','13_AB','14_HM','15_CongB']
ids=['24fd73dc','bffc09fb','31b4d3b3','1778e1df','5534c0aa','14b762e7','e0db65cd','c33973b4','05486158','f560c60e','d1c498c2','04b01e6d','ce7ed89c','30a3a2f2','63a7634d','d3b46826','d16dcf95','89d677ea','b0b0a082','8cddbc46','3741f9c7','7f8bb0d6','2d4ded05','6f76c220','7b659b87','4154c804','bf2a2d2d','4ecc79fa','c96002ca','708eb055','e140d9ef','79c82ce5','28877cde','1f4aab7a','3fd5b3cb','91bd86f0','f114133d','c6af5efb','0663d8b7','f6e8ad3a','5544dcd4','4a4910b3','35ef1639','80cd816c','32c94306']
kinds=['talk','cele','sad']
TALKFR={}
files=glob.glob('/home/claude/a4/**/*.png',recursive=True); miss=[]; rep={}
for i,j in enumerate(ids):
    cid=order[i//3]; kind=kinds[i%3]; f=[x for x in files if j in x]
    if not f: miss.append((cid,kind)); continue
    fr=grid(load(f[0]),2,2)
    walk=Image.open(f'{CH}/{cid}/hd_walk.png').crop((96,0,192,128))
    def legw(im):
        b=np.array(im)[:,:,3]>0; h=b.shape[0]; band=b[int(h*0.80):]
        return np.median([(np.ptp(np.nonzero(r)[0])+1) for r in band if r.any()])
    if kind=='cele' and TALKFR.get(cid):   # tay giơ cao làm sai số đo đầu → so theo bề rộng chân với sheet nói chuyện
        tf,ts=TALKFR[cid]; s=ts*np.mean([legw(x) for x in tf])/np.mean([legw(x) for x in fr])
    else:
        s=head_w(walk)/np.mean([head_w(x) for x in fr])
    if kind=='talk': TALKFR[cid]=(fr,s)
    front=np.mean([skin_side(x) for x in fr[:2]]); back=np.mean([skin_side(x) for x in fr[2:]])
    build(fr,2,2,24*K,32*K,s,[front>0.03,back>0.03]).save(f'{CH}/{cid}/hd_{kind}.png'); rep[f'{cid}/{kind}']=(round(float(front),2),round(float(back),2))
print('missing',miss); print(len(rep))
