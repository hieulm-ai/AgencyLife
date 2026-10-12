// ---------- Quy trình job theo bộ phận (V17, 08/10/2026) ----------
// Theo bản game đầu tiên (deploy v4): mỗi job đi qua các bước, mỗi bước do 1 người làm, đúng chuyên môn ×1,35 · gần chuyên môn ×1 · trái nghề ×0,6.
// Người dùng chốt (12:12): Lễ tân → Account (brief) → Planner chia việc → Design/Content/Editor → Account bàn giao → Kế toán xuất hoá đơn.
// Planner = Đốc Giám (ADM). Thiếu bộ phận thì người khác làm chậm hơn. Xong mỗi bước, người làm cầm hồ sơ sang bàn người làm bước kế.
// j.stg = [{k, role, need, done}], j.cur = bước đang làm, j.who = id người đang làm bước đó, j.handoff = id người vừa xong (chờ chuyển hồ sơ),
// j.passing = đang chuyển hồ sơ (bước kế chưa làm). j.work = tổng giờ công các bước (giữ cho giao diện, thanh toán và bản lưu cũ).
const STAGE_DEF=[
 {k:'brief',role:'acc',n:'Brief',split:.10},
 {k:'plan',role:'plan',n:'Chia việc',split:.10},
 {k:'creative',role:null,n:'Sáng tạo',split:.30},
 {k:'prod',role:null,n:'Sản xuất',split:.30},
 {k:'deliver',role:'acc',n:'Bàn giao',split:.10},
 {k:'invoice',role:'fin',n:'Hoá đơn',split:.10}];
const ROLE_IC={acc:'brief',plan:'calendar',des:'palette',con:'pen',edit:'clapper',fin:'moneybag'};
const ROLE_LABEL={acc:'Account',plan:'Planner',des:'Design',con:'Content',edit:'Editor',fin:'Kế toán'};
// Bước Sáng tạo / Sản xuất theo loại job (tên mẫu job, bỏ dấu ⭐ VIP).
const JOB_FLOW={'Thiết kế logo':['des','des'],'Bộ ấn phẩm Tết':['des','des'],'Kế hoạch truyền thông':['con','con'],'Quản lý fanpage 1 tuần':['con','des'],
 'Chụp ảnh sản phẩm':['des','edit'],'Quay video TikTok':['con','edit'],'Podcast thương hiệu':['con','edit'],'TVC 15 giây':['des','edit'],
 'Livestream bán hàng':['con','edit'],'Pitch khách hàng lớn':['con','des']};
// Chuyên môn theo chức danh: spec = đúng nghề, near = gần nghề.
const TRACK_OF={'Account':{spec:['acc'],near:['plan']},'Sale':{spec:['acc'],near:[]},'Design':{spec:['des'],near:[]},'AI Designer':{spec:['des'],near:['edit','con']},
 'Content':{spec:['con'],near:['plan']},'Editor':{spec:['edit'],near:['des']},'Planner':{spec:['plan'],near:['des','con','acc']},'Kế toán':{spec:['fin'],near:['acc']},
 'HR':{spec:[],near:['acc','fin']},'Trợ lý':{spec:[],near:['acc','con','fin']}};
