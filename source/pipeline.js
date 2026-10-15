// ---------- Quy trình job theo bộ phận (V17, 08/10/2026) ----------
// Theo bản game đầu tiên (deploy v4): mỗi job đi qua các bước, mỗi bước do 1 người làm, đúng chuyên môn ×1,35 · gần chuyên môn ×1 · trái nghề ×0,6.
// Người dùng chốt (12:12): Lễ tân → Account (brief) → Planner chia việc → Design/Content/Editor → Account bàn giao → Kế toán xuất hoá đơn.
// Planner = Đốc Giám (ADM). Thiếu bộ phận thì người khác làm chậm hơn. Xong mỗi bước, người làm cầm hồ sơ sang bàn người làm bước kế.
// j.stg = [{k, role, need, done}], j.cur = bước đang làm, j.who = id người đang làm bước đó, j.handoff = id người vừa xong (chờ chuyển hồ sơ),
// j.passing = đang chuyển hồ sơ (bước kế chưa làm). j.work = tổng giờ công các bước (giữ cho giao diện, thanh toán và bản lưu cũ).
// 14/10/2026: thêm lại bước Chia việc (Planner = Đốc Giám) theo quy trình đã chốt. Thiếu Planner thì Account/Content làm thay (gần chuyên môn ×1).
// Tổng giờ công của job không đổi; chỉ chia lại tỉ lệ giữa các bước.
const STAGE_DEF=[{k:'brief',role:'acc',n:'Account',split:.18},{k:'plan',role:'plan',n:'Planner',split:.1},{k:'creative',role:'con',n:'Content',split:.32},{k:'prod',role:'des',n:'Design',split:.4}];
function stageIndex(j,k){ const i=Array.isArray(j&&j.stg)?j.stg.findIndex(s=>s&&s.k===k):-1; return i<0?STAGE_DEF.findIndex(s=>s.k===k):i; }
const ROLE_IC={acc:'brief',plan:'calendar',des:'palette',con:'pen',edit:'clapper',cam:'clapper',snd:'clapper',fin:'coin'};
const ROLE_LABEL={acc:'Account',plan:'Planner',des:'Design',con:'Content',edit:'Editor',cam:'Quay phim',snd:'Âm thanh',fin:'Kế toán'};
// 15/10/2026: job video/âm thanh có luồng riêng (chủ dự án chốt A+B, có bước Quay). Mỗi bước: [khóa, bộ phận, tỉ lệ giờ công, đồ phải đứng làm tại chỗ].
// Bước 'shoot' (Quay / Thu âm) làm tại máy quay, đèn softbox hoặc phòng thu; các bước khác làm ở bàn. Tỉ lệ là thông số thử.
const VIDEO_FLOW=(cr,at)=>[['brief','acc',.15],['plan','plan',.08],['creative',cr,.22],['shoot','cam',.2,at],['prod','edit',.35]];
const JOB_STAGES={
 'Quay video TikTok':VIDEO_FLOW('con',['camera_tripod']),
 'Livestream bán hàng':VIDEO_FLOW('con',['camera_tripod']),
 'TVC 15 giây':VIDEO_FLOW('des',['camera_tripod']),
 'Chụp ảnh sản phẩm':VIDEO_FLOW('des',['softbox','camera_tripod']),
 'Series Reels 5 clip':VIDEO_FLOW('con',['camera_tripod']),
 'Phim giới thiệu doanh nghiệp 60s':VIDEO_FLOW('con',['camera_tripod']),
 'Video review sản phẩm':VIDEO_FLOW('con',['camera_tripod']),
 'Podcast thương hiệu':[['brief','acc',.15],['plan','plan',.08],['creative','con',.22],['shoot','snd',.2,['sound_booth']],['prod','edit',.35]],
 'Dựng video sự kiện':[['brief','acc',.15],['plan','plan',.1],['creative','con',.15],['prod','edit',.6]]};   // khách gửi sẵn cảnh quay
