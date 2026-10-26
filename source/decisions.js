// ---------- Giai đoạn A sau playtest 26/10: quyết định có hậu quả, sự kiện ngẫu nhiên, cảnh báo khách ----------
// Mọi tỷ lệ/hệ số dưới đây là THÔNG SỐ THỬ, cần chỉnh theo dữ liệu người chơi thật.
// A1  Job gấp: thưởng +40%, hạn ngắn hơn 1 ngày, trễ hạn trừ danh tiếng nặng (REP_LATE_RUSH thay vì −8).
// A2  Ý tưởng táo bạo (job lớn, sau 3 job đầu): xác suất thành công theo chất lượng đội; thành công +1★ & +30% thưởng, thất bại −1★, −15% thưởng, −5 danh tiếng.
// A3  Mỗi ngày (từ ngày 3) 70% có 1 sự kiện: khách khó tính, nhân viên ốm, đổi brief, đối thủ giành khách, khách cũ giới thiệu.
// A4  Cảnh báo khi khách đợi giao việc chỉ còn ≤ 45 phút game; giờ game chạy chậm (×0,35) khi đang mở bảng quan trọng.
const RUSH_P=.22, RUSH_REWARD=1.4, REP_LATE_RUSH=-20;
const BOLD_BASE=.55, BOLD_WIN_REWARD=1.3, BOLD_LOSE_REWARD=.85, BOLD_LOSE_REP=-5, BOLD_ASK_MIN=60;
const EVENT_DAY_P=.7, EVENT_FROM_DAY=3, PATIENCE_WARN=45, MENU_SLOW=.35;

