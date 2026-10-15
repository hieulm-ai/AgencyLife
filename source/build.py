import json,base64,io,hashlib,shutil,re
from PIL import Image
import numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SOURCE = ROOT / "source"
OUTPUT = ROOT / "game"
GENERATED = OUTPUT / "assets" / "generated"
GENERATED.mkdir(parents=True, exist_ok=True)
shutil.copytree(SOURCE / "static", OUTPUT / "assets" / "static", dirs_exist_ok=True)

def export_bytes(raw, extension):
    name = hashlib.sha256(raw).hexdigest()[:24] + "." + extension
    destination = GENERATED / name
    if not destination.exists():
        destination.write_bytes(raw)
    return "assets/generated/" + name

def webp(path_or_img, lossless=True):
    # Hash pixels + encoding options to reuse unchanged assets across builds.
    im = Image.open(path_or_img) if isinstance(path_or_img, (str, Path)) else path_or_img
    signature = repr(("webp-v1", im.mode, im.size, lossless, 90, 6)).encode() + im.tobytes()
    name = hashlib.sha256(signature).hexdigest()[:24] + ".webp"
    destination = GENERATED / name
    if not destination.exists():
        im.save(destination, 'WEBP', lossless=lossless, quality=90, method=6)
    return "assets/generated/" + name

def head_width(im):
    a=np.array(im.convert('RGBA'))[:,:,3]>128
    ys,xs=np.where(a)
    if not len(ys): return 1
    crop=a[min(ys):max(ys)+1,min(xs):max(xs)+1]
    return max(np.count_nonzero(row) for row in crop[:max(1,round(crop.shape[0]*.4))])

def sitting_scale(folder):
    walk=Image.open(folder/'hd_walk.png').crop((96,0,192,128))
    sit=Image.open(folder/'hd_sit.png')
    return round(float(head_width(walk)/np.median([head_width(sit.crop((x*96,y*128,(x+1)*96,(y+1)*128))) for y in range(2) for x in range(2)])),4)

