import math, json
# Thông số lấy từ code game (tpl21) + số đo trong bản chạy thử tăng tốc
GIOCONG_PER_SEAT_DAY=6.7      # đo: 60,5 giờ công / 3 ngày game / 3 ghế
REW_PER_GIOCONG=175/314       # tổng thưởng gốc / tổng giờ công của 10 mẫu job (trước hệ số cấp)
AVG_NEED=314/10
EN_MAX, EN_REGEN_S = 120, 90
DAY_REAL_MIN=10               # 1 ngày game = 10 phút thật
def M(L): return 6*1.45**(L-1)
def price(L): return 500*2**(L-1)    # giá mở khu tiếp theo khi đang ở cấp L (đã mở L khu)
PROFILES={ # (số phiên/ngày, phút/phiên, giờ vắng trước mỗi phiên)
 'A · 30 phút, 1 lần/ngày':(1,30,[23.5]),
 'B · 90 phút, 2 lần/ngày':(2,45,[14,8.5]),
 'C · 3 giờ, 3 lần/ngày':(3,60,[10,5,6])}
def run(prof,days=60,seats_per_block=4):
    n,mins,gaps=prof; L=1; cash=200.0; templates=0; gameday=0; week_jobs=0; revtot=0.0; gd_total=0
    unlock_day={}
    for d in range(1,days+1):
        for s in range(n):
            # thu nhập vắng mặt (tối đa 8 giờ, 0,5 ngày game/giờ, 25%)
            if gd_total>0:
                avg=revtot/gd_total; cash+=avg*min(8,gaps[s])*0.5*0.25
            energy=EN_MAX+mins*60/EN_REGEN_S
            gd=mins/DAY_REAL_MIN; W=seats_per_block*L
            cap=gd*GIOCONG_PER_SEAT_DAY*W; gc=min(cap,energy*2)
            jobs_rev=gc*REW_PER_GIOCONG*M(L); njobs=gc/AVG_NEED
            passive=0
            if L>=3: passive+=gd*12*M(L)                       # cho thuê studio
            templates=min(20,templates+(0.3*njobs if L>=3 else 0))
            if L>=3: passive+=gd*templates*0.5*M(L)
            rev=jobs_rev+passive; cash+=rev; revtot+=rev; gd_total+=gd
            # giải thưởng tuần
            week_jobs+=njobs; prev=gameday; gameday+=gd
            if int(gameday//7)>int(prev//7):
                if L>=4 and week_jobs>=10: cash+=0.25*price(L)
                week_jobs=0
            while L<12 and cash>=price(L):
                cash-=price(L); L+=1; unlock_day[L]=d
        if L>=12: break
    return unlock_day,L
out={}
for name,prof in PROFILES.items():
    u,L=run(prof); out[name]=u
    print(name,'| cấp cuối:',L,'| mở khu (cấp→ngày):',u)
json.dump(out,open('base.json','w'),ensure_ascii=False)