function jobKey(j){ return String(j&&j.name||'').replace(/^⭐ /,''); }
function stageDefs(j){ return JOB_STAGES[jobKey(j)]||STAGE_DEF.map(s=>[s.k,s.role,s.split]); }
function stageAt(j,s){ const d=stageDefs(j).find(x=>x[0]===s.k); return d&&d[3]||null; }
function stepName(j,i){ const s=j&&j.stg&&j.stg[i]; return s?(s.k==='shoot'?(s.role==='snd'?'Thu âm':'Quay'):s.k==='prod'&&s.role==='edit'?'Dựng':ROLE_LABEL[s.role]):''; }
// Chuyên môn theo chức danh: spec = đúng nghề, near = gần nghề.
const TRACK_OF={'Account':{spec:['acc'],near:['plan']},'Sale':{spec:['acc'],near:[]},'Design':{spec:['des'],near:[]},'AI Designer':{spec:['des'],near:['edit','con']},
 'Content':{spec:['con'],near:['plan']},'Editor':{spec:['edit'],near:['des','cam','snd']},'Quay phim':{spec:['cam','edit'],near:['des']},'Âm thanh':{spec:['snd'],near:['edit','cam']},'Planner':{spec:['plan'],near:['des','con','acc']},'Kế toán':{spec:['fin'],near:['acc']},
 'HR':{spec:[],near:['acc','fin']},'Trợ lý':{spec:[],near:['acc','con','fin']}};
