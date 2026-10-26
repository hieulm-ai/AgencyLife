// ---------- Kho (V15, Cửa hàng → Kho) ----------
// Kho giữ vật phẩm chưa đặt: đồ cất từ văn phòng (Di chuyển → Cất kho), đồ mua để dành (nút Vào kho khi đặt mới)
// và vật phẩm phần thưởng (thành tựu, Pass tuần). Đặt lại từ kho không tốn tiền; bán từ kho hoàn REFUND giá trị như bán đồ đang đặt.
// GS.store = {id nội thất: số lượng}; GS.storeLog = 12 lần nhận gần nhất; GS.storeNew = số phần thưởng mới chưa xem.
const STORE_MAX=99;
// Thành tựu có thêm quà vật phẩm (ngoài ruby). Bản lưu cũ đã đạt thành tựu được nhận bù đúng 1 lần (GS.achItems).
const ACH_ITEMS={jobs10:'potted_plant',lv2:'decorative_blue_mark',jobs50:'big_tree'};
let storePick=null;   // id món đang chọn đặt từ kho (công cụ Nội thất)
function ensureStore(){
 if(!GS.store||typeof GS.store!=='object'||Array.isArray(GS.store))GS.store={};
 for(const k of Object.keys(GS.store)){const n=GS.store[k];if(!FBY[k]||!Number.isInteger(n)||n<=0)delete GS.store[k];else if(n>STORE_MAX)GS.store[k]=STORE_MAX;}
 if(!Array.isArray(GS.storeLog))GS.storeLog=[];
 if(!Number.isInteger(GS.storeNew)||GS.storeNew<0)GS.storeNew=0;
 return GS.store;
}
function storeCount(id){return ensureStore()[id]||0;}
function storeTotal(){return Object.values(ensureStore()).reduce((a,b)=>a+b,0);}
function storeValue(id){const f=FBY[id];return f?Math.round((f.gem?f.gem*RUBY_COIN:f.price)*REFUND*100)/100:0;}
function addToStore(id,n=1,src='put',note=''){
 if(!FBY[id]||!Number.isInteger(n)||n<=0)return false;
 const st=ensureStore();if((st[id]||0)+n>STORE_MAX)return false;
 st[id]=(st[id]||0)+n;
 GS.storeLog.unshift({day:GS.day,id,n,src,note:String(note).slice(0,60)});GS.storeLog=GS.storeLog.slice(0,12);
 if(src==='reward')GS.storeNew+=n;
 return true;
}
function takeFromStore(id,n=1){const st=ensureStore();if((st[id]||0)<n)return false;st[id]-=n;if(!st[id])delete st[id];return true;}
function grantStoreItem(id,why){
 if(!addToStore(id,1,'reward',why))return false;
 toast(`${why}: nhận ${FBY[id].name} · đã vào Kho`,'ok');
 if(typeof addOfficeNews==='function')addOfficeNews('reward',`${why}: ${FBY[id].name} vào Kho`);
 return true;
}
// Gọi cùng checkAch(): quà vật phẩm cho thành tựu đã đạt (kể cả đạt từ bản trước) — mỗi thành tựu 1 lần.
function grantAchItems(){
 if(!GS.achItems||typeof GS.achItems!=='object'||Array.isArray(GS.achItems))GS.achItems={};
 let n=0;
 for(const [k,item] of Object.entries(ACH_ITEMS)){
  if(!GS.ach?.[k]||GS.achItems[k])continue;
  const row=(typeof ACH!=='undefined'?ACH:[]).find(a=>a[0]===k);
  if(grantStoreItem(item,`Thành tựu "${row?row[1]:k}"`)){GS.achItems[k]=1;n++;}
 }
 if(n)save();
 return n;
}
function sellFromStore(id){
 if(!takeFromStore(id))return false;
 const back=storeValue(id);cash=Math.round((cash+back)*100)/100;
 hud();save();toast(`Đã bán ${FBY[id].name} từ kho · +${fmt(back)}`,'ok');renderStore();return true;
}
// Cất món đang nhấc (Di chuyển) vào kho, hoặc mua món đang chọn (Nội thất) để dành trong kho.
function stashPend(){
 if(!pend)return false;
 if(pend.store){toast('Món này đang lấy từ kho, chọn chỗ đặt hoặc bấm Từ chối','err');return false;}
 const before=JSON.stringify(ensureStore());
 if(pend.mode==='buy'){
  const f=FBY[pend.id];
  if(f.gem){if(GS.gems<f.gem){toast(`Thiếu ruby: cần ${f.gem}💎`,'err');return false;}}
  else if(!UNLIM&&f.price>cash+1e-9){toast(`Không đủ tiền: cần ${fmt(f.price)}`,'err');return false;}
  if(!addToStore(pend.id,1,'buy')){toast('Kho đã đủ 99 món này','err');return false;}
  if(f.gem)GS.gems-=f.gem;else{cash=Math.round((cash-f.price)*100)/100;if(typeof ledgerSpend==='function')ledgerSpend('build',f.price);}
  undo.push({before:[],cost:f.gem?0:f.price,gem:f.gem||0,objs:null,store:before});document.getElementById('bUndo').disabled=false;
  pend=null;renderPendBar();hud();save();renderStore();
  toast(`Đã mua ${f.name} và cất vào Kho · −${f.gem?f.gem+'💎':fmt(f.price)}`,'ok');return true;
 }
 const o=OBJS.find(b=>b.uid===pend.uid);if(!o){pend=null;renderPendBar();return false;}
 const ch=pend.carry!=null?OBJS.find(b=>b.uid===pend.carry):null;
 if(storeCount(o.id)+1+(ch&&ch.id===o.id?1:0)>STORE_MAX||(ch&&storeCount(ch.id)+1>STORE_MAX)){toast('Kho đã đủ 99 món này','err');return false;}
 undo.push({before:[],cost:0,objs:JSON.stringify(OBJS),store:before});document.getElementById('bUndo').disabled=false;
 addToStore(o.id,1,'put');if(ch)addToStore(ch.id,1,'put');
 const gone=new Set([o.uid,...(ch?[ch.uid]:[])]);
 OBJS=OBJS.filter(b=>!gone.has(b.uid));pend=null;
 standUp(gone);rebuild();assignSeats();unstick();hud();save();renderPendBar();renderStore();
 toast(`Đã cất ${FBY[o.id].name}${ch?' kèm ghế':''} vào Kho`,'ok');return true;
}
// Đặt món lấy từ kho: không tốn tiền. Bàn làm việc lấy ghế trong kho trước, không có thì mua ghế như khi đặt mới.
function placeFromStore(p){
 if(!storeCount(p.id)){toast('Kho không còn món này','err');return false;}
 const before=JSON.stringify(ensureStore());
 undo.push({before:[],cost:0,objs:JSON.stringify(OBJS),store:before});document.getElementById('bUndo').disabled=false;
 takeFromStore(p.id);
 const f=FBY[p.id],no={uid:nextUid++,id:p.id,gx:p.gx,gy:p.gy,rot:p.rot};OBJS.push(no);dq('place');rebuildOcc();
 let msg=`Đã đặt ${f.name} từ Kho`,kind='ok';
 if(DESKS.has(p.id)){
  const sp=deskChairSpot(no),ch=FBY.office_chair_blue,free=at(sp.x,sp.y)===0&&!OCC.has(sp.x+','+sp.y)&&!agentTiles().has(sp.x+','+sp.y);
  if(free&&takeFromStore('office_chair_blue')){OBJS.push({uid:nextUid++,id:'office_chair_blue',gx:sp.x,gy:sp.y,rot:sp.rot});msg+=' kèm ghế trong kho';}
  else if(free&&(UNLIM||cash>=ch.price)){OBJS.push({uid:nextUid++,id:'office_chair_blue',gx:sp.x,gy:sp.y,rot:sp.rot});cash=Math.round((cash-ch.price)*100)/100;if(typeof ledgerSpend==='function')ledgerSpend('build',ch.price);undo[undo.length-1].cost+=ch.price;msg+=` · mua thêm ghế −${fmt(ch.price)}`;}
  else{msg+=', chưa kèm được ghế (ô trước bàn không trống hoặc thiếu tiền)';kind='err';}
 }
 if(!storeCount(p.id)){storePick=null;fSel=null;document.querySelectorAll('.ci').forEach(x=>x.setAttribute('aria-selected','false'));}
 rebuild();hud();save();renderStorePick();renderStore();toast(msg,kind);return true;
}
function startStorePlace(id){
 if(!storeCount(id))return false;
 openHub('build','furn');
 storePick=id;fSel=id;fRot=0;if(pend&&pend.mode==='buy'){pend=null;renderPendBar();}
 document.querySelectorAll('.ci').forEach(x=>x.setAttribute('aria-selected',x.dataset.id===id));
 renderStorePick();toast('Bấm lên sàn để chọn chỗ đặt món lấy từ Kho','ok');return true;
}
function cancelStorePick(){storePick=null;if(fSel&&!FBY[fSel])fSel=null;renderStorePick();}
function renderStorePick(){
 const el=document.getElementById('storePick');if(!el)return;
 if(!storePick||!storeCount(storePick)){el.hidden=true;el.innerHTML='';return;}
 el.hidden=false;el.innerHTML=`<span>Đang đặt từ <b>Kho</b>: ${FBY[storePick].name} (còn ${storeCount(storePick)})</span><button class="btn c" data-store-cancel>Hủy</button>`;
 el.querySelector('[data-store-cancel]').onclick=()=>{storePick=null;fSel=null;document.querySelectorAll('.ci').forEach(x=>x.setAttribute('aria-selected','false'));if(pend&&pend.store){pend=null;renderPendBar();}renderStorePick();};
}
const STORE_SRC={put:'Cất từ văn phòng',buy:'Mua để dành',reward:'Phần thưởng'};
function renderStore(){
 const el=document.getElementById('storeBody');if(!el)return;
 const st=ensureStore(),ids=FURN.map(f=>f.id).filter(id=>st[id]);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=ids.map(id=>{const f=FBY[id];return `<div class="pack store-item"><span class="th"><img alt="" src="${f.views[0].src}"></span><span><b>${f.name}</b> <span class="store-n">×${st[id]}</span><br><small>${f.views[0].fp[0]}×${f.views[0].fp[1]} ô · bán lại +${fmt(storeValue(id))}</small></span><span class="store-act"><button class="btn g" data-store-place="${id}">Đặt</button><button class="btn c" data-store-sell="${id}">Bán</button></span></div>`;}).join('');
 const log=GS.storeLog.slice(0,6).map(r=>`<div class="row"><span>N${r.day} · ${STORE_SRC[r.src]||''}${r.note?' · '+esc(r.note):''}</span><b>${FBY[r.id]?FBY[r.id].name:''}</b></div>`).join('');
 el.innerHTML=`<details class="compact-details"><summary>Cách dùng kho ⓘ</summary><p class="hub-note">Đồ trong kho đặt lại <b>không mất tiền</b>. Cất đồ: Xây dựng → Di chuyển → nhấc món đồ → <b>Cất kho</b>. Mua để dành: khi đặt món mới, bấm <b>Vào kho</b>. Bán từ kho hoàn ${Math.round(REFUND*100)}% giá.</p></details>`
  +`<div class="cg2">Trong kho · ${storeTotal()} món</div>`+(rows||'<p class="hub-note">Kho đang trống.</p>')
  +(log?`<details class="compact-details"><summary>Gần đây</summary>${log}</details>`:'')
  +`<details class="compact-details"><summary>Phần thưởng vật phẩm</summary><p class="hub-note">${Object.entries(ACH_ITEMS).map(([k,id])=>{const r=(typeof ACH!=='undefined'?ACH:[]).find(a=>a[0]===k);return `${r?r[1]:k}: ${FBY[id]?FBY[id].name:id}${GS.achItems?.[k]?' ✓':''}`;}).join(' · ')} · Pass tuần mốc cuối: Cây chậu lớn.</p></details>`;
 el.innerHTML=gemify(el.innerHTML);
 el.querySelectorAll('[data-store-place]').forEach(b=>b.onclick=()=>startStorePlace(b.dataset.storePlace));
 el.querySelectorAll('[data-store-sell]').forEach(b=>b.onclick=async()=>{const id=b.dataset.storeSell;if(await askConfirm({title:'Bán từ kho?',text:`Bán 1 ${FBY[id].name} · nhận ${fmt(storeValue(id))} coin.`,ok:'Bán',icon:'coin'}))sellFromStore(id);});
}
