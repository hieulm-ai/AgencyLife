// ---------- Hệ thống bảng UI (V15, 07/10/2026) ----------
// Thanh dưới: 5 trung tâm (Công việc · Đội ngũ · Xây dựng · Cửa hàng · Thành tựu). 14/10: bỏ ô Gói VIP, VIP nằm trong Cửa hàng → Cửa hàng ruby.
// Góc trên phải: Hôm nay · Bảng tin · Hướng dẫn (guide.js) · Cài đặt. Dải trên: nhân sự, coin, ruby, đồng hồ (không có nút tốc độ).
// Mọi bảng mở trong 1 ngăn phải dùng chung (#hub): 1 ngăn tại 1 lúc, tiêu đề cố định, tối đa 4 tab và nhớ tab lần trước, ✕ hoặc Esc để đóng.
// Các trang bên trong giữ id cũ (#jobs, #staff, #cat, #pGem, #pQuest, #pToday, #pNews, #menu): trang đang xem có lớp .open như trước.
const HUBS={
 work:{title:'Công việc',icon:'brief',btn:'bJobs',tabs:[
  {id:'offers',label:'Chờ',page:'jobs',jtab:'offers',count:()=>GS.offers.length},
  {id:'active',label:'Đang làm',page:'jobs',jtab:'active',count:()=>`${GS.jobs.length}/${jobCapacity()}`},
  {id:'deliver',label:'Thu tiền',page:'jobs',jtab:'deliver',count:()=>(GS.pickups||[]).length+(GS.receivables||[]).length||''},
  {id:'income',label:'Thu khác',page:'jobs',jtab:'income'}]},
 team:{title:'Đội ngũ',icon:'people',btn:'bStaff',tabs:[
  {id:'staff',label:'Đội',page:'staff',stab:'team',count:()=>AG.length},
  {id:'hire',label:'Tuyển',page:'staff',stab:'hire'}]},
 build:{title:'Xây dựng',icon:'hammer',btn:'bBuild',tabs:[
  {id:'furn',label:'Nội thất',page:'cat',tool:'furn'},
  {id:'walls',label:'Tường & sàn',page:'pBuild',tool:'wall'},
  {id:'move',label:'Di chuyển',page:'pMove',tool:'move'},
  {id:'land',label:'Mở rộng',page:'pExpand'}]},
 shop:{title:'Cửa hàng',icon:'shop',btn:'bShop',tabs:[
  {id:'shop',label:'Cửa hàng ruby',page:'pGem',gem:'shop'},   // 14/10: gom mọi thứ tiêu ruby (gói, đồ mặc, nạp ruby, VIP) về một chỗ
  {id:'topup',label:'Nạp coin',page:'pTopup'},
  {id:'store',label:'Kho',page:'pStore',count:()=>storeTotal()||''}]},
 ach:{title:'Thành tựu',icon:'trophy',btn:'bAch',tabs:[
  {id:'quests',label:'Nhiệm vụ',page:'pQuest'},
  {id:'pass',label:'Quà & Pass',page:'pGem',gem:'earn',count:()=>passClaimable()||''},
  {id:'ach',label:'Thành tựu',page:'pGem',gem:'achievements'}]},
 today:{title:'Hôm nay',icon:'chart',btn:'bToday',tabs:[{id:'today',page:'pToday'}]},
 friends:{title:'Bạn bè',icon:'friends',btn:'bFriends',tabs:[{id:'friends',label:'Bạn bè',page:'pFriends',count:()=>OL.user?OL.friends.length:''},{id:'requests',label:'Lời mời',page:'pRequests',count:()=>OL.user&&OL.req.incoming.length||''},{id:'rank',label:'Xếp hạng',page:'pRank'}]},
 news:{title:'Hộp thư',icon:'mail',btn:'bMail',tabs:[{id:'mail',label:'Thư',page:'pMail',count:()=>OL.user&&olUnclaimed()||''},{id:'news',label:'Bảng tin',page:'pNews'}]},
 settings:{title:'Cài đặt',icon:'gear',btn:'bMenu',tabs:[{id:'settings',page:'menu'}]}};