const MATCH_F={spec:1.35,near:1,off:.6}, MATCH_N={spec:'Đúng chuyên môn',near:'Gần chuyên môn',off:'Trái nghề'};
const STAR_F=1.2;   // ứng viên nổi bật (HR giới thiệu) làm nhanh hơn 20% — thông số thử
const WORK_SPEED=12; // Đo với 3 người làm job; lễ tân và linh vật không tham gia sản xuất.
function jobCapacity(){return 3+Math.floor(Math.max(0,AG.filter(a=>!a.mascot&&!a.founder&&!(typeof deskBound==='function'&&deskBound(a))).length-3)/2);}
const PASS_GIVEUP=30, PASS_TALK=2.2;
function roleMatch(a,role){ const t=TRACK_OF[a&&a.role]||{spec:[],near:[]}; return t.spec.includes(role)?'spec':t.near.includes(role)?'near':'off'; }
function buildStages(j){ return stageDefs(j).map(([k,role,split])=>({k,role,need:Math.round(j.need*split*100)/100,done:0})); }
function stagesMatch(j){ const d=stageDefs(j); return Array.isArray(j.stg)&&j.stg.length===d.length&&j.stg.every((s,i)=>s&&s.k===d[i][0]&&s.role===d[i][1]&&Number.isFinite(s.need)&&Number.isFinite(s.done)); }
// Bản lưu cũ chưa có bước: dựng bước và rải giờ công đã làm từ bước đầu.
function applyOnboardingPace(j){
 if(j.onboardingPace!=null)return j;
 const done=GS.done;
 const factor=Number.isFinite(done)&&done>=0&&GS.day<=3?(done<3?.25:done<5?.5:1):1;
 j.onboardingPace=factor;
 if(factor===1||!Number.isFinite(j.need)||j.need<=0)return j;
 j.need*=factor;j.work=(j.work||0)*factor;
 if(Array.isArray(j.stg))for(const stage of j.stg){stage.need*=factor;stage.done*=factor;}
 return j;
}
function ensureStages(j){
 if(j.flowVersion!==2&&Number.isFinite(j.reward)){
  const progress=j.need>0?Math.max(0,Math.min(1,(j.work||0)/j.need)):0;
  j.need=Math.max(2,Math.round(j.reward*.18*100)/100);j.work=j.need*progress;
  delete j.stg;delete j.who;delete j.handoff;j.passing=false;j.flowVersion=2;
 }
 if(!stagesMatch(j)){
  if(Array.isArray(j.stg)){ j.who=null; delete j.handoff; }   // bản lưu cũ: luồng của loại job đã đổi → dựng lại, rải giờ công đã làm từ bước đầu
  j.stg=buildStages(j);const sum=j.stg.slice(0,-1).reduce((n,s)=>n+s.need,0);j.stg[j.stg.length-1].need=Math.max(0,Math.round((j.need-sum)*100)/100);
  let left=Math.max(0,Math.min(j.need,j.work||0));for(const s of j.stg){const t=Math.min(s.need,left);s.done=t;left-=t;}
 }
 let c=j.stg.findIndex(s=>s.done<s.need-1e-9);j.cur=c<0?j.stg.length:c;
 return j;
}
// ----- 15/10: bước Quay / Thu âm làm tại máy quay, đèn softbox hoặc phòng thu (không ngồi bàn) -----
// Không có đồ (hoặc không tới được) thì làm ở bàn như bước thường để job không bị kẹt.
const STATION_RETRY=20;
function here0(a){ return [Math.round(a.x),Math.round(a.y)]; }
function stationFor(a){
 if(!a||a.autoBreak||a.mascot||typeof OBJS==='undefined') return null; const t=agentTask(a); if(!t||!jobReady(t.j)) return null;
 const at=stageAt(t.j,t.s); if(!at) return null;
 const mine=a.useObj!=null&&OBJS.find(o=>o.uid===a.useObj&&at.includes(o.id)&&BUSY.get(o.uid)===a); if(mine) return mine;
 for(const id of at){ const o=OBJS.find(o=>o.id===id&&!BUSY.has(o.uid)); if(o) return o; } return null;
}
function shootingAt(a){ const o=a&&a.state==='shoot'&&a.useObj!=null&&OBJS.find(b=>b.uid===a.useObj); return o&&BUSY.get(o.uid)===a?o:null; }
function releaseStation(a){ if(a.useObj!=null&&BUSY.get(a.useObj)===a) BUSY.delete(a.useObj); a.useObj=null; if(a.state==='shoot'||a.state==='toShoot'){ a.state='wander'; a.wait=.2; a.path=[]; } }
function nearObj(here,o){ const [w,d]=FBY[o.id].views[o.rot].fp; return ((here[0]===o.gx-1||here[0]===o.gx+w)&&here[1]>=o.gy&&here[1]<o.gy+d)||((here[1]===o.gy-1||here[1]===o.gy+d)&&here[0]>=o.gx&&here[0]<o.gx+w); }
// 15/10/2026: máy quay trên chân (camera_tripod) — người quay đứng SAU ống kính, nhìn cùng hướng ống kính.
// rot 0..3 = 01_front_left, 02_front_right, 03_back_right, 04_back_left: ống kính hướng +y (SW), +x (SE), −y (NE), −x (NW).
const CAM_BEHIND=[[0,-1,'SW'],[-1,0,'SE'],[0,1,'NE'],[1,0,'NW']];
function camOperatorSpot(o){ if(!o||o.id!=='camera_tripod')return null; const [dx,dy,dir]=CAM_BEHIND[o.rot%4], x=o.gx+dx, y=o.gy+dy;
 const R=typeof REACH!=='undefined'?REACH:null; return (!blocked(x,y)&&(!R||(R[y]&&R[y][x])))?{x,y,dir}:null; }