const MATCH_F={spec:1.35,near:1,off:.6}, MATCH_N={spec:'Đúng chuyên môn',near:'Gần chuyên môn',off:'Trái nghề'};
const STAR_F=1.2;   // ứng viên nổi bật (HR giới thiệu) làm nhanh hơn 20% — thông số thử
const WORK_SPEED=5; // Đo với 3 người làm job; lễ tân và linh vật không tham gia sản xuất.
function jobCapacity(){return 3+Math.floor(Math.max(0,AG.filter(a=>!a.mascot&&!a.founder&&!(typeof deskBound==='function'&&deskBound(a))).length-3)/2);}
const PASS_GIVEUP=30, PASS_TALK=2.2;
function roleMatch(a,role){ const t=TRACK_OF[a&&a.role]||{spec:[],near:[]}; return t.spec.includes(role)?'spec':t.near.includes(role)?'near':'off'; }
function jobFlow(j){ return JOB_FLOW[String(j&&j.name||'').replace(/^⭐ /,'')]||['des','des']; }
function buildStages(j){ const [cr,pr]=jobFlow(j); return STAGE_DEF.map(s=>({k:s.k,role:s.k==='creative'?cr:s.k==='prod'?pr:s.role,need:Math.round(j.need*s.split*100)/100,done:0})); }
// Bản lưu cũ chưa có bước: dựng bước và rải giờ công đã làm từ bước đầu.
function ensureStages(j){
 if(!Array.isArray(j.stg)||j.stg.length!==STAGE_DEF.length||j.stg.some(s=>!s||!Number.isFinite(s.need)||!Number.isFinite(s.done))){
  j.stg=buildStages(j);const sum=j.stg.slice(0,-1).reduce((n,s)=>n+s.need,0);j.stg[j.stg.length-1].need=Math.max(0,Math.round((j.need-sum)*100)/100);
  let left=Math.max(0,Math.min(j.need,j.work||0));for(const s of j.stg){const t=Math.min(s.need,left);s.done=t;left-=t;}
 }
 let c=j.stg.findIndex(s=>s.done<s.need-1e-9);j.cur=c<0?j.stg.length:c;
 return j;
}
function staffById(id){ return id?AG.find(a=>CHARS[a.ci].id===id)||null:null; }
function canTakeTask(a){ return !!a&&!a.mascot&&!a.away&&!a.autoBreak&&!a.collection&&!a.handover&&!a.pass&&a.state!=='burn'&&a.state!=='leaving'&&a.state!=='arrive'&&a.meetingJob==null&&a.receptionUid==null&&!(typeof deskBound==='function'&&deskBound(a)); }
function hasWorkSeat(a){ const o=a&&a.seat&&OBJS.find(b=>b.uid===a.seat.uid); return !!o&&WORKSEAT.has(o.id); }
function briefPending(j){ return (typeof handoverQueue!=='undefined'&&handoverQueue.includes(j.id))||(typeof frontDeskAgent==='function'&&frontDeskAgent()?.handover?.jobId===j.id); }
function jobReady(j){ return !j.paused&&!meetingPending(j)&&!j.passing&&!briefPending(j)&&!(typeof fbPending==='function'&&fbPending(j)); }
function inTeam(j,id){ return !Array.isArray(j.staff)||j.staff.includes(id); }
// Việc của 1 người: bước đang được giao cho người đó.
function agentTask(a){ if(!a) return null; const id=CHARS[a.ci].id; for(const j of GS.jobs){ ensureStages(j); const s=j.stg[j.cur]; if(s&&j.who===id) return {j,s}; } return null; }
function hasWorkFor(a){ const t=agentTask(a); return !!t&&jobReady(t.j); }
// Giao bước cho người hợp nhất: đúng chuyên môn, có bàn làm việc, Account phụ trách job ưu tiên bước Account; mỗi người 1 bước tại 1 lúc.
function assignStages(){
 const busy=new Set();
 for(const j of GS.jobs){ ensureStages(j); const s=j.stg[j.cur];
  if(j.passing&&!AG.some(a=>a.pass&&a.pass.jobId===j.id)) j.passing=false;   // tải lại giữa lúc chuyển hồ sơ
  if(!s){ j.who=null; continue; }
  const a=staffById(j.who); if(a&&canTakeTask(a)&&inTeam(j,j.who)) busy.add(j.who); else j.who=null; }
 for(const j of GS.jobs){ const s=j.stg[j.cur]; if(!s||j.who||!jobReady(j)) continue;
  const pool=AG.filter(a=>canTakeTask(a)&&!busy.has(CHARS[a.ci].id)&&inTeam(j,CHARS[a.ci].id)); if(!pool.length) continue;
  const score=a=>MATCH_F[roleMatch(a,s.role)]*2.4+(hasWorkSeat(a)?1:0)+(s.role==='acc'&&j.account===CHARS[a.ci].id?1.5:0)-(a.stress>75?1:0);
  pool.sort((p,q)=>score(q)-score(p)); const a=pool[0]; j.who=CHARS[a.ci].id; busy.add(j.who);
  if(j.handoff){ const from=staffById(j.handoff); delete j.handoff; if(from&&from!==a&&canTakeTask(from)) startPass(from,j,a); else if(from!==a) stageNews(j,from,a,true); }
 }
 // Người đúng chuyên môn vừa rảnh: nhận lại bước đang do người gần/trái nghề làm (chưa quá nửa), người cũ mang hồ sơ sang.
 for(const j of GS.jobs){ const s=j.stg[j.cur], cur=staffById(j.who); if(!s||!cur||!jobReady(j)||roleMatch(cur,s.role)==='spec'||s.done>s.need*.5) continue;
  const spec=AG.find(a=>canTakeTask(a)&&!busy.has(CHARS[a.ci].id)&&inTeam(j,CHARS[a.ci].id)&&roleMatch(a,s.role)==='spec'); if(!spec) continue;
  busy.delete(j.who); j.who=CHARS[spec.ci].id; busy.add(j.who); startPass(cur,j,spec);
 }
}
function stageRate(a,role){ const base=workerRate(a); if(base<=0) return 0; return base*WORK_SPEED*MATCH_F[roleMatch(a,role)]*(GS.stars&&GS.stars[CHARS[a.ci].id]?STAR_F:1); }
function stagePotentialRate(a,role){
 if(!a||a.mascot||a.founder||!hasWorkSeat(a))return 0;
 return WORK_SPEED*MATCH_F[roleMatch(a,role)]*(a.stress>75?.6:1)*(seatKind(a)==='ergo_chair'?1.2:1)*(GS.stars&&GS.stars[CHARS[a.ci].id]?STAR_F:1);
}
function estimateStageHours(j,pool){
 ensureStages(j);let hours=0;
 for(let i=j.cur;i<j.stg.length;i++){const s=j.stg[i],left=Math.max(0,s.need-s.done);if(!left)continue;
  const current=i===j.cur?staffById(j.who):null;
  const rate=current&&pool.includes(current)?stagePotentialRate(current,s.role):Math.max(0,...pool.map(a=>stagePotentialRate(a,s.role)));
  if(!rate)return Infinity;hours+=left/rate;
 }return hours;
}
function advanceJobWork(h){
 if(closingOffice) return;
 assignStages();
 for(const j of GS.jobs){ const s=j.stg[j.cur]; if(!s||!j.who||!jobReady(j)) continue; const a=staffById(j.who); if(!a) continue;
  const r=stageRate(a,s.role); if(r<=0) continue;
  const before=s.done; s.done=Math.min(s.need,s.done+r*h);
  if(typeof trackQuality==='function') trackQuality(j,a,s.role,s.done-before);
  if(s.done>=s.need-1e-9){ s.done=s.need; const prev=j.who; j.who=null; ensureStages(j); if(j.cur<j.stg.length) j.handoff=prev; if(typeof maybeRevision==='function') maybeRevision(j,s.k); }
  j.work=Math.min(j.need,j.stg.reduce((n,x)=>n+x.done,0));
  if(j.cur>=j.stg.length) j.work=j.need;
 }
}
// Năng suất để ước tính thời gian (khung "Trước khi nhận" và thẻ job).
function jobRates(){ const teams=new Map(); let free=0;
 for(const a of AG) if(canTakeTask(a)) free+=(workerRate(a)||(hasWorkSeat(a)?1:0))*WORK_SPEED;
 for(const j of GS.jobs){ const s=j.stg&&j.stg[j.cur], a=staffById(j.who); teams.set(j.id,s&&a?(stageRate(a,s.role)||stagePotentialRate(a,s.role)):0); }
 return {free,teams}; }