function decEarly(){return typeof earlyEligible==='function'&&earlyEligible();}
function decNow(){return GS.day*1440+GS.min;}
function decAskBusy(){return (typeof askOpen==='function'&&askOpen())||(typeof repOpen==='function'&&repOpen())||(typeof tourOn!=='undefined'&&tourOn)||(typeof introOpen!=='undefined'&&introOpen)||(typeof titleOpen!=='undefined'&&titleOpen)||(typeof closingOffice!=='undefined'&&closingOffice);}
function decEsc(s){return String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');}
function decNews(k,m){if(typeof addOfficeNews==='function')addOfficeNews(k,m);}

// ----- A1: job gấp -----
function applyOfferTier(o,rnd=Math.random()){
 if(!o||o.vip||decEarly()||!(o.days>=2)||rnd>=RUSH_P)return o;
 o.rush=1;o.days-=1;o.reward=Math.round(o.reward*RUSH_REWARD*10)/10;return o;
}
function lateRepDelta(job){return job&&job.rush?REP_LATE_RUSH:-8;}
function rushChip(j){return j&&j.rush?`<span class="chip-rush" title="Thưởng +${Math.round((RUSH_REWARD-1)*100)}%, hạn ngắn hơn; trễ hạn ${REP_LATE_RUSH} danh tiếng">Gấp · trễ ${REP_LATE_RUSH} uy tín</span>`:'';}

// ----- A2: ý tưởng táo bạo -----
function isBigJob(j){return j.big!=null?!!j.big:(j.req&&j.req.length>0)||j.reward>=30;}
function ideaOf(j){return (j.early&&j.early.idea)||j.idea||null;}
function boldChance(j){const q=typeof jobQuality==='function'?jobQuality(j):.75;return Math.max(.3,Math.min(.8,BOLD_BASE+(q-.75)*.8));}
function chooseIdea(id,value){
 const j=GS.jobs.find(x=>x.id===id);if(!j||j.idea)return false;
 j.idea=value==='bold'?'bold':'safe';delete j.ideaAt;
 if(j.idea==='bold'){const s=(j.stg||[]).find(s=>s.k==='creative');if(s){const add=Math.round(s.need*.15*100)/100;s.need+=add;j.need+=add;}}
 toast(j.idea==='bold'?`Đi hướng táo bạo cho «${j.name}»: kết quả biết khi bàn giao`:`Đi hướng an toàn cho «${j.name}»`,'ok');
 if(typeof save==='function')save();if(typeof renderJobs==='function')renderJobs();return true;
}
async function askIdea(j){
 const pct=Math.round(boldChance(j)*100);
 const ok=await askConfirm({title:'Chọn hướng ý tưởng',icon:'star',ok:'Táo bạo',cancel:'An toàn',
  html:`<p>«${decEsc(j.name)}» tới bước Sáng tạo.</p><ul class="ask-list"><li><b>An toàn:</b> chắc chắn, chất lượng theo đội ngũ.</li><li><b>Táo bạo</b> (+15% giờ công bước Sáng tạo): khoảng <b>${pct}%</b> được khen (+1★, thưởng +${Math.round((BOLD_WIN_REWARD-1)*100)}%), còn lại bị chê (−1★, thưởng −${Math.round((1-BOLD_LOSE_REWARD)*100)}%, ${BOLD_LOSE_REP} danh tiếng).</li></ul><p class="hub-note">Đội càng đúng nghề, tỷ lệ thành công càng cao.</p>`});
 if(GS.jobs.includes(j)&&!j.idea)chooseIdea(j.id,ok?'bold':'safe');
}
// Gọi khi job hoàn thành, trước khi trả tiền và chấm sao.
function resolveIdea(j,rnd=Math.random()){
 if(ideaOf(j)!=='bold'||j.boldResult)return null;
 const win=rnd<boldChance(j);j.boldResult=win?'win':'lose';
 j.fbMod=(j.fbMod||0)+(win?.15:-.2);
 j.reward=Math.round(j.reward*(win?BOLD_WIN_REWARD:BOLD_LOSE_REWARD)*10)/10;
 if(!win&&typeof repAdd==='function')repAdd(BOLD_LOSE_REP);
 decNews(win?'job':'late',win?`Ý tưởng táo bạo «${j.name}» được khách khen · thưởng +${Math.round((BOLD_WIN_REWARD-1)*100)}%`:`Ý tưởng táo bạo «${j.name}» bị chê · thưởng −${Math.round((1-BOLD_LOSE_REWARD)*100)}%, ${BOLD_LOSE_REP} danh tiếng`);
 toast(win?`Táo bạo thành công: «${j.name}» được khen!`:`Táo bạo thất bại: khách chê «${j.name}»`,win?'ok':'err');
 return j.boldResult;
}
function ideaChip(j){const i=ideaOf(j);return i==='bold'?'<span class="chip-bold">Táo bạo</span>':'';}

// ----- A3: sự kiện ngẫu nhiên -----
function sickF(a){return GS.sick&&a&&typeof CHARS!=='undefined'&&GS.sick[CHARS[a.ci].id]===GS.day?.5:1;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function activeJobs(){return GS.jobs.filter(j=>!j.early&&j.work<j.need-1e-6);}
const EVENTS=[
 {k:'picky',w:25,ok:()=>activeJobs().length>0,async run(){
  const j=pick(activeJobs()),c=typeof custName==='function'?custName(j.cust):'Khách';
  const yes=await askConfirm({title:'Khách khó tính',icon:'people',ok:'Nhận thêm',cancel:'Giữ phạm vi',
   html:`<p><b>${decEsc(c)}</b> muốn thêm yêu cầu cho «${decEsc(j.name)}».</p><ul class="ask-list"><li><b>Nhận thêm:</b> +20% giờ công, +20% thưởng.</li><li><b>Giữ phạm vi:</b> khách hơi phật ý, chất lượng đánh giá giảm.</li></ul>`});
  if(!GS.jobs.includes(j))return;
  if(yes){addWork(j,.2);j.reward=Math.round(j.reward*1.2*10)/10;toast(`Đã nhận thêm yêu cầu «${j.name}»`,'ok');}else{j.fbMod=(j.fbMod||0)-.08;toast('Giữ phạm vi ban đầu · khách hơi phật ý','');}
  decNews('job',`${c} đòi thêm yêu cầu «${j.name}» · ${yes?'đã nhận thêm':'giữ phạm vi'}`);}},
 {k:'sick',w:20,ok:()=>AG.some(a=>!a.mascot&&!a.founder&&!a.away&&!a.borrowed),async run(){
  const a=pick(AG.filter(a=>!a.mascot&&!a.founder&&!a.away&&!a.borrowed)),id=CHARS[a.ci].id,n=staffName(id);
  const rest=await askConfirm({title:'Nhân viên không khỏe',icon:'people',ok:'Cho nghỉ ngơi',cancel:'Cố làm',
   html:`<p><b>${decEsc(n)}</b> bị cảm, xin làm nhẹ hôm nay.</p><ul class="ask-list"><li><b>Cho nghỉ ngơi:</b> hôm nay làm chậm một nửa, stress −30.</li><li><b>Cố làm:</b> tốc độ bình thường, stress +30.</li></ul>`});
  if(!AG.includes(a))return;
  if(rest){GS.sick=GS.sick||{};GS.sick[id]=GS.day;a.stress=Math.max(0,a.stress-30);}else a.stress=Math.min(99,a.stress+30);
  decNews('staff',`${n} không khỏe · ${rest?'cho nghỉ ngơi hôm nay':'vẫn cố làm'}`);}},
 {k:'brief',w:20,ok:()=>activeJobs().some(j=>typeof atCreative==='function'&&atCreative(j)),async run(){
  const j=pick(activeJobs().filter(j=>atCreative(j))),c=typeof custName==='function'?custName(j.cust):'Khách';
  const yes=await askConfirm({title:'Khách đổi brief',icon:'brief',ok:'Chấp nhận',cancel:'Giữ brief cũ',
   html:`<p><b>${decEsc(c)}</b> đổi ý giữa chừng cho «${decEsc(j.name)}».</p><ul class="ask-list"><li><b>Chấp nhận:</b> +25% giờ công phần còn lại, +15% thưởng.</li><li><b>Giữ brief cũ:</b> khách không vui, đánh giá giảm rõ.</li></ul>`});
  if(!GS.jobs.includes(j))return;
  if(yes){addWork(j,.25);j.reward=Math.round(j.reward*1.15*10)/10;}else j.fbMod=(j.fbMod||0)-.12;
  decNews('job',`${c} đổi brief «${j.name}» · ${yes?'đã chấp nhận':'giữ brief cũ'}`);}},
 {k:'rival',w:20,ok:()=>GS.offers.some(o=>!o.vip),async run(){
  const o=pick(GS.offers.filter(o=>!o.vip)),c=typeof custName==='function'?custName(o.cust):'Khách';
  const keep=await askConfirm({title:'Đối thủ chào giá thấp hơn',icon:'chart',ok:'Giảm 20% để giữ khách',cancel:'Để khách đi',
   html:`<p>Agency đối diện chào <b>${decEsc(c)}</b> giá rẻ hơn cho «${decEsc(o.name)}» (${fmt(o.reward)}).</p><ul class="ask-list"><li><b>Giảm 20%:</b> giữ được khách, thưởng còn ${fmt(Math.round(o.reward*.8*10)/10)}.</li><li><b>Để khách đi:</b> mất job này, chỗ trống sẽ có khách khác.</li></ul>`});
  if(!GS.offers.includes(o))return;
  if(keep){o.reward=Math.round(o.reward*.8*10)/10;}
  else{GS.offers=GS.offers.filter(x=>x!==o);const v=typeof VIS!=='undefined'&&VIS.find(v=>v.jobId===o.id);if(v&&typeof visLeave==='function')visLeave(v,null);if(typeof fillOffers==='function')fillOffers();}
  decNews('job',`Đối thủ giành «${o.name}» · ${keep?'giảm giá giữ khách':'để khách đi'}`);}},
 {k:'referral',w:15,ok:()=>true,async run(){
  const v=typeof repAdd==='function'?repAdd(6):0;toast(`Khách cũ giới thiệu agency của bạn · +${v} danh tiếng`,'ok');decNews('job',`Khách cũ giới thiệu agency · +${v} danh tiếng`);}}];
function addWork(j,f){
 const s=(j.stg||[])[Math.min(j.cur||0,(j.stg||[]).length-1)];if(!s)return;
 const left=Math.max(0,j.need-j.work),add=Math.round(Math.max(1,left*f)*100)/100;s.need+=add;j.need=Math.round((j.need+add)*100)/100;if(typeof ensureStages==='function')ensureStages(j);
}
function planEvent(){
 if(GS.ev&&GS.ev.day===GS.day)return GS.ev;
 const on=GS.day>=EVENT_FROM_DAY&&Math.random()<EVENT_DAY_P;
 GS.ev={day:GS.day,at:on?600+Math.floor(Math.random()*420):-1,done:!on};return GS.ev;
}
async function fireEvent(){
 const pool=EVENTS.filter(e=>e.ok());if(!pool.length)return false;
 let r=Math.random()*pool.reduce((n,e)=>n+e.w,0),e=pool[0];for(const x of pool){r-=x.w;if(r<0){e=x;break;}}
 GS.ev.done=true;GS.ev.k=e.k;if(typeof save==='function')save();
 try{await e.run();}catch(err){console.error(err);}
 if(typeof save==='function')save();if(typeof renderJobs==='function')renderJobs();if(typeof hud==='function')hud();return true;
}

// ----- A4: cảnh báo khách sắp bỏ về + giờ chậm khi mở bảng -----
function patienceWarn(){
 const now=decNow();
 for(const o of GS.offers){if(o.warned||!Number.isFinite(o.expire)||o.visitorDeparted)continue;const left=o.expire-now;
  if(left>0&&left<=PATIENCE_WARN){o.warned=1;const c=typeof custName==='function'?custName(o.cust):'Khách';
   toast(`${c} sắp bỏ về (còn ${Math.ceil(left)} phút game): ${o.received?'bấm Nhận job':'cần người ở quầy lễ tân'} «${o.name}»`,'err');decNews('late',`${c} sắp hết kiên nhẫn chờ «${o.name}»`);}}
}
function patienceChip(o){if(!Number.isFinite(o.expire)||o.visitorDeparted)return '';const left=Math.ceil(o.expire-decNow());return left>0&&left<=PATIENCE_WARN?`<span class="chip-wait">Sắp bỏ về · ${left}′</span>`:'';}
function menuSlowF(){if(typeof document==='undefined')return 1;const b=document.body;return b&&(b.classList.contains('hub-open')||(typeof askOpen==='function'&&askOpen())||(typeof repOpen==='function'&&repOpen()))?MENU_SLOW:1;}

// ----- vòng lặp: gọi từ stepGame -----
let decBusy=false;
function decisionsTick(){
 if(typeof GS==='undefined')return;
 patienceWarn();
 if(decBusy||decAskBusy())return;
 const now=decNow();
 // A2: job lớn tới bước Sáng tạo → hỏi hướng ý tưởng; quá BOLD_ASK_MIN phút không chọn thì đi An toàn
 for(const j of GS.jobs){if(j.early||j.idea||!isBigJob(j)||typeof atCreative!=='function'||!atCreative(j))continue;
  if(j.ideaAt==null){j.ideaAt=now;decBusy=true;askIdea(j).finally(()=>{decBusy=false;});return;}
  if(now-j.ideaAt>=BOLD_ASK_MIN)chooseIdea(j.id,'safe');}
 // A3
 if(decEarly())return;
 const ev=planEvent();
 if(!ev.done&&ev.at>=0&&GS.min>=ev.at&&GS.min<1140){decBusy=true;fireEvent().finally(()=>{decBusy=false;});}
}