function stepShoot(a,dt,here){
 if(a.state==='shoot'){ const st=stationFor(a); if(!st||st.uid!==a.useObj){ releaseStation(a); return false; } a.t+=dt; return true; }
 if((a.shootRetry||0)>0){ a.shootRetry-=dt; if(a.state==='toShoot') releaseStation(a); return false; }
 const st=stationFor(a); if(!st){ if(a.state==='toShoot') releaseStation(a); return false; }
 if(a.state==='toShoot'&&a.useObj===st.uid){
  if(nearObj(here,st)){ const cs=camOperatorSpot(st); a.state='shoot'; a.t=0; a.dir=cs&&cs.x===here[0]&&cs.y===here[1]?cs.dir:faceToward(a,st); return true; }
  releaseStation(a); a.shootRetry=STATION_RETRY; return false;   // không tới được: làm ở bàn một lúc rồi thử lại
 }
 const cs=camOperatorSpot(st), sp=cs?[cs.x,cs.y]:useSpot(st); const p=sp&&bfs(here,sp,true); if(!p){ a.shootRetry=STATION_RETRY; return false; }
 if(a.state==='sit'&&a.acc)[a.x,a.y]=a.acc;
 if(a.useObj!=null&&a.useObj!==st.uid&&BUSY.get(a.useObj)===a) BUSY.delete(a.useObj);
 a.useObj=st.uid; BUSY.set(st.uid,a); a.state='toShoot'; a.react=null; a.path=p.slice(1); a.wait=0;
 return true;
}
function staffById(id){ return id?AG.find(a=>CHARS[a.ci].id===id)||null:null; }
function canTakeTask(a){ return !!a&&!a.mascot&&!a.away&&!a.autoBreak&&!a.collection&&!a.handover&&!a.pass&&a.state!=='burn'&&a.state!=='leaving'&&a.state!=='arrive'&&a.meetingJob==null&&a.receptionUid==null&&!(typeof deskBound==='function'&&deskBound(a)); }
function hasWorkSeat(a){ const o=a&&a.seat&&OBJS.find(b=>b.uid===a.seat.uid); return !!o&&WORKSEAT.has(o.id); }
function briefPending(j){ return (typeof handoverQueue!=='undefined'&&handoverQueue.includes(j.id))||AG.some(a=>a.handover?.jobId===j.id); }
function jobReady(j){ return !(j.early&&j.cur===stageIndex(j,'creative')&&!j.early.idea)&&!j.paused&&!meetingPending(j)&&!j.passing&&!briefPending(j)&&!(typeof fbPending==='function'&&fbPending(j)); }
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
// Nhân vật chính gốc Account: cả đội làm bước Brief nhanh hơn (thông số thử).
function perkStage(role){ const m=typeof perkVal==='function'?perkVal('stage',null):null; return m&&m[role]||1; }
function stageRate(a,role){ const base=workerRate(a); if(base<=0) return 0; return base*WORK_SPEED*MATCH_F[roleMatch(a,role)]*(GS.stars&&GS.stars[CHARS[a.ci].id]?STAR_F:1)*perkStage(role)*(typeof zoneRoleF==='function'?zoneRoleF(a,role):1); }   // 15/10: khu đúng công năng làm nhanh hơn
// Nhân vật chính có nghề sản xuất: lúc quầy vắng khách thì phụ một tay bước đúng nghề, nửa tốc độ, không cộng stress.
// Chỉ phụ job đã có người đang làm bước đó (hoàn tất bước vẫn do người đó cầm hồ sơ đi tiếp).
function founderHelpRate(role){
 const p=typeof founderPerk==='function'?founderPerk():null; if(!p||p.help!==role) return 0;
 const f=AG.find(a=>a.founder&&!a.mascot); if(!f||f.receptionUid!=null||f.handover||f.pass||(typeof deskReady==='function'&&!deskReady(f))) return 0;
 if(typeof VIS!=='undefined'&&VIS.some(v=>v.state==='wait'||v.state==='pickup')) return 0;
 const t=TRACK_OF[STAFF_ROLE[GS.player.id]]||{spec:[],near:[]};
 return FOUNDER_HELP*WORK_SPEED*MATCH_F[t.spec.includes(role)?'spec':t.near.includes(role)?'near':'off'];
}
function stagePotentialRate(a,role){
 if(!a||a.mascot||a.founder||!hasWorkSeat(a))return 0;
 return WORK_SPEED*MATCH_F[roleMatch(a,role)]*(a.stress>75?.6:1)*(seatKind(a)==='ergo_chair'?1.2:1)*(GS.stars&&GS.stars[CHARS[a.ci].id]?STAR_F:1)*perkStage(role);
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
 let helped=false;
 for(const j of GS.jobs){ const s=j.stg[j.cur]; if(!s||!j.who||!jobReady(j)) continue; const a=staffById(j.who); if(!a) continue;
  let r=stageRate(a,s.role)*((GS.earlyBoostUntil||0)>GS.day*1440+GS.min?1.15:1); if(r<=0) continue;
  if(!helped){ const hr=founderHelpRate(s.role); if(hr>0){ r+=hr; helped=true; } }
  const before=s.done; s.done=Math.min(s.need,s.done+r*h);
  if(typeof trackQuality==='function') trackQuality(j,a,s.role,s.done-before);
  if(s.done>=s.need-1e-9){ s.done=s.need; const prev=j.who; a.sitT=0; j.who=null; ensureStages(j); if(j.cur<j.stg.length) j.handoff=prev; if(typeof maybeRevision==='function') maybeRevision(j,s.k); }
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
 const fn=from?staffName(CHARS[from.ci].id):'Planner', tn=staffName(CHARS[to.ci].id), step=stepName(j,j.cur);
 if(typeof addOfficeNews==='function') addOfficeNews('job',`${fn} chuyển «${j.name}» cho ${tn} (${ROLE_LABEL[s.role]}) · bước ${step}${remote?' qua tin nhắn':''}`);
}
// Lễ tân giao brief xong: Account nhận luôn bước Brief.
function onBriefDelivered(j,b){ ensureStages(j); if(b&&j.cur===0&&inTeam(j,CHARS[b.ci].id)&&!GS.jobs.some(x=>x!==j&&x.who===CHARS[b.ci].id)) j.who=CHARS[b.ci].id; }
// ----- giao diện -----
function stageIcon(k){ const src=window.UIICON&&window.UIICON[k]; return src?`<img src="${src}" width="16" height="16" alt="" style="object-fit:contain">`:''; }
function stageChips(j){ ensureStages(j);
 return `<div class="stg-row">${j.stg.map((s,i)=>{ const a=i===j.cur&&staffById(j.who), m=a?roleMatch(a,s.role):null;
  const st=i<j.cur?'done':i===j.cur?'cur':'next';
  return `<span class="stg ${st}" title="${stepName(j,i)} · ${ROLE_LABEL[s.role]}${a?' · '+staffName(CHARS[a.ci].id)+' · '+MATCH_N[m]:''}">${stageIcon(ROLE_IC[s.role])}<b>${stepName(j,i)}</b>${st==='done'?'<i>✓</i>':st==='cur'?`<i>${Math.floor(s.done/s.need*100)}%</i>`:''}</span>`; }).join('')}</div>`;
}
function stageLine(j){ ensureStages(j); const s=j.stg[j.cur]; if(!s) return 'Đã xong các bước';
 const a=staffById(j.who), step=stepName(j,j.cur), role=ROLE_LABEL[s.role];
 if(j.paused) return `Bước ${step} (${role}) · đang tạm dừng`;
 if(typeof fbPending==='function'&&fbPending(j)) return `Khách góp ý · chờ bạn chọn cách xử lý (Danh tiếng)`;
 if(briefPending(j)) return `Chờ lễ tân mang brief tới Account`;
 if(meetingPending(j)) return `Chờ họp chốt yêu cầu xong`;
 if(j.passing) return `${a?staffName(CHARS[a.ci].id):role} đang nhận hồ sơ · bước ${step}`;
 if(!a) return `Bước ${step} · chờ ${role} rảnh`;
 const m=roleMatch(a,s.role); return `Bước ${step} · ${staffName(CHARS[a.ci].id)} (${a.role||'nhân viên'}) · ${MATCH_N[m]}${m==='off'?' · làm chậm':''}${isWorking(a)?'':a.state==='toShoot'?' · đang tới chỗ quay':' · đang về bàn'}`;
}
// ----- HR giới thiệu ứng viên nổi bật (mỗi ngày game 1 người) -----
function starCandidate(free){
 if(!AG.some(a=>a.role==='HR'&&!a.away)) return null;
 const pool=free.filter(c=>c.id!==MASCOT_ID&&c.id!=='P_custom'&&!(GS.stars&&GS.stars[c.id])); if(!pool.length) return null;
 if(!GS.starPick||GS.starPick.day!==GS.day||!pool.some(c=>c.id===GS.starPick.id)) GS.starPick={day:GS.day,id:pool[(GS.day*7+pool.length)%pool.length].id};
 return GS.starPick.id;
}
