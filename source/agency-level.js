// ---------- Cấp agency theo XP + khu có công năng (15/10/2026, phương án đã chốt) ----------
// Cấp agency (1–30) tách khỏi số khu đất. XP đến từ job hoàn thành (0,75 × giờ công, +20% nếu khách chấm ≥ 4★).
// XP cần để từ cấp n lên n+1 = 20 × n^1,5. Mô phỏng scripts/economy_xp.py: người chơi tích cực đạt cấp 15 sau ~3 tuần,
// người chơi 30 phút/ngày ~1 tháng (ước tính, chưa có dữ liệu người chơi thật).
// Hệ số kinh tế (lvlMul, giá khu) vẫn theo số khu đã mở như trước: lvl() = UNLOCKED.size.
const AG_LV_MAX=30, XP_A=20, XP_P=1.5, XP_PER_HOUR=.75, XP_GOOD_REVIEW=1.2, LV_UP_GEMS=2;
function xpNeed(n){return Math.round(XP_A*Math.pow(n,XP_P));}
// Mốc mở (thông số thử).
const ROLE_LV={'Sale':3,'Trợ lý':3,'HR':5,'Quay phim':9,'Editor':11,'AI Designer':13,'Âm thanh':15};
const ITEM_LV={softbox:5,camera_tripod:9,editing_workstation:11,sound_booth:15,green_screen:18};
const JOB_LV={'Pitch khách hàng lớn':3,'Chụp ảnh sản phẩm':5,'Quay video TikTok':9,'Livestream bán hàng':9,'Video review sản phẩm':9,
 'Series Reels 5 clip':11,'Dựng video sự kiện':11,'Podcast thương hiệu':15,'Phim giới thiệu doanh nghiệp 60s':18,'TVC 15 giây':21};
const ZONE_LV=[1,3,5,7,9,11,13,15,18,21,24,27];   // khu thứ k (k = số khu đã mở + 1) cần cấp này
// Mốc khác đổi từ "số khu" sang cấp agency.
const FEATURE_LV={retainer:3,studioRent:5,templates:5,award:7};
// Công năng khu: chọn khi mở khu. roles = bước làm nhanh hơn khi người làm đứng/ngồi trong khu đó.
const ZONE_FN=[
 {k:'creative',n:'Phòng Sáng tạo',lv:1,roles:['des','con','plan'],f:1.1,ic:'palette',d:'Design, Content, Planner làm nhanh hơn 10%'},
 {k:'meeting',n:'Phòng họp',lv:7,roles:['acc','plan'],f:1.1,ic:'brief',d:'Account, Planner làm nhanh hơn 10%'},
 {k:'pantry',n:'Pantry',lv:7,relief:1.3,ic:'coffee',d:'Đồ thư giãn trong khu giảm stress nhiều hơn 30%'},
 {k:'photo',n:'Studio ảnh',lv:5,roles:['des','cam'],f:1.1,ic:'star',d:'Chụp ảnh và thiết kế nhanh hơn 10%'},
 {k:'video',n:'Studio quay',lv:9,roles:['cam'],f:1.15,ic:'clapper',d:'Bước Quay nhanh hơn 15%'},
 {k:'edit',n:'Phòng dựng',lv:11,roles:['edit'],f:1.15,ic:'clapper',d:'Bước Dựng nhanh hơn 15%'},
 {k:'sound',n:'Phòng thu',lv:15,roles:['snd'],f:1.15,ic:'bolt',d:'Bước Thu âm nhanh hơn 15%'}];
const ZONE_FN_BY=Object.fromEntries(ZONE_FN.map(z=>[z.k,z]));
const ZONE_FN_CHANGE=50;   // đổi công năng: 50 tr (thông số thử)

