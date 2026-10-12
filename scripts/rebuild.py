"""5bit iso asset rebuild v3 — lưới isometric 32×16 (HW=16, HH=8), nhân vật 24×32 trong world."""
import json, os, shutil, numpy as np
from PIL import Image
SRC='/home/claude/rb/src'; OUT='/home/claude/rb/out'
HW,HH=16,8
ROT=["01_front_left","02_front_right","03_back_right","04_back_left"]
# fit: ('fp')= co theo chiều rộng footprint; ('h',px)= co theo chiều cao; ('w',px)= co theo bề rộng (đồ để trên bàn)
# layer: object (chặn), floor (không chặn), top (đặt lên mặt bàn/kệ), edge (tấm tường/cửa, không dùng cho hệ tường tự xây)
SPEC={
 'furniture':{
  'bookshelf':(2,1,'fp','object'), 'coffee_table':(1,1,'fp','object'), 'dual_monitor_desk':(2,1,'fp','object',1),
  'editing_workstation':(3,1,'fp','object',1), 'meeting_table':(4,2,'fp','object',6), 'office_chair_blue':(1,1,('h',26),'object'),
  'pantry_counter':(4,1,'fp','object'), 'printer_cabinet':(3,1,'fp','object'), 'reception_counter':(3,1,'fp','object',1),
  'round_table':(2,2,'fp','object'), 'sofa_blue':(2,1,'fp','object',2), 'work_desk':(2,1,'fp','object',1)},
 'props':{
  'binders':(1,1,('h',12),'top'), 'camera_tripod':(1,1,('h',36),'object'), 'decorative_blue_mark':(2,1,'fp','object'),
  'green_screen':(3,3,'fp','object'), 'microphone_kit':(1,1,('w',28),'top'), 'potted_plant':(1,1,('h',40),'object'),
  'rug_blue':(2,3,'fp','floor'), 'softbox':(1,1,('h',44),'object'), 'sound_booth':(2,2,'fp','object',1),
  'tabletop_plant':(1,1,('h',14),'top'), 'water_dispenser':(1,1,('h',38),'object'), 'whiteboard':(3,1,'fp','object')},
 'architecture':{
  'entrance_double_door':(0.5,2,'fp','edge'), 'floor_slab_corner':(1,1,'fp','floor'), 'floor_tile_decorative':(1,1,'fp','floor'),
  'floor_tile_white':(1,1,'fp','floor'), 'glass_partition':(0.5,3,'fp','edge'), 'glass_railing':(3,0.5,'fp','edge'),
  'single_door':(0.5,1,'fp','edge'), 'stair_landing':(2,2,'fp','object'), 'staircase':(2,4,'fp','object'),
  'wall_blue':(0.5,2,'fp','edge'), 'wall_white':(0.5,2,'fp','edge'), 'window':(0.5,2,'fp','edge')}}
DIRS={'furniture':'5bit_4_goc_furniture_v2/furniture','props':'5bit_4_goc_props_v2/props','architecture':'nhi/architecture'}
def hard(im):
    a=np.array(im.convert('RGBA')); a[:,:,3]=np.where(a[:,:,3]>=128,255,0); im=Image.fromarray(a); return im.crop(im.getbbox())
def down(im,w,h,colors=32):
    a=np.array(im).astype(np.float32)/255; pm=np.dstack([a[:,:,:3]*a[:,:,3:4],a[:,:,3:4]])
    s=np.array(Image.fromarray((pm*255).astype(np.uint8),'RGBA').resize((w,h),Image.BOX)).astype(np.float32)/255
    al=s[:,:,3:4]; col=np.where(al>0,s[:,:,:3]/np.maximum(al,1e-6),0)
    out=Image.fromarray((np.dstack([col,(al>=0.5)])*255).clip(0,255).astype(np.uint8),'RGBA')
    q=out.convert('RGB').quantize(colors=colors,method=Image.MEDIANCUT,dither=Image.NONE).convert('RGB')
    return Image.fromarray(np.dstack([np.array(q),np.array(out)[:,:,3]]).astype(np.uint8),'RGBA')
