# Mô phỏng A5 (26/10/2026): lương, chi phí văn phòng, giá khu → ngày game mở khu 2–4. Ước tính, không thay dữ liệu thật.
# Chạy: python3 -I scripts/economy_a5.py (từ thư mục gốc repo)
import sys,json
sys.path.insert(0,'scripts')
import economy_v19 as E
ZONE_LV=[1,3,5,7,9,11,13,15,18,21,24,27]
def need(n,a=20,p=1.5): return round(a*n**p)
def run(minutes,sessions,sal=2.4,upkeep=0,price0=500,cash0=10,days=60):
    zones,cash,revenue,gd,lv,xp=1,cash0,0.,0.,1,0.;reach={}
    for day in range(1,days+1):
        used=0.
        for s in range(sessions):
            if gd: cash+=revenue/gd*min(8,(1440-minutes)/sessions/60)*.5*.25
            workers=min(13,3+(zones-1)*2);dur=minutes/sessions/13
            cap=dur*E.throughput(workers);energy=min(200-used,120+(minutes/sessions)*60/90)
            jobs=min(cap,energy/(E.AVG_NEED/2));used+=jobs*E.AVG_NEED/2
            inc=jobs*E.AVG_BASE_REWARD*5*1.45**(zones-1)
            cost=dur*(workers*sal+upkeep*zones)
            cash+=inc-cost;revenue+=inc;gd+=dur
            xp+=jobs*E.AVG_NEED*.75
            while lv<30 and xp>=need(lv): xp-=need(lv);lv+=1
            while zones<12 and lv>=ZONE_LV[zones] and cash>=price0*2**(zones-1):
                cash-=price0*2**(zones-1)+60;zones+=1;reach.setdefault(zones,(day,round(gd,1)))
    return {k:reach.get(k) for k in (2,3,4)}
for label,kw in [('hiện tại',{}),('lương x3',{'sal':7.2}),('lương x3 + duy trì 8tr/khu',{'sal':7.2,'upkeep':8}),('lương x3 + duy trì 8/khu + khu2 800',{'sal':7.2,'upkeep':8,'price0':800})]:
    print(label,json.dumps({f'{m}p/{s}':run(m,s,**kw) for m,s in [(30,1),(90,2)]}))
print('---')
for p0 in (800,1000,1200,1500):
  for up in (8,15):
    print(p0,up,json.dumps({f'{m}p/{s}':run(m,s,sal=7.2,upkeep=up,price0=p0) for m,s in [(30,1),(90,2)]}))
print('=== chọn')
print(json.dumps({f'{m}p/{s}':run(m,s,sal=4.8,upkeep=3,price0=1000) for m,s in [(30,1),(90,2),(180,3)]}))
