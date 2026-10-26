// First three completed jobs teach decisions without stopping office simulation.
// Chọn ý tưởng mở khi job tới bước Sáng tạo (sau Brief và Chia việc).
function atCreative(j){ const i=Array.isArray(j&&j.stg)?j.stg.findIndex(s=>s&&s.k==='creative'):-1; return j.cur>=(i<0?2:i); }
const EARLY_CHOICE_MIN=20;
function earlyNow(){return GS.day*1440+GS.min;}
function earlyEligible(){return GS.day<=3&&(GS.done||0)<3;}
function earlyState(j){return j.early||(j.early={});}
function earlyPending(j,kind){const e=earlyState(j);if(e[kind])return false;e[kind+'At']??=earlyNow();return true;}
function earlyChoose(id,kind,value){
 const j=[...GS.offers,...GS.jobs].find(j=>j.id===id);if(!j)return;
 const e=earlyState(j);if(e[kind])return;
 if(kind==='brief'){
  if(!j.received||!GS.offers.includes(j))return;
  e.brief=value;acceptJob(id);
  if(!GS.jobs.includes(j)){delete e.brief;return;}
  toast(value==='playful'?'Khách thích phong cách vui nhộn!':'Khách đã chốt brief rõ ràng!','ok');
 }else if(kind==='idea'){
  if(!GS.jobs.includes(j)||!atCreative(j))return;
  e.idea=value;
  if(value==='bold'){const s=j.stg.find(s=>s.k==='creative');if(s){const add=s.need*.15;s.need+=add;j.need+=add;}}
 }else if(kind==='review'){
  if(j.work<j.need-1e-6)return;
  e.review=value;
  if(value==='polish'){const s=j.stg.find(s=>s.k==='prod');const add=s.need*.15;s.need+=add;j.need+=add;j.reward=Math.round(j.reward*1.05*10)/10;ensureStages(j);}
 }
 save();renderJobs();earlyRender();
}
function earlyReviewReady(j){
 if(!j.early)return true;
 return !!j.early.review;
}
function earlyWater(){
 const j=GS.offers.find(j=>!j.received&&!j.earlyWater&&VIS.some(v=>v.jobId===j.id&&v.state!=='leave'));
 if(!j)return;
 j.earlyWater=true;j.expire=(Number.isFinite(j.expire)?j.expire:earlyNow()+PATIENCE_MIN)+60;
 const v=VIS.find(v=>v.jobId===j.id);if(v)v.emo={k:'happy',t:4};
 toast('Mời nước · Khách chờ thêm 60 phút game','ok');save();earlyRender();
}
function earlyCheer(){
 if((GS.earlyCheerUntil||0)>earlyNow())return;
 const a=AG.find(a=>!a.away&&hasWorkFor(a));if(!a)return;
 GS.earlyCheerUntil=earlyNow()+60;
 a.stress=Math.max(0,a.stress-10);GS.earlyBoostUntil=earlyNow()+20;
 a.emo={k:'happy',t:4};toast('Cả đội cố lên! +15% tốc độ trong 20 phút game','ok');save();earlyRender();
}
let earlyPaintAt=-1;
let earlyDismissed=false;
function earlyTick(){
 if(!earlyEligible()&&!GS.jobs.some(j=>j.early&&!j.early.review)){document.getElementById('earlyPlay')?.remove();return;}
 const now=earlyNow();
 for(const j of GS.offers){if(!earlyEligible()||!j.received||missingReq(j).length)continue;
  if(earlyPending(j,'brief')&&now-j.early.briefAt>=EARLY_CHOICE_MIN)earlyChoose(j.id,'brief','clear');break;
 }
 for(const j of GS.jobs){
  if(!j.early&&earlyEligible())earlyState(j);if(!j.early)continue;
  if(atCreative(j)&&earlyPending(j,'idea')&&now-j.early.ideaAt>=EARLY_CHOICE_MIN)earlyChoose(j.id,'idea','safe');
  if(j.work>=j.need-1e-6&&earlyPending(j,'review')&&now-j.early.reviewAt>=EARLY_CHOICE_MIN)earlyChoose(j.id,'review','send');
 }
 if(Math.floor(now)!==earlyPaintAt){earlyPaintAt=Math.floor(now);earlyRender();}
}
function earlyRender(){
 if(earlyDismissed)return;
 if(!earlyEligible()&&!GS.jobs.some(j=>j.early&&!j.early.review))return;
 let box=document.getElementById('earlyPlay');if(!box){box=document.createElement('section');box.id='earlyPlay';box.className='pf';box.setAttribute('aria-label','Việc đầu tiên');document.body.append(box);}
 let j=GS.jobs.find(j=>j.early&&!j.early.review&&j.work>=j.need-1e-6),kind='review';
 if(!j){j=GS.jobs.find(j=>j.early&&!j.early.idea&&atCreative(j));kind='idea';}
 if(!j){j=GS.offers.find(j=>j.received&&!j.early?.brief&&!missingReq(j).length);kind='brief';}
 const choices={brief:[['clear','brief','Rõ ràng'],['playful','palette','Vui nhộn']],idea:[['safe','pen','An toàn'],['bold','star','Táo bạo · cược +1★']],review:[['send','clip','Gửi khách'],['polish','palette','Chỉnh thêm · +5% thưởng']]};
 const title={brief:'Chọn brief',idea:'Chọn ý tưởng',review:'Duyệt sản phẩm'};
 box.innerHTML=`<button class="early-close" aria-label="Đóng hướng dẫn" title="Đóng">×</button><b>${j?title[kind]:'Agency đầu tiên của bạn'}</b><small>${j?olEsc(j.name):'Đón khách · Làm job · Nhận thưởng'}</small>${j?`${kind==='review'?`<div class="early-preview">${jobArtwork(j)}<span>${j.early.brief==='playful'?'Vui nhộn':'Rõ ràng'} · ${j.early.idea==='bold'?'Táo bạo':'An toàn'}</span></div>`:''}<div class="early-actions">${choices[kind].map(([value,icon,label])=>`<button class="btn c" data-choice="${value}">${UIIMG(icon,28)}${label}</button>`).join('')}</div><small>Tự chọn ${kind==='review'?'Gửi khách':kind==='idea'?'An toàn':'Rõ ràng'} sau ${Math.max(0,Math.ceil(EARLY_CHOICE_MIN-(earlyNow()-(j.early?.[kind+'At']??earlyNow()))))} phút game</small>`:''}<div class="early-actions"><button class="btn c" id="earlyWater" ${GS.offers.some(o=>!o.received&&!o.earlyWater)?'':'disabled'}>${UIIMG('coffee',20)}Mời nước</button><button class="btn c" id="earlyCheer" ${(GS.earlyCheerUntil||0)>earlyNow()?'disabled':''}>${UIIMG('heart',20)}Động viên</button><button class="btn c" id="earlyBuild">${UIIMG('chair',20)}Nội thất</button></div>`;
 box.querySelector('.early-close').onclick=e=>{e.stopPropagation();earlyDismissed=true;box.remove();};
 // Điện thoại: đang mở bảng thì thẻ thu thành nút nhỏ; chạm vào thì đóng bảng để chọn.
 box.onclick=e=>{if(document.body.classList.contains('hub-open')&&getComputedStyle(box).getPropertyValue('--early-mini').trim()==='1'){e.preventDefault();e.stopPropagation();if(typeof closeHub==='function')closeHub();}};
 box.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>earlyChoose(j.id,kind,b.dataset.choice));
 box.querySelector('#earlyWater').onclick=earlyWater;box.querySelector('#earlyCheer').onclick=earlyCheer;box.querySelector('#earlyBuild').onclick=()=>document.getElementById('bBuild')?.click();
}