manifest={'version':'3.0','grid':{'projection':'isometric 2:1','tile_px':[32,16],'character_world_px':[24,32],'character_portrait_px':[48,64],
  'rotations':ROT,'anchor':'đỉnh dưới của hình thoi footprint (ô xa nhất về phía người xem), tính từ góc trái trên của sprite'},'items':{},'characters':{}}
warnings=[]
for cat,items in SPEC.items():
    for name,sp in items.items():
        W0,D0,fit,layer=sp[:4]; seats=sp[4] if len(sp)>4 else 0
        d=f'{OUT}/{cat}/{name}'; os.makedirs(d,exist_ok=True)
        meta={'category':cat,'layer':layer,'blocking':layer in('object','edge'),'seats':seats,'footprint_rot0':[W0,D0],'views':{}}
        for r,v in enumerate(ROT):
            im=hard(Image.open(f'{SRC}/{DIRS[cat]}/{name}/{v}.png'))
            a=np.array(im)[:,:,3]>0; ys,xs=np.nonzero(a); frac=xs[ys>=ys.max()-3].mean()/im.width
            exp=(W0,D0) if r%2==0 else (D0,W0)
            lo,hi=min(W0,D0),max(W0,D0)
            got=(lo,hi) if frac<0.5 else (hi,lo)
            if lo!=hi and got!=exp: warnings.append(f'{cat}/{name} {v}: trục ảnh ngược quy luật xoay (kỳ vọng {exp[0]}×{exp[1]}, ảnh là {got[0]}×{got[1]})')
            W,D=got if lo!=hi else exp
            if fit=='fp': tw=round((W+D)*HW); s=tw/im.width
            elif fit[0]=='h': s=fit[1]/im.height; tw=max(1,round(im.width*s))
            else: tw=fit[1]; s=tw/im.width
            th=max(1,round(im.height*s)); sm=down(im,tw,th)
            ax= round(W*HW) if fit=='fp' else tw//2
            sm.save(f'{d}/{v}.png')
            meta['views'][v]={'file':f'{v}.png','size':[tw,th],'footprint':[W,D],'anchor':[ax,th-1],'scale_from_src':round(s,4)}
        manifest['items'][f'{cat}/{name}']=meta
# ---------- nhân vật ----------
CB=f'{SRC}/5bit_character_bible_v2_15'
def nearest_half(im): return im.resize((im.width//2,im.height//2),Image.NEAREST)
for cid in sorted(os.listdir(CB)):
    p=f'{CB}/{cid}'
    if not os.path.isdir(p): continue
    atlas=Image.open(f'{p}/atlas_4x4_48x64.png').convert('RGBA')
    fr=lambda row,col: atlas.crop((col*48,row*64,col*48+48,row*64+64))   # hàng: 0 xuống,1 trái,2 lên,3 phải; cột: idle, walk1, walk2, walk3
    d=f'{OUT}/characters/{cid}'; os.makedirs(d,exist_ok=True)
    fr(0,0).save(f'{d}/portrait_48x64.png'); atlas.save(f'{d}/atlas_4x4_48x64_source.png')
    sheet=Image.new('RGBA',(72,64),(0,0,0,0))
    for ri,row in enumerate([0,2]):            # tạm: mặt trước = hướng xuống, lưng = hướng lên
        for ci,col in enumerate([1,0,3]):       # bước trái, đứng, bước phải
            sheet.alpha_composite(nearest_half(fr(row,col)),(ci*24,ri*32))
    sheet.save(f'{d}/world_iso_24x32.png')
    manifest['characters'][cid]={'portrait':'portrait_48x64.png','world_sheet':'world_iso_24x32.png','world_rows':{'front_SW':0,'back_NW':1},
      'world_cols':['step_left','stand','step_right'],'mirror_for':{'SE':'front_SW','NE':'back_NW'},'anchor_world':[12,31],
      'source':'interim: thu nhỏ 2× từ atlas 48×64 (hướng xuống/lên thẳng, chưa phải góc chéo isometric thật)'}
json.dump({'manifest':manifest,'warnings':warnings},open(f'{OUT}/_build.json','w'),ensure_ascii=False,indent=1)
print(len(manifest['items']),'items',len(manifest['characters']),'chars',len(warnings),'warnings')
for k,v in manifest['items'].items():
    vv=v['views'][ROT[0]]; print(f"{k:40s} fp {v['footprint_rot0']} size {vv['size']}")
