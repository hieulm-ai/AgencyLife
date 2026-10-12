# Đo năng suất bằng trình duyệt (Playwright): đội 3 người làm job (Account + Design + Content) + người chơi ở lễ tân, hàng đợi 6 job.
# Chạy: (từ thư mục cha của 5bit-agency-tycoon) python3 -m http.server 8770; rồi python3 5bit-agency-tycoon/tests/do_nang_suat.py
# Đổi URL bên dưới nếu chạy máy chủ ở thư mục khác.
import json, asyncio
from playwright.async_api import async_playwright
KEY='5bit.iso.game.v3'; URL='http://127.0.0.1:8770/5bit-agency-tycoon/game/index.html'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':1280,'height':800}); pg=await ctx.new_page()
    await pg.goto(URL,wait_until='networkidle'); await pg.wait_for_timeout(1500)
    save=json.loads(await pg.evaluate(f"localStorage.getItem('{KEY}')")); g=save['gs']
    g['player']={'id':'01_Huy','kind':'preset'}; g['tourDone']=True; g['guideSeen']=True; g['uiV15Seen']=True; g.pop('introPending',None); g['min']=480
    g['staffIds']=['01_Huy','03_Pali','02_Luwon','13_AB','09_Vit_Vang']
    objs=save['objs']; uid=max(o['uid'] for o in objs)+1
    for x,yd,yc in [(23,46,45),(26,46,45)]:
      objs.append({'uid':uid,'id':'work_desk','gx':x,'gy':yd,'rot':3}); uid+=1
      objs.append({'uid':uid,'id':'office_chair_blue','gx':x,'gy':yc,'rot':0}); uid+=1
    tpl=[('Thiết kế logo',16),('Bộ ấn phẩm Tết',30),('Quản lý fanpage 1 tuần',40),('Thiết kế logo',16),('Bộ ấn phẩm Tết',30),('Quản lý fanpage 1 tuần',40)]
    g['jobs']=[{'id':900+i,'name':n,'need':need,'reward':10,'days':4,'req':[],'work':0,'en':4,'due':5,'account':'03_Pali','cust':i%5} for i,(n,need) in enumerate(tpl)]
    g['nextJob']=910; g['offers']=[]; save['cash']=500
    await ctx.close(); ctx=await b.new_context(viewport={'width':1280,'height':800})
    await ctx.add_init_script("if(!sessionStorage.getItem('s')){localStorage.setItem('%s',%s);sessionStorage.setItem('s','1');}"%(KEY,json.dumps(json.dumps(save))))
    pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await pg.goto(URL,wait_until='networkidle'); await pg.wait_for_timeout(1500)
    await pg.evaluate("document.querySelector('[data-spd=\"4\"]')&&document.querySelector('[data-spd=\"4\"]').click()")
    st=lambda: pg.evaluate(f"(()=>{{const s=JSON.parse(localStorage.getItem('{KEY}')).gs;return {{min:s.min,day:s.day,done:s.done,jobs:s.jobs.map(j=>[j.name,j.cur,+(j.stg?j.stg.reduce((n,x)=>n+x.done,0):0).toFixed(1),j.need])}}}})()")
    prev=None
    for i in range(40):
      await pg.wait_for_timeout(10000); s=await st()
      if s['min']!=prev: print(i*10,'s',s['day'],'%02d:%02d'%(s['min']//60,s['min']%60),'done',s['done'],s['jobs'],flush=True)
      prev=s['min']
      if s['min']>=1260 or s['day']>1: break
    print('errs',errs); await b.close()
asyncio.run(main())