function agencyLevel(){return Math.max(1,Math.min(AG_LV_MAX,GS.agLv|0||1));}
function xpProgress(){const lv=agencyLevel();return lv>=AG_LV_MAX?{lv,xp:0,need:0,pct:100}:{lv,xp:Math.floor(GS.xp||0),need:xpNeed(lv),pct:Math.min(100,(GS.xp||0)/xpNeed(lv)*100)};}
function roleMinLv(role){return ROLE_LV[role]||1;}
function itemMinLv(id){return ITEM_LV[id]||1;}
function jobMinLv(name){return JOB_LV[String(name||'').replace(/^⭐\s*/,'')]||1;}
function featureOpen(k){return agencyLevel()>=(FEATURE_LV[k]||1);}
function nextZoneLv(){return ZONE_LV[Math.min(ZONE_LV.length-1,UNLOCKED.size)]||1;}
// Danh sách mở ở đúng cấp lv (để báo khi lên cấp và hiện trong bảng cấp).
function unlocksAt(lv){
 const out=[];
 for(const [r,l] of Object.entries(ROLE_LV))if(l===lv)out.push('Tuyển '+r);
 for(const [i,l] of Object.entries(ITEM_LV))if(l===lv)out.push('Đồ: '+(typeof ITEM_NAME!=='undefined'&&ITEM_NAME[i]||i));
 for(const [j,l] of Object.entries(JOB_LV))if(l===lv)out.push('Job: '+j);
 for(const z of ZONE_FN)if(z.lv===lv&&lv>1)out.push('Công năng khu: '+z.n);
 const zi=ZONE_LV.indexOf(lv);if(zi>0)out.push(`Mở được khu thứ ${zi+1}`);
 const fn={retainer:'Hợp đồng duy trì, Workshop',studioRent:'Cho thuê studio, Bán template',award:'Giải thưởng sáng tạo tuần'};
 for(const [k,l] of Object.entries(FEATURE_LV))if(l===lv&&fn[k]&&!out.includes(fn[k]))out.push(fn[k]);
 return [...new Set(out)];
}
function nextUnlock(){for(let l=agencyLevel()+1;l<=AG_LV_MAX;l++){const u=unlocksAt(l);if(u.length)return {lv:l,items:u};}return null;}
function addXP(n,quiet){
 n=Math.max(0,Math.round(n||0));if(!n)return;
 if(!Number.isFinite(GS.xp))GS.xp=0;GS.xp+=n;
 const ups=[];
 while(agencyLevel()<AG_LV_MAX&&GS.xp>=xpNeed(agencyLevel())){GS.xp-=xpNeed(agencyLevel());GS.agLv=agencyLevel()+1;ups.push(GS.agLv);}
 if(agencyLevel()>=AG_LV_MAX)GS.xp=0;
 if(!ups.length||quiet)return;
 let got=0;for(const lv of ups){if(typeof addGems==='function')got+=addGems(LV_UP_GEMS,`Lên cấp ${lv}`)||0;else{GS.gems+=LV_UP_GEMS;got+=LV_UP_GEMS;}
  const u=unlocksAt(lv);if(typeof addOfficeNews==='function')addOfficeNews('level',`Agency lên cấp ${lv}`+(u.length?' · mở: '+u.join(', '):''));}
 if(typeof buildCatalog==='function')buildCatalog();
 showLevelUp(ups[ups.length-1],ups.flatMap(unlocksAt),got);
}
function showLevelUp(lv,items,gems){
 if(typeof tourOn!=='undefined'&&tourOn){toast(`Lên cấp ${lv}!`,'ok');return;}
 const box=document.getElementById('unlockBox');if(!box)return;
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 box.innerHTML=`<div class="ph"><span class="ic">${UIIMG('up',22)}</span>Agency lên cấp ${lv}!</div><div class="row"><span>Thưởng</span><b>${gems?'+'+gems+'💎':'Đã nhận đủ ruby tuần này'}</b></div>`
  +(items.length?`<div class="lvup-list">${items.map(t=>`<div class="row"><span>🔓 ${esc(t)}</span></div>`).join('')}</div>`:'')
  +`<button class="btn g" id="lvOk">Tuyệt!</button>`;
 box.innerHTML=typeof gemify==='function'?gemify(box.innerHTML):box.innerHTML;
 box.classList.add('open');document.getElementById('lvOk').onclick=()=>box.classList.remove('open');
}
// XP khi xong job (gọi trong vòng hoàn tất job).
function jobXP(j,stars){const base=XP_PER_HOUR*(Number(j&&j.need)||0);return Math.round(base*(stars>=4?XP_GOOD_REVIEW:1));}
// Bản lưu cũ chưa có XP: quy đổi số job đã xong thành XP (mỗi job ~ 0,75 × giờ công trung bình 32 giờ).
function migrateAgencyLevel(){
 if(Number.isFinite(GS.agLv)&&GS.agLv>=1)return;
 GS.agLv=1;GS.xp=0;addXP(Math.round((GS.done||0)*24),true);
}

