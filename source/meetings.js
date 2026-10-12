// Included inside the game closure by build.py. Times are active game minutes.
const MEETING_MINUTES = 20;
const meetingPending = j => !!j.meeting && j.meeting.phase !== "done";
const needsMeeting = j => j.req.includes("meeting_table") || j.need >= 60;
function meetingReservations(){
  const result = new Map();
  for(const j of GS.jobs) if(meetingPending(j)){
    if(j.meeting.guestKey) result.set(j.meeting.guestKey, -1);
    if(j.meeting.hostKey) result.set(j.meeting.hostKey, j.meeting.hostCi);
  }
  return result;
}
function releaseMeetingHost(a){
  if(a.state==="sit"&&a.acc){ a.x=a.acc[0]; a.y=a.acc[1]; }
  delete a.meetingJob; a.seat=null; a.path=[]; if(a.state!=="burn")a.state="wander"; a.wait=.3;
}
function releaseMeeting(j, completed=false){
  for(const a of AG) if(a.meetingJob===j.id) releaseMeetingHost(a);
  for(const v of VIS) if(v.kind==="meeting" && v.jobId===j.id){
    if(v.state==="meeting"&&v.acc){ v.x=v.acc[0]; v.y=v.acc[1]; }
    v.seat=null; if(completed){v.kind="offer";goToSofa(v);}else {v.kind="departed";visLeave(v,"wait");}
  }
  const remaining=j.meeting.remaining;
  j.meeting={phase:completed?"done":"queued",remaining};
  assignSeats();
}
function findMeetingPlan(j){
  if(VIS.some(v=>v.jobId===j.id&&v.state==="leave"))return null;
  const occupied=new Set(GS.jobs.filter(x=>x!==j&&meetingPending(x)).map(x=>x.meeting.tableUid));
  for(const o of OBJS.filter(o=>o.id==="meeting_table"&&!occupied.has(o.uid))){
    const seats=SEATS.filter(z=>z.uid===o.uid).map(z=>({z,acc:accessOf(z)}))
      .filter(p=>p.acc&&bfs(ENTRY,p.acc));
    if(seats.length<2) continue;
    const hosts=AG.filter(a=>!a.mascot&&!a.away&&a.state!=="leaving"&&a.state!=="arrive"&&!a.autoBreak&&!a.collection&&!a.handover&&!a.pass&&!(typeof deskBound==="function"&&deskBound(a))&&a.state!=="burn"&&a.meetingJob==null&&a.receptionUid==null)
      .sort((a,b)=>(a.seat?.uid===o.uid?0:1)-(b.seat?.uid===o.uid?0:1)||a.stress-b.stress);
    for(const host of hosts){
      const here=host.state==="sit"&&host.acc?host.acc:[Math.round(host.x),Math.round(host.y)];
      const hp=seats.find(p=>bfs(here,p.acc,true));
      if(!hp) continue;
      const gp=seats.find(p=>p.z.key!==hp.z.key&&p.z.face!==hp.z.face)
        ||seats.find(p=>p.z.key!==hp.z.key);
      const guest=VIS.find(v=>v.jobId===j.id&&v.kind==="offer"&&v.state!=="leave");
      const from=guest?[Math.round(guest.x),Math.round(guest.y)]:ENTRY;
      const indoorPath=bfs(from,gp.acc);
      const guestPath=indoorPath&&(guest?indoorPath:[SIDEWALK,OUTSIDE_ENTRY,...indoorPath]);
      if(guestPath) return {o,host,hp,gp,guest,guestPath};
    }
  }
  return null;
}
function beginMeeting(j,plan){
  const {o,host,hp,gp,guestPath}=plan;
  for(const a of AG) if(a!==host&&(a.seat?.key===gp.z.key||a.seat?.key===hp.z.key)) releaseMeetingHost(a);
  if(host.state==="sit"&&host.acc){ host.x=host.acc[0];host.y=host.acc[1]; }
  if(host.useObj){ BUSY.delete(host.useObj);host.useObj=null; }
  host.react=null;host.meetingJob=j.id;host.seat=hp.z;host.state="toSeat";
  host.path=bfs([Math.round(host.x),Math.round(host.y)],hp.acc,true).slice(1);host.wait=0;
  const v=plan.guest||{id:visId++,jobId:j.id,ci:j.cust??custFor(j.name),x:SIDEWALK[0],y:SIDEWALK[1],t:0,dir:"SW"};
  if(!plan.guest){ const e=streetExit(v); [v.x,v.y]=e; v.dir=e[0]<OUTSIDE_ENTRY[0]?"SE":"NW"; VIS.push(v); }   // khách họp đi bộ từ đầu vỉa hè vào
  Object.assign(v,{kind:"meeting",state:"toMeeting",seat:gp.z,acc:gp.acc,path:guestPath.slice(1),wait:0,emo:{k:"job",t:2}});
  Object.assign(j.meeting,{phase:"walking",tableUid:o.uid,tablePose:[o.gx,o.gy,o.rot].join(","),travel:0,guestKey:gp.z.key,hostKey:hp.z.key,hostCi:host.ci});
  renderJobs();save();
}
function stepMeetings(dt){
  if(dt<=0)return;
  for(const a of AG) if(a.meetingJob!=null&&!GS.jobs.some(j=>j.id===a.meetingJob&&meetingPending(j))) releaseMeetingHost(a);
  for(const v of VIS) if(v.kind==="meeting"&&!GS.jobs.some(j=>j.id===v.jobId&&meetingPending(j))){
    v.kind="departed";v.seat=null;visLeave(v,"wait");
  }
  for(const j of GS.jobs.filter(meetingPending)){
    const m=j.meeting;
    if(m.phase!=="queued"){
      const host=AG.find(a=>a.meetingJob===j.id),guest=VIS.find(v=>v.kind==="meeting"&&v.jobId===j.id);
      const table=OBJS.find(o=>o.uid===m.tableUid&&o.id==="meeting_table");
      const gs=SEATS.find(z=>z.key===m.guestKey),hs=SEATS.find(z=>z.key===m.hostKey);
      m.travel=(m.travel||0)+dt;
      if(!table||[table.gx,table.gy,table.rot].join(",")!==m.tablePose||!host||!guest||host.state==="burn"||!gs||!hs||!accessOf(gs)||!accessOf(hs)
        ||!bfs(ENTRY,accessOf(gs))||!bfs(ENTRY,accessOf(hs))){ releaseMeeting(j); continue; }
      if(m.phase==="walking"&&m.travel>90){releaseMeeting(j);continue;}
      if(host.state==="sit"&&guest.state==="meeting"){
        m.phase="meeting";m.remaining=Math.max(0,m.remaining-dt*GAME_MIN_PER_SEC);
        if(m.remaining===0){ releaseMeeting(j,true);toast(`Đã chốt yêu cầu: ${j.name} · bắt đầu sản xuất`,"ok");renderJobs();save(); }
      }
    }else{
      const plan=findMeetingPlan(j);
      if(plan) beginMeeting(j,plan);
    }
  }
}
function restoreMeetings(){
  // Seats and routes are transient; preserve the amount of conversation already completed.
  for(const j of GS.jobs) if(meetingPending(j)){
    const raw=j.meeting.remaining;
    const remaining=typeof raw==='number'&&Number.isFinite(raw)?Math.max(0,Math.min(MEETING_MINUTES,raw)):MEETING_MINUTES;
    j.meeting={phase:remaining===0?"done":"queued",remaining};
  }
}
function meetingLabel(j){
  if(!meetingPending(j)) return j.meeting?"Đã chốt yêu cầu · đang sản xuất":"";
  const m=j.meeting;
  return m.phase==="meeting"?`Đang họp chốt yêu cầu · còn ${Math.ceil(m.remaining)} phút game`
    :m.phase==="walking"?"Khách và nhân viên đang đến bàn họp":"Chờ bàn họp có lối vào và nhân viên rảnh";
}