// ----- chuyển hồ sơ sang bàn người làm bước kế -----
function startPass(a,j,b){
 const path=typeof handoverPath==='function'?handoverPath([Math.round(a.x),Math.round(a.y)],b):null;
 if(!path){ stageNews(j,a,b,true); return; }
 if(a.state==='sit'&&a.acc)[a.x,a.y]=a.acc; if(a.useObj){BUSY.delete(a.useObj);a.useObj=null;}
 a.state='pass';a.react=null;a.wait=0;a.pass={jobId:j.id,to:CHARS[b.ci].id,phase:'go',t:0};a.emo={k:'job',t:PASS_GIVEUP+5};a.path=path.slice(1);j.passing=true;
}
function endPass(a){ const j=a.pass&&GS.jobs.find(x=>x.id===a.pass.jobId); if(j) j.passing=false; delete a.pass;a.emo=null;a.react=null;a.path=[];a.state='wander';a.wait=0;a.roam=0; }
function stepPass(a,dt){
 const h=a.pass;h.t+=dt; const j=GS.jobs.find(x=>x.id===h.jobId), b=staffById(h.to);
 if(!j||!b||b.away||closingOffice){ endPass(a); return; }
 if(h.phase==='go'){
  if(h.t>PASS_GIVEUP){ stageNews(j,a,b,true); endPass(a); return; }
  if(a.path.length){ const [x,y]=a.path[0]; if(blocked(x,y)){ a.path=[]; return; }
   const dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy),sp=3*dt; if(d>1e-3)a.dir=dirTo(a,x,y); a.t+=dt;
   if(d<=sp){a.x=x;a.y=y;a.path.shift();}else{a.x+=dx/d*sp;a.y+=dy/d*sp;} return; }
  const [bx,by]=handoverTile(b);
  if(Math.max(Math.abs(a.x-bx),Math.abs(a.y-by))>1.6){ const p=handoverPath([Math.round(a.x),Math.round(a.y)],b); if(p&&p.length>1){a.path=p.slice(1);return;} stageNews(j,a,b,true); endPass(a); return; }
  h.phase='talk';h.t=0;a.emo=null;startReact(a,'talk',PASS_TALK,dirTo(a,bx,by));
  if(b.state!=='sit'&&!b.react&&!b.path.length&&!b.autoBreak) startReact(b,'talk',PASS_TALK,dirTo(b,a.x,a.y));
  b.emo={k:'job',t:PASS_TALK+.6}; stageNews(j,a,b,false); return; }
 if(a.react){ a.react.t+=dt;a.t+=dt; if(a.react.t<a.react.dur) return; }
 endPass(a);
}
function stageNews(j,from,to,remote){
 const s=j.stg&&j.stg[j.cur]; if(!s||!to) return;
 const fn=from?staffName(CHARS[from.ci].id):'Planner', tn=staffName(CHARS[to.ci].id), step=STAGE_DEF[j.cur].n;
 if(typeof addOfficeNews==='function') addOfficeNews('job',`${fn} chuyển «${j.name}» cho ${tn} (${ROLE_LABEL[s.role]}) · bước ${step}${remote?' qua tin nhắn':''}`);
}
// Lễ tân giao brief xong: Account nhận luôn bước Brief.
function onBriefDelivered(j,b){ ensureStages(j); if(b&&j.cur===0&&inTeam(j,CHARS[b.ci].id)&&!GS.jobs.some(x=>x!==j&&x.who===CHARS[b.ci].id)) j.who=CHARS[b.ci].id; }
// ----- giao diện -----
function stageIcon(k){ const src=window.UIICON&&window.UIICON[k]; return src?`<img src="${src}" width="16" height="16" alt="" style="object-fit:contain">`:''; }
function stageChips(j){ ensureStages(j);
 return `<div class="stg-row">${j.stg.map((s,i)=>{ const a=i===j.cur&&staffById(j.who), m=a?roleMatch(a,s.role):null;
  const st=i<j.cur?'done':i===j.cur?'cur':'next';
  return `<span class="stg ${st}" title="${STAGE_DEF[i].n} · ${ROLE_LABEL[s.role]}${a?' · '+staffName(CHARS[a.ci].id)+' · '+MATCH_N[m]:''}">${stageIcon(ROLE_IC[s.role])}<b>${STAGE_DEF[i].n}</b>${st==='done'?'<i>✓</i>':st==='cur'?`<i>${Math.floor(s.done/s.need*100)}%</i>`:''}</span>`; }).join('')}</div>`;
}
function stageLine(j){ ensureStages(j); const s=j.stg[j.cur]; if(!s) return 'Đã xong các bước';
 const a=staffById(j.who), step=STAGE_DEF[j.cur].n, role=ROLE_LABEL[s.role];
 if(j.paused) return `Bước ${step} (${role}) · đang tạm dừng`;
 if(typeof fbPending==='function'&&fbPending(j)) return `Khách góp ý · chờ bạn chọn cách xử lý (Danh tiếng)`;
 if(briefPending(j)) return `Chờ lễ tân mang brief tới Account`;
 if(meetingPending(j)) return `Chờ họp chốt yêu cầu xong`;
 if(j.passing) return `${a?staffName(CHARS[a.ci].id):role} đang nhận hồ sơ · bước ${step}`;
 if(!a) return `Bước ${step} · chờ ${role} rảnh`;
 const m=roleMatch(a,s.role); return `Bước ${step} · ${staffName(CHARS[a.ci].id)} (${a.role||'nhân viên'}) · ${MATCH_N[m]}${m==='off'?' · làm chậm':''}${isWorking(a)?'':' · đang về bàn'}`;
}
// ----- HR giới thiệu ứng viên nổi bật (mỗi ngày game 1 người) -----
function starCandidate(free){
 if(!AG.some(a=>a.role==='HR'&&!a.away)) return null;
 const pool=free.filter(c=>c.id!==MASCOT_ID&&c.id!=='P_custom'&&!(GS.stars&&GS.stars[c.id])); if(!pool.length) return null;
 if(!GS.starPick||GS.starPick.day!==GS.day||!pool.some(c=>c.id===GS.starPick.id)) GS.starPick={day:GS.day,id:pool[(GS.day*7+pool.length)%pool.length].id};
 return GS.starPick.id;
}