const BUILD_TOOLS=['furn','wall','door','window','floor','erase','move'], WALL_TOOLS=['wall','door','window','floor','erase'];
let hubKey=null, hubTab=null;
const hubMem={};   // tab mở lần trước của từng trung tâm (trong phiên chơi)
function hubPage(){const t=hubKey&&HUBS[hubKey].tabs.find(x=>x.id===hubTab);return t?t.page:null;}
function openHub(key,tabId,opts={}){
 const H=HUBS[key];if(!H||VISIT)return;
 if(hubKey===key&&!tabId&&!opts.keep){closeHub();return;}   // bấm lại nút đang mở để đóng
 if(hubKey&&hubKey!==key)leaveHub(hubKey);
 hubKey=key;
 const hub=document.getElementById('hub');hub.hidden=false;hub.setAttribute('aria-label',H.title);document.getElementById('wrap').classList.add('hub-open');document.body.classList.add('hub-open');
 document.getElementById('hubTitle').textContent=H.title;document.getElementById('hubIc').innerHTML=UIIMG(H.icon,30);
 for(const [k,h] of Object.entries(HUBS)){const b=document.getElementById(h.btn);if(!b)continue;b.setAttribute('aria-expanded',String(k===key));if(b.classList.contains('nb'))b.setAttribute('aria-pressed',String(k===key));}
 document.getElementById('agentCard')?.classList.remove('open');
 const t=H.tabs.find(x=>x.id===tabId)||H.tabs.find(x=>x.id===hubMem[key])||H.tabs[0];
 renderHubTabs();showHubTab(t.id,opts);
}
function leaveHub(key){
 if(key==='build'){storePick=null;renderStorePick();if(tool!=='pan')setTool('pan',{hub:true});}
 if(key==='work')teamEditorJob=null;
}
function closeHub(){
 if(!hubKey)return;
 const key=hubKey;leaveHub(key);hubKey=null;hubTab=null;
 document.getElementById('hub').hidden=true;document.getElementById('wrap').classList.remove('hub-open');document.body.classList.remove('hub-open');
 document.querySelectorAll('#hubBody>.hub-page').forEach(p=>p.classList.remove('open'));
 for(const h of Object.values(HUBS)){const b=document.getElementById(h.btn);if(!b)continue;b.setAttribute('aria-expanded','false');if(b.classList.contains('nb'))b.setAttribute('aria-pressed','false');}
 updateCtxBar();
}
function renderHubTabs(){
 const el=document.getElementById('hubTabs'),H=HUBS[hubKey];
 el.hidden=H.tabs.length<2;
 el.innerHTML=H.tabs.length<2?'':H.tabs.map(t=>`<button class="hub-tab" role="tab" data-hub-tab="${t.id}" aria-selected="false" aria-controls="hubBody">${t.label}<span class="hub-cnt"></span></button>`).join('');
 el.querySelectorAll('[data-hub-tab]').forEach(b=>b.onclick=()=>showHubTab(b.dataset.hubTab));
 updateHubTabs();
}
function updateHubTabs(){
 if(!hubKey)return;
 for(const t of HUBS[hubKey].tabs){const c=document.querySelector(`[data-hub-tab="${t.id}"] .hub-cnt`);if(!c)continue;const v=t.count?String(t.count()):'';c.textContent=v?` (${v})`:'';}
}
function showHubTab(id,opts={}){
 const H=HUBS[hubKey];if(!H)return;const t=H.tabs.find(x=>x.id===id)||H.tabs[0];
 hubTab=t.id;hubMem[hubKey]=t.id;
 document.querySelectorAll('#hubBody>.hub-page').forEach(p=>p.classList.toggle('open',p.id===t.page));
 document.querySelectorAll('[data-hub-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.hubTab===t.id)));
 if(t.jtab)document.getElementById('jobs').dataset.tab=t.jtab;
 if(t.stab)document.getElementById('staff').dataset.tab=t.stab;
 if(t.gem)gemTab=t.gem;
 if(hubKey==='build'){
  const want=opts.tool&&BUILD_TOOLS.includes(opts.tool)?opts.tool:t.id==='walls'?(WALL_TOOLS.includes(tool)?tool:'wall'):(t.tool||'pan');
  if(tool!==want)setTool(want,{hub:true});else updateCtxBar();
  if(t.id!=='furn'&&storePick){storePick=null;renderStorePick();}
 }
 const page=t.page;
 if(page==='jobs')renderJobs();
 else if(page==='staff')renderStaff();
 else if(page==='pGem')renderGemShop();
 else if(page==='pTopup')renderTopup(opts.focus);
 else if(page==='pStore'){GS.storeNew=0;renderStore();updateHubBadges();}
 else if(page==='pExpand')renderExpandPage(true);
 else if(page==='pQuest')renderDailyQuests();
 else if(page==='pNews')renderOfficeNews();
 else if(page==='pFriends'){renderFriends();olRefreshSocial();}
 else if(page==='pRequests')renderRequests();
 else if(page==='pRank'){renderRank();olRefreshSocial();}
 else if(page==='pMail'){renderMail();olRefreshSocial();}
 else if(page==='menu'){olRenderAccount();try{document.getElementById('bUndoImport').hidden=!localStorage.getItem(SAVE+'.before-import');}catch(e){document.getElementById('bUndoImport').hidden=true;}}
 else if(page==='pToday')updatePanels();
 if(!opts.focus)document.getElementById('hubBody').scrollTop=0;
 updateHubTabs();
}
function passClaimable(){
 if(typeof ensureWeeklyPass!=='function')return 0;ensureWeeklyPass();
 return GS.weeklyPass.weeks.reduce((n,w)=>n+PASS_MILESTONES.filter((m,i)=>w.jobs>=m.jobs&&!w.claimed.includes(i)).length,0);
}
// Chấm đỏ trên thanh dưới: Công việc = khách chờ; Xây dựng = đủ tiền mở khu; Cửa hàng = phần thưởng mới trong Kho; Thành tựu = thưởng Pass chưa nhận.
function updateHubBadges(){
 const show=(id,v)=>{const b=document.getElementById(id);if(!b)return;b.textContent=v||'';b.style.display=v?'flex':'none';};
 show('jobBadge',GS.offers.length);
 show('expBadge',(cash>=plotPrice()&&PLOTS.some(p=>!UNLOCKED.has(p[0])&&canUnlock(p)))?'!':'');
 show('storeBadge',ensureStore()&&GS.storeNew);
 show('questBadge',passClaimable());
}
// Thanh ngữ cảnh 1 tầng: chỉ hiện khi đang dùng công cụ xây dựng; có Hoàn tác và Xong.
const CTX_TEXT={wall:['brick','Tường · kéo trên sàn để xây'],door:['door','Cửa · bấm vào tường'],window:['win','Cửa sổ · bấm vào tường'],floor:['tile','Nền · kéo để lát'],erase:['hammer','Phá · bấm tường hoặc món đồ để bán (hoàn 50%)'],move:['hand','Di chuyển · bấm vào món đồ để nhấc lên']};
function updateCtxBar(){
 const bar=document.getElementById('ctxbar');if(!bar)return;
 const on=BUILD_TOOLS.includes(tool);bar.hidden=!on;if(!on)return;
 let ic='chair',text='Nội thất · chọn món trong danh sách';
 if(tool==='furn'){if(storePick)text=`Đặt từ Kho · ${FBY[storePick].name}`;else if(fSel&&FBY[fSel])text=`Nội thất · ${FBY[fSel].name} · bấm lên sàn`;}
 else [ic,text]=CTX_TEXT[tool];
 document.getElementById('ctxIc').innerHTML=UIIMG(ic,24);document.getElementById('ctxText').textContent=text;
}
// Hộp giữa màn hình chỉ để xác nhận (thay confirm() của trình duyệt — trong khung nhúng confirm() có thể bị chặn).
let askResolve=null;
function askConfirm({title,text='',html='',ok='Đồng ý',cancel='Hủy',danger=false,icon=null}){
 if(askResolve){askResolve(false);askResolve=null;}
 const box=document.getElementById('askBox');
 document.getElementById('askTitle').textContent=title;const tx=document.getElementById('askText');if(html)tx.innerHTML=html;else tx.textContent=text;   // html: chỉ dùng cho nội dung cố định trong game
 document.getElementById('askIc').innerHTML=icon?UIIMG(icon,40):'';
 const yes=document.getElementById('askYes'),no=document.getElementById('askNo');
 yes.textContent=ok;yes.className='btn '+(danger?'rd':'g');no.textContent=cancel;no.hidden=cancel==null;
 box.hidden=false;
 return new Promise(res=>{
  const done=v=>{box.hidden=true;askResolve=null;box.onkeydown=null;res(v);};
  askResolve=done;yes.onclick=()=>done(true);no.onclick=()=>done(false);
  box.onclick=e=>{if(e.target===box)done(false);};
  box.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false);}};
  (cancel==null?yes:no).focus();
 });
}
// Bản lưu cũ (đã chơi trước V15): báo 1 lần các bảng đã chuyển đi đâu.
function showUiNotice(){
 if(GS.uiV15Seen||!GS.player||!(GS.tourDone||(GS.done||0)>0||(GS.day||1)>1))return false;
 GS.uiV15Seen=true;save();
 askConfirm({title:'Giao diện mới',icon:'trophy',ok:'Đã hiểu',cancel:null,html:'<ul class="ask-list"><li><b>Công việc</b>: khách chờ, đang làm, bàn giao & công nợ, nguồn thu khác.</li><li><b>Đội ngũ</b>: nhân sự, tuyển dụng, trang phục.</li><li><b>Xây dựng</b>: nội thất, tường & sàn, di chuyển, mở rộng khu đất.</li><li><b>Cửa hàng</b>: gói hỗ trợ, nạp, và <b>Kho</b> mới để cất đồ.</li><li><b>Thành tựu</b> (cúp): nhiệm vụ, quà & Pass tuần, thành tựu.</li><li>Đồng hồ ở dải trên; Hướng dẫn có biểu tượng riêng ở góc trên phải.</li></ul>'});
 return true;
}
function askOpen(){return !document.getElementById('askBox').hidden;}
function showSoon(){return askConfirm({title:'Tính năng sắp mở',text:'Gói VIP chưa mở trong bản chơi thử này.',ok:'Đã hiểu',cancel:null,icon:'crown'});}
// Nạp (tab trong Cửa hàng). Bản chơi thử: chưa nối cổng thanh toán, bấm Nhận để thử luồng nạp.
// Nạp coin (tab trong Cửa hàng); nạp ruby nằm trong Cửa hàng ruby. Bản chơi thử: chưa nối cổng thanh toán.
const TOPUP_GEM=[[60,'Túi nhỏ'],[300,'Rương'],[980,'Kho báu']];
function topupCard(kind,[v,n],tier){return `<div class="pack"><span class="ic">${UIIMG(kind==='gem'?'gem':'coin',36)}</span><span><b>${kind==='gem'?v+' 💎':fmt(v)}</b><br><small>${n}</small></span><button class="btn g" data-tp-kind="${kind}" data-tp="${v}" data-tier="${tier}">Mua</button></div>`;}
function bindTopup(el){el.querySelectorAll('[data-tp]').forEach(b=>b.onclick=()=>openSupportDrink(b.dataset.tpKind,+b.dataset.tp,+b.dataset.tier));}
function renderTopup(focus){
 const el=document.getElementById('topupBody');if(!el)return;
 const coin=[[Math.round(plotPrice()*0.2),'Túi coin'],[Math.round(plotPrice()*0.5),'Bao coin'],[plotPrice(),'Két coin']];
 el.innerHTML=gemify(`<p class="hub-note">Bản chơi thử: chưa kết nối cổng thanh toán. Chọn gói để mời NPH một cốc nước ☕. Nạp ruby ở tab Cửa hàng ruby.</p><div class="cg2" id="topCoin">Nạp coin</div>${coin.map((x,i)=>topupCard('coin',x,i)).join('')}`);
 bindTopup(el);
}
function openTopup(kind){if(kind==='gem'){gemSub='topup';openHub('shop','shop',{keep:true});return;}openHub('shop','topup',{keep:true,focus:'coin'});}
// Mở rộng (tab trong Xây dựng): giá khu tiếp theo, số dư và các khu liền kề mở được.
function renderExpandPage(force){
 const el=document.getElementById('expandBody');if(!el)return;
 const adj=PLOTS.filter(p=>!UNLOCKED.has(p[0])&&canUnlock(p)),np=plotPrice(),pct=Math.max(0,Math.min(100,cash/np*100)).toFixed(0);
 const XP=xpProgress(),zlv=nextZoneLv(),zok=agencyLevel()>=zlv,nu=nextUnlock(),mine=PLOTS.filter(p=>p[0]&&UNLOCKED.has(p[0]));
 // 15/10/2026: cấp agency theo XP; khu mới cần đủ cấp + đủ tiền; mỗi khu chọn công năng.
 const html=gemify(`<div class="row"><span>Cấp agency</span><b>LV ${XP.lv}${XP.need?` · ${XP.xp}/${XP.need} XP`:' · tối đa'}</b></div><div class="pbar"><i style="width:${XP.pct.toFixed(0)}%"></i><span>XP từ job hoàn thành và nhiệm vụ ngày</span></div>`
  +(nu?`<p class="hub-note"><b>Cấp ${nu.lv} mở:</b> ${nu.items.join(' · ')}</p>`:'')
  +`<div class="row"><span>Khu tiếp theo (thứ ${UNLOCKED.size+1})</span><b>${UNLOCKED.size>=PLOTS.length?'—':zok?fmt(np):'Cần cấp '+zlv}</b></div><div class="row"><span>Số dư</span><b>${fmt(Math.round(cash*10)/10)}</b></div><div class="pbar"><i style="width:${pct}%"></i><span>${cash>=np?'Đủ tiền mở khu mới':'Còn thiếu '+fmt(Math.round((np-cash)*10)/10)}</span></div>`
  +(adj.length?`<div class="cg2">Chọn khu liền kề để mở</div><div class="land-grid">${adj.map(p=>`<button class="btn ${zok?'y':'c'}" data-pl="${p[0]}" ${zok?'':'aria-disabled="true"'}>${p[1]}<small>${zok?`${p[4]-p[2]+1}×${p[5]-p[3]+1} ô`:'🔒 Cấp '+zlv}</small></button>`).join('')}</div>`:'<p class="hub-note">Đã mở hết khu đất.</p>')
  +(mine.length?`<div class="cg2">Công năng các khu</div><div class="zfn-mine">${mine.map(p=>{const z=zoneFn(p[0]);return `<button class="btn c" data-zf="${p[0]}">${UIIMG(z?z.ic:'tile',20)}<span><b>Khu ${p[0]}: ${z?z.n:'chưa chọn'}</b><small>${z?z.d:'Chạm để chọn công năng'}</small></span></button>`;}).join('')}</div>`:'')
  +`<p class="hub-note">Mỗi khu mở thêm: +3💎 và job nhiều tiền hơn. Chọn công năng để nhân viên làm đúng việc trong khu nhanh hơn. Bật chế độ Xây dựng để xem tên khu trên bản đồ.</p>`);
 if(!force&&el.dataset.sig===html)return;el.dataset.sig=html;el.innerHTML=html;
 el.querySelectorAll('[data-pl]').forEach(b=>b.onclick=()=>askUnlock(+b.dataset.pl));
 el.querySelectorAll('[data-zf]').forEach(b=>b.onclick=()=>askZoneFn(+b.dataset.zf,!!zoneFn(+b.dataset.zf)));
}
// ----- nối nút -----
{
 const byId=id=>document.getElementById(id);
 for(const [k,h] of Object.entries(HUBS))byId(h.btn)?.addEventListener('click',()=>openHub(k));
 byId('hubX').onclick=closeHub;
 byId('ctxDone').onclick=closeHub;
 byId('cashPlus').onclick=()=>openTopup('coin');byId('gemPlus').onclick=()=>openTopup('gem');
 byId('pKeep').onclick=()=>stashPend();
}
// Bộ đếm ở dải trên nằm trong khoảng trống giữa khung agency và nút góc phải (ưu tiên giữa màn hình); chật thì thu gọn, hết chỗ mới xuống dòng.
{
 const hudWrap=document.getElementById('wrap'),counters=document.getElementById('res');
 const placeCounters=()=>{
  hudWrap.classList.remove('hud-stacked','hud-compact');counters.style.left='';counters.style.transform='';
  const w=hudWrap.getBoundingClientRect(),co=document.getElementById('co').getBoundingClientRect(),right=document.getElementById('topR').getBoundingClientRect();
  const fit=()=>{const lo=co.right-w.left+12,hi=right.left-w.left-12,need=counters.scrollWidth;if(need>hi-lo)return false;
   const left=Math.min(Math.max(w.width/2-need/2,lo),hi-need);counters.style.left=left+'px';counters.style.transform='none';return true;};
  if(fit())return;hudWrap.classList.add('hud-compact');if(fit())return;
  hudWrap.classList.remove('hud-compact');hudWrap.classList.add('hud-stacked');
 };
 const ro=new ResizeObserver(placeCounters);[hudWrap,counters,document.getElementById('co'),document.getElementById('topR')].forEach(el=>ro.observe(el));
 placeCounters();
}

function openSupportDrink(kind,value,tier){
 const names=['Bạc Xỉu','Katinat Bơ Già Dừa','Starbucks Matcha Latte'];
 const images=__SUPPORT_DRINK_IMAGES__;
 if(!Number.isInteger(tier)||tier<0||tier>2)return;
 olBox(`<h2>Mời NPH một cốc nước ☕</h2><img class="support-drink" src="${images[tier]}" alt="Vịt vàng dâng cốc ${names[tier]}"><p class="support-caption">Mua cho NPH 1 cốc ${names[tier]}</p><p class="hub-note">Bản thử · Chưa thu tiền</p><div class="ask-act"><button class="btn g" id="supportSoon">Tính năng sắp ra mắt</button></div>`,(el,close)=>{
 el.querySelector('#supportSoon').onclick=close;
 });
}