def chair_sprite(path, kind):
    # Match the caster footprint and floor anchor of the placed furniture.
    replacement=ASSETS/'seating_v2/pali-ergo.png'
    source=Image.open(replacement if kind=='ergo' and 'streetwear' in Path(path).parts
        and Path(path).parent.name=='03_Pali' and replacement.exists() else path).convert('RGBA')
    orientations=json.loads((SOURCE/'chair-orientations.json').read_text())
    reversed_rear=Path(path).parent.name in orientations['streetwear' if 'streetwear' in Path(path).parts else 'base'][kind]
    target=Image.new('RGBA',source.size)
    key='furniture/office_chair_blue' if kind=='blue' else 'special/ergo_chair'
    def base(im):
        a=np.array(im)[:,:,3]>128
        ys,xs=np.where(a)
        lo=max(ys)-max(1,round((max(ys)-min(ys))*.12))
        yy,xx=np.where(a[lo:max(ys)+1])
        return max(xx)-min(xx)+1,(max(xx)+min(xx))/2,max(ys)
    for rot,v in enumerate(ROT):
        ref=Image.open(ASSETS/'items_hd3x'/key/(v+'.png')).convert('RGBA')
        view=M['items'][key]['views'][v]
        rw,rc,rb=base(ref); ratio=view['size'][0]/ref.width
        for row in range(source.height//224):
            # Audited source sheets can have their two rear views reversed.
            # Normalize the source cell before aligning it to the correct floor anchor.
            source_rot=5-rot if rot>=2 and reversed_rear else rot
            frame=source.crop((source_rot*144,row*224,(source_rot+1)*144,(row+1)*224))
            if Path(path).parent.name=='03_Pali' and 'streetwear' not in Path(path).parts and kind=='blue' and rot==2:
                frame=frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            box=frame.getbbox()
            if not box: continue
            part=frame.crop(box);pw,pc,pb=base(part)
            standing=Image.open(Path(path).parent/'hd_walk.png').crop((96,0,192,128))
            scale=head_width(standing)/head_width(part)
            # Retain a margin so unusual hair/poses cannot cross frame boundaries.
            scale=min(scale,140/part.width,218/part.height)
            part=part.resize((max(1,round(part.width*scale)),max(1,round(part.height*scale))),Image.Resampling.LANCZOS)
            _,pc,pb=base(part)
            x=round(72+(rc*ratio-view['anchor'][0])*4-pc)
            y=round(220+(rb*ratio-view['anchor'][1])*4-pb)
            cell=Image.new('RGBA',(144,224));cell.alpha_composite(part,(x,y))
            target.alpha_composite(cell,(rot*144,row*224))
    return target

def hd_layer(key,v,layer_uri):
    hd=Image.open(str(ASSETS / 'items_hd3x' / key / f'{v}.png')).convert('RGBA'); raw=base64.b64decode(layer_uri.split(',',1)[1]); lo=Image.open(io.BytesIO(raw)).convert('RGBA')
    m=np.array(lo.resize(hd.size,Image.NEAREST))[:,:,3]>0; a=np.array(hd); a[:,:,3]=np.where(m,a[:,:,3],0); return webp(Image.fromarray(a))
M=json.load(open(SOURCE / 'asset_manifest_build.json'))['manifest']; ROT=M['grid']['rotations']
CAT=[ # id, tên, nhóm, giá thử (tr)
 ('furniture/work_desk','Bàn làm việc','Làm việc',3),('furniture/dual_monitor_desk','Bàn 2 màn hình','Làm việc',5),
 ('furniture/editing_workstation','Bàn dựng phim','Làm việc',8),('furniture/office_chair_blue','Ghế xoay','Làm việc',1),
 ('furniture/meeting_table','Bàn họp 6 người','Họp',10),('furniture/round_table','Bàn tròn 4 người','Họp',6),('props/whiteboard','Bảng trắng','Họp',2),
 ('furniture/sofa_blue','Sofa','Nghỉ ngơi',4),('furniture/coffee_table','Bàn trà','Nghỉ ngơi',1.5),('furniture/pantry_counter','Quầy pantry','Nghỉ ngơi',9),
 ('props/water_dispenser','Cây nước','Nghỉ ngơi',1),('props/rug_blue','Thảm xanh','Nghỉ ngơi',1),
 ('furniture/bookshelf','Tủ sách','Văn phòng',2.5),('furniture/printer_cabinet','Tủ máy in','Văn phòng',6),('furniture/reception_counter','Quầy lễ tân','Văn phòng',7),
 ('props/green_screen','Phông xanh','Sản xuất',6),('props/softbox','Đèn softbox','Sản xuất',2),('props/camera_tripod','Máy quay','Sản xuất',8),('props/sound_booth','Phòng thu','Sản xuất',15),
 ('props/potted_plant','Cây chậu lớn','Trang trí',0.8),('props/decorative_blue_mark','Mô hình khối xanh','Trang trí',3),
 ('special/premium_coffee','Máy cà phê cao cấp','Đặc biệt (ruby)',0,40),('special/ergo_chair','Ghế công thái học','Đặc biệt (ruby)',0,30),('special/cat_house','Nhà mèo văn phòng','Đặc biệt (ruby)',0,60),('special/aquarium','Bể cá lớn','Đặc biệt (ruby)',0,80),('special/big_tree','Cây xanh lớn','Đặc biệt (ruby)',0,25)]
FURN=[]
for row in CAT:
    key,name,grp,price=row[:4]; gem=row[4] if len(row)>4 else 0
    it=M['items'][key]; views=[]
    for v in ROT:
        vv=it['views'][v]; fp=[int(round(vv['footprint'][0])),int(round(vv['footprint'][1]))]
        views.append({'src':webp(str(ASSETS / 'items_hd3x' / key / f'{v}.png')),'fp':fp,'anchor':vv['anchor'],'size':vv['size']})
    TL=json.load(open(SOURCE / 'seat_layers.json'))
    if key.split('/')[1] in TL:
        for vi,v in enumerate(ROT):
            e=TL[key.split('/')[1]][v]
            if 'layers' in e: views[vi]['layers']={k2:hd_layer(key,v,u) for k2,u in e['layers'].items()}
            views[vi]['seatsPx']=e['seats']
    if key=='furniture/meeting_table':
        layout=json.loads((ASSETS/'meeting_separate/layout.json').read_text())
        for vi,v in enumerate(ROT):
            views[vi]={**layout[vi], 'src':webp(ASSETS/'meeting_separate'/f'{v}-preview.png'),
                       'layers':{'table':webp(ASSETS/'meeting_separate'/f'{v}-table.png')}, 'separateChairs':True}
    if key in ('furniture/round_table','furniture/sofa_blue'):
        folder=ASSETS/'seating_v2'; fid=key.split('/')[1]
        layout=json.loads((folder/'layout.json').read_text())[fid]
        prefix='round' if fid=='round_table' else 'sofa'
        for vi,v in enumerate(ROT):
            layers=('table',) if fid=='round_table' else ('base','near')
            views[vi]={**layout[vi], 'src':webp(folder/f'{prefix}-{v}-preview.png'),
                       'layers':{k:webp(folder/f'{prefix}-{v}-{k}.png') for k in layers}}
    FURN.append({'id':key.split('/')[1],'name':name,'group':grp,'price':price,'gem':gem,'layer':it['layer'],'seats':(1 if key.split('/')[1] in ('work_desk','dual_monitor_desk','editing_workstation') else 0),'views':views})
# Map recovered once from the handoff, now an independent build input.
pre = json.loads((SOURCE / 'map_preset.json').read_text())

import os
B=json.load(open(SOURCE / 'asset_manifest_build.json'))['manifest']
NOSIT=set()   # AI vẽ kèm ghế trong sheet ngồi → tạm không cho ngồi
CH=[]
for c in sorted(B['characters']):
    e={'id':c,'src':webp(f'{ASSETS}/characters/{c}/hd_walk.png')}
    p=f'{ASSETS}/characters/{c}/hd_sit.png'
    if os.path.exists(p) and c not in NOSIT: e['sit']=webp(p)
    bq=f'{ASSETS}/characters/{c}/hd_burn.png'
    if os.path.exists(bq): e['burn']=webp(bq)
    for ck,key in [('blue','chairBlue'),('ergo','chairErgo')]:
        cp=f'{ASSETS}/characters/{c}/hd_chair_{ck}.png'
        if os.path.exists(cp):
            e[key]=webp(chair_sprite(cp,ck), lossless=False)
    for rk in ['talk','cele','sad']:
        rp=f'{ASSETS}/characters/{c}/hd_{rk}.png'
        if os.path.exists(rp): e[rk]=webp(rp)
    q=f'{ASSETS}/characters/{c}/hd_use.png'
    if os.path.exists(q): e['use']=webp(q)
    q=f'{ASSETS}/characters/{c}/hd_cam.png'   # 15/10/2026: tư thế cầm máy quay (Quay phim)
    if os.path.exists(q): e['cam']=webp(q)
    e['sitScale']=sitting_scale(ASSETS/'characters'/c)
    e['portrait']=webp(ASSETS/'characters'/c/'portrait_48x64.png')
    q=f'{ASSETS}/characters/{c}/avatar.png'   # 15/10/2026: ảnh đại diện vẽ tay 96×96 (đầu + vai)
    if os.path.exists(q): e['avatar']=webp(q, lossless=False)
    CH.append(e)
# Màn "Tự tạo nhân vật": mặt nạ vùng (da/tóc/áo/quần) của các dáng gốc, tạo bằng scripts/creator_masks.py.
_cl=json.loads((ASSETS/'creator/layout.json').read_text())
def _creator_base(b):
    sheets=b.get('sheets',['walk','sit','use','talk','cele','sad','burn'])
    out={'char':b['char'],'lum':b['lum'],'masks':{sh:webp(Image.open(ASSETS/'creator'/b['char']/f'{sh}.png').convert('RGB')) for sh in sheets}}
    if b.get('own'):   # dáng vẽ riêng cho màn tự tạo (Higgsfield 07/10/2026): ảnh nằm ở assets/creator_bases, không thuộc danh sách nhân sự
        folder=ASSETS/'creator_bases'/b['char']
        out['sheets']={('src' if sh=='walk' else sh):webp(folder/f'hd_{sh}.png') for sh in sheets}
        out['sitScale']=sitting_scale(folder)
    return out
CREATOR={'scale':_cl['scale'],'bases':{k:_creator_base(b) for k,b in _cl['bases'].items()}}
s=open(SOURCE / 'template.html').read().replace('__PRESET__',json.dumps(pre)).replace('__CHARS__',json.dumps(CH)).replace('__CREATOR__',json.dumps(CREATOR)).replace('__FURN__',json.dumps(FURN))
s=s.replace('__MEETINGS__',(SOURCE / 'meetings.js').read_text()).replace('__SEATING__',(SOURCE / 'seating.js').read_text())
# Only publish complete skins; incomplete raw generations never enter the shop.
skin_data={}
skin_root=ASSETS / 'skins' / 'streetwear'
ready=skin_root / 'ready.json'
if ready.exists():
    for cid in json.loads(ready.read_text()):
        entry={'id':cid,'sitScale':sitting_scale(skin_root/cid)}
        for key,fn in [('src','walk'),('sit','sit'),('use','use'),('talk','talk'),('cele','cele'),('sad','sad'),('chairBlue','chair_blue'),('chairErgo','chair_ergo')]:
            path=skin_root / cid / ('hd_'+fn+'.png')
            entry[key]=webp(chair_sprite(path,fn.removeprefix('chair_')) if fn.startswith('chair_') else path)
        skin_data[cid]=entry
s=s.replace('__SKINS__',(SOURCE / 'skins.js').read_text().replace('__SKIN_DATA__',json.dumps(skin_data)))
# Icon thanh dưới: cắt sát phần hình rồi đặt giữa ô vuông, cùng "độ lớn thị giác" (trung bình căn bậc hai diện tích khung hình
# và diện tích phần có màu; chừa ít nhất 12% lề),
# để các icon trông bằng nhau và nằm giữa ô dù ảnh gốc có viền trong suốt lệch nhau.
NAV_ICONS=['brief','people','hammer','shop','trophy']   # V15: 5 trung tâm ở thanh dưới (Công việc · Đội ngũ · Xây dựng · Cửa hàng · Thành tựu)
_uiicon=json.JSONDecoder().raw_decode(s[s.index('window.UIICON=')+len('window.UIICON='):])[0]
_nav={}
for _k in NAV_ICONS:
    _im=Image.open(SOURCE/'static'/Path(_uiicon[_k]).name).convert('RGBA')
    _c=_im.crop(_im.getchannel('A').point(lambda v:255 if v>64 else 0).getbbox())   # bỏ quầng mờ khi tính khung
    _ink=float((np.array(_c)[...,3]>128).sum())**.5
    _side=max(round(((_c.width*_c.height)**.5+_ink)/2*1.25), round(max(_c.size)*1.12))
    _sq=Image.new('RGBA',(_side,_side),(0,0,0,0)); _sq.alpha_composite(_c,((_side-_c.width)//2,(_side-_c.height)//2))
    _buf=io.BytesIO(); _sq.save(_buf,'PNG'); _nav['nav_'+_k]=export_bytes(_buf.getvalue(),'png')
s=s.replace('__NAVICON__',json.dumps(_nav))
s=s.replace('__PLAYER__',(SOURCE / 'player.js').read_text()).replace('__GUIDE__',(SOURCE / 'guide.js').read_text())
s=s.replace('__LOADER__',(SOURCE / 'loader.js').read_text()).replace('__TITLE__',(SOURCE / 'title.js').read_text()).replace('__BOOT_CSS__',(SOURCE / 'boot.css').read_text())
s=s.replace('__JOB_ICON_ATLAS__',webp(ASSETS/'job-icons-new.png'))
s=s.replace('__HUD_CSS__',(SOURCE / 'hud-layout.css').read_text()).replace('__HUD_LAYOUT__',(SOURCE / 'hud-layout.js').read_text())
s=s.replace('__STAFF__',(SOURCE / 'staff.js').read_text()+'\n'+(SOURCE / 'payroll.js').read_text()+'\n'+(SOURCE / 'borrow.js').read_text())   # mượn nhân viên của bạn bè (14/10/2026)
s=s.replace('__REPUTATION__',(SOURCE / 'reputation.js').read_text())
s=s.replace('__WEEKLY_PASS__',(SOURCE / 'weekly-pass.js').read_text())
s=s.replace('__OFFERS__',(SOURCE / 'offers.js').read_text())
s=s.replace('__OFFICE_FLOW__',(SOURCE / 'office-flow.js').read_text())
s=s.replace('__VISITOR_LOUNGE__',(SOURCE / 'visitor-lounge.js').read_text())
s=s.replace('__COLLECTIONS__',(SOURCE / 'collections.js').read_text())
s=s.replace('__STORE__',(SOURCE / 'store.js').read_text())   # Kho (V15)
s=s.replace('__PIPELINE__',(SOURCE / 'agency-level.js').read_text()+'\n'+(SOURCE / 'pipeline.js').read_text()+'\n'+(SOURCE / 'early-play.js').read_text())
s=s.replace('__FEEDBACK__',(SOURCE / 'feedback.js').read_text())   # khách góp ý + trả lời đánh giá (V18)   # quy trình job theo bộ phận (V17)
s=s.replace('__NEWS__',(SOURCE / 'news.js').read_text())
s=s.replace('__AMBIENCE__',(SOURCE / 'ambience.js').read_text())
s=s.replace('__DAYLIGHT__',(SOURCE / 'daylight.js').read_text())
_olcfg=ROOT/'online'/'config.json'   # V16: cấu hình Supabase (url + anonKey); không có thì online tắt, vẫn bật được máy chủ thử
s=s.replace('__ONLINE__',(SOURCE / 'online.js').read_text().replace('__ONLINE_CFG__',json.dumps(json.loads(_olcfg.read_text())) if _olcfg.exists() else 'null'))
import base64 as _b
s=s.replace('__DAY_TRANSITION__',(SOURCE / 'day-transition.js').read_text())
s=s.replace('__DAY_PORTRAIT__',export_bytes((ASSETS / 'transitions/vu-a-vu.gif').read_bytes(), 'gif'))
s=s.replace('__PORTRAIT__',export_bytes((ASSETS / 'characters/01_Huy/portrait_48x64.png').read_bytes(), 'png'))
CUST=[('doanh_nhan','Doanh nhân'),('chu_shop','Chủ shop online'),('kol','KOL'),('founder','Founder startup'),('chu_nha_hang','Chủ nhà hàng'),('chu_spa','Chủ spa'),('giam_doc_mkt','Giám đốc marketing'),('chu_cafe','Chủ quán cà phê')]
_c=[{'slug':sl,'name':nm,'src':webp(f'{ASSETS}/customers/{sl}/hd_walk.png')} for sl,nm in CUST]
_em={}
if os.path.exists(str(ASSETS / 'emotes')):
    for fn in sorted((ASSETS / 'emotes').glob('*.png')): _em[fn.stem]=export_bytes(fn.read_bytes(), 'png')
seated=[]
for name in ['customers-a.png','customers-b.png']:
    path=ASSETS / 'customers' / 'seated' / name
    im=Image.open(path).convert('RGBA')
    # Read alpha bounds as sprite metadata; preserve the generated bitmap unchanged.
    alpha=np.array(im)[:,:,3]>128
    rows=[]; start=None
    for y, occupied in enumerate(alpha.sum(axis=1)>10):
        if occupied and start is None: start=y
        if not occupied and start is not None:
            if y-start>30: rows.append((start,y))
            start=None
    if start is not None: rows.append((start,im.height))
    if len(rows)!=4: raise ValueError(f'{name}: expected four separated character rows, got {rows}')
    frames=[]
    for top,bottom in rows:
        pair=[]
        for column in range(2):
            left=column*im.width//2; right=(column+1)*im.width//2
            ys,xs=np.where(alpha[top:bottom,left:right])
            if not len(xs): raise ValueError(f'{name}: empty sprite cell')
            rect=[int(left+xs.min()),int(top+ys.min()),int(xs.max()-xs.min()+1),int(ys.max()-ys.min()+1)]
            customer=CUST[(0 if name=='customers-a.png' else 4)+len(frames)][0]
            stand=Image.open(ASSETS/'customers'/customer/'hd_walk.png').crop((96,0,192,128))
            rx,ry,rw,rh=rect
            height=rh*head_width(stand)/4/head_width(im.crop((rx,ry,rx+rw,ry+rh)))
            pair.append({'rect':rect,'height':round(height,3),'hip':[.60 if column==0 else .56,.75]})
        frames.append(pair)
    seated.append({'src':webp(path),'frames':frames})
s=s.replace('<script>window.PORTRAIT=','<script>window.CUSTS='+json.dumps(_c,ensure_ascii=False)+';window.EMOTES='+json.dumps(_em)+';window.SEATED_CUSTOMERS='+json.dumps(seated)+';</script>\n<script>window.PORTRAIT=',1)
s=s.replace('__OUTDOOR_SHEET__',webp(ASSETS/'outdoor_v2/sheet.png'))
s=s.replace('__MODERN_OUTDOOR__',webp(ASSETS/'outdoor_v2/modern-grass.png'))
# Keep the supplied GIF bytes, frames, timing and speech bubble intact.
s=s.replace('__BOOT_ART__',webp(ASSETS/'loading/agency-team-v25.png',lossless=False))
# Màn nền: 3 lớp tách rời (nền phong cảnh, nhóm nhân vật, logo) để bố cục co giãn theo màn hình.
s=s.replace('__TITLE_BG__',webp(ASSETS/'title/background.png',lossless=False))
s=s.replace('__TITLE_CHARS__',webp(ASSETS/'title/characters.png',lossless=False))
s=s.replace('__TITLE_LOGO__',webp(ASSETS/'title/logo.png',lossless=False))
loading_gif=ASSETS/'loading/vu-a-vu-transparent.gif'
loading_still=Image.open(loading_gif).convert('RGBA')
s=s.replace('__BOOT_VU_GIF__',export_bytes(loading_gif.read_bytes(),'gif')).replace('__BOOT_VU_STILL__',webp(loading_still))
s=s.replace('__SUPPORT_DRINK_IMAGES__',json.dumps([webp(ASSETS/f'support-drink-{i}.png') for i in range(1,4)]))
s=s.replace('__GUIDE_DUCK_HI__',webp(ASSETS/'guide/guide_duck.png', lossless=False))   # 15/10/2026: vịt hướng dẫn vẽ lại (Higgsfield)
s=s.replace('__GUIDE_PANEL__',webp(ASSETS/'guide/guide_panel.png', lossless=False))   # khung thoại 9 mảnh
s=s.replace('__GUIDE_DUCK__',webp(ASSETS/'characters/09_Vit_Vang/portrait_48x64.png'))
s=s.replace('__FEEDBACK_ICONS__',webp(ASSETS/'feedback-icons.png'))
if 'data:image/' in s:
    raise ValueError('Unexpected embedded image in generated HTML')
references = sorted(set(re.findall(r'assets/(?:static|generated)/[a-f0-9]+\.(?:png|webp|jpg|gif)', s)))
for reference in references:
    if not (OUTPUT / reference).is_file():
        raise FileNotFoundError(reference)
manifest = [{"path": ref, "bytes": (OUTPUT / ref).stat().st_size} for ref in references]
(OUTPUT / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
# 15/10/2026: biểu tượng app (Vịt Vàng, vẽ bằng Higgsfield) — favicon, apple-touch-icon, icon PWA + manifest.
_icon=Image.open(ASSETS/'app-icon/app-icon-384.png').convert('RGB')
(OUTPUT/'icons').mkdir(exist_ok=True)
for _n,_sz in [('icon-512.png',512),('icon-192.png',192),('apple-touch-icon.png',180),('favicon-32.png',32)]:
    _p=OUTPUT/'icons'/_n; _im=_icon.resize((_sz,_sz),Image.Resampling.LANCZOS)
    if not _p.exists() or Image.open(_p).convert('RGB').tobytes()!=_im.tobytes(): _im.save(_p,optimize=True)
_icon.resize((48,48),Image.Resampling.LANCZOS).save(OUTPUT/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
(OUTPUT/'manifest.webmanifest').write_text(json.dumps({"name":"Agency's Life Tycoon","short_name":"AgencyLife","start_url":"./","scope":"./","display":"fullscreen","orientation":"landscape","background_color":"#7cc4e6","theme_color":"#5E9E42","icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png","purpose":"any"}]},ensure_ascii=False,indent=1)+'\n')
# Only replace the preview once its complete set of assets has been written.
temporary = OUTPUT / 'index.html.tmp'
temporary.write_text(s)
temporary.replace(OUTPUT / 'index.html')
print(f"HTML: {len(s.encode()):,} bytes; {len(references)} external images; "
      f"assets: {sum(item['bytes'] for item in manifest):,} bytes")