// ---------- khu có công năng ----------
function zoneFn(id){const k=GS.zoneFn&&GS.zoneFn[id];return ZONE_FN_BY[k]||null;}
function plotName(p){const z=zoneFn(p[0]);return z?z.n:p[1];}
function zonePlotAt(x,y){x=Math.floor(x);y=Math.floor(y);return PLOTS.find(p=>UNLOCKED.has(p[0])&&x>=p[2]&&x<=p[4]&&y>=p[3]&&y<=p[5])||null;}
// Hệ số làm nhanh của khu đang đứng/ngồi cho bước role.
function zoneRoleF(a,role){if(!a)return 1;const p=zonePlotAt(a.x,a.y),z=p&&zoneFn(p[0]);return z&&z.roles&&z.roles.includes(role)?z.f:1;}
function zoneReliefF(o){if(!o)return 1;const p=zonePlotAt(o.gx,o.gy),z=p&&zoneFn(p[0]);return z&&z.relief?z.relief:1;}
function setZoneFn(id,k,paid){
 const z=ZONE_FN_BY[k];if(!z||!UNLOCKED.has(id)||id===0)return false;
 if(agencyLevel()<z.lv){toast(`${z.n} mở ở cấp ${z.lv}`,'err');return false;}
 if(paid){if(cash<ZONE_FN_CHANGE){toast(`Cần ${fmt(ZONE_FN_CHANGE)} để đổi công năng`,'err');return false;}cash=Math.round((cash-ZONE_FN_CHANGE)*100)/100;if(typeof ledgerSpend==='function')ledgerSpend('fee',ZONE_FN_CHANGE);}
 GS.zoneFn=GS.zoneFn||{};GS.zoneFn[id]=k;save();hud();toast(`Khu ${id} thành ${z.n}`,'ok');
 if(typeof updatePanels==='function')updatePanels();return true;
}
// Hộp chọn công năng (sau khi mở khu, hoặc bấm đổi trong bảng Mở rộng).
function askZoneFn(id,change){
 const box=document.getElementById('unlockBox');if(!box)return;const cur=GS.zoneFn&&GS.zoneFn[id],lv=agencyLevel();
 box.innerHTML=`<div class="ph"><span class="ic">${UIIMG('tile',22)}</span>Khu ${id} dùng làm gì?</div>`
  +`<p class="hub-note" style="margin:0">${change?`Đổi công năng: ${fmt(ZONE_FN_CHANGE)}.`:'Nhân viên làm đúng việc trong khu sẽ nhanh hơn. Có thể đổi sau.'}</p>`
  +`<div class="zfn-grid">${ZONE_FN.map(z=>{const off=lv<z.lv;return `<button class="btn ${z.k===cur?'g':'c'} zfn" data-zfn="${z.k}" ${off?'aria-disabled="true"':''}>${UIIMG(z.ic,22)}<span><b>${z.n}</b><small>${off?'🔒 Cấp '+z.lv:z.d}</small></span></button>`;}).join('')}</div>`
  +`<button class="btn c" id="zfnLater">${change?'Đóng':'Để sau'}</button>`;
 box.classList.add('open');
 box.querySelectorAll('[data-zfn]').forEach(b=>b.onclick=()=>{const k=b.dataset.zfn;if(k===cur){box.classList.remove('open');return;}if(setZoneFn(id,k,change&&!!cur))box.classList.remove('open');});
 document.getElementById('zfnLater').onclick=()=>box.classList.remove('open');
}
// Nhãn công năng trên bản đồ: hiện khi đang ở chế độ Xây dựng.
function drawZoneLabels(c){
 const exp=document.getElementById('pExpand');if((typeof tool==='undefined'||tool==='pan')&&!(exp&&exp.classList.contains('open')))return;
 c.save();c.font='bold 11px sans-serif';c.textAlign='center';c.textBaseline='middle';
 for(const p of PLOTS){if(!UNLOCKED.has(p[0])||!p[0])continue;const z=zoneFn(p[0]);const t=z?z.n:`${p[1]} · chưa chọn công năng`;
  const [cx,cy]=iso((p[2]+p[4]+1)/2,(p[3]+p[5]+1)/2);const w=c.measureText(t).width+12;
  c.fillStyle=z?'rgba(255,246,227,.92)':'rgba(255,255,255,.75)';c.strokeStyle='#6B3512';c.lineWidth=1;
  c.beginPath();c.roundRect?c.roundRect(cx-w/2,cy-9,w,18,9):c.rect(cx-w/2,cy-9,w,18);c.fill();c.stroke();
  c.fillStyle='#4A2A12';c.fillText(t,cx,cy+.5);}
 c.restore();
}
