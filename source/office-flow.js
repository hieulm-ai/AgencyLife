// Visitor arrival and staff access share one entrance; ordinary staff stay inside.
const SIDEWALK=[24,58], OUTSIDE_ENTRY=[31,58], CLOSE_MIN=21*60;
let closingOffice=false, closingElapsed=0;
function indoorStaffTile(x,y){return !blocked(x,y)&&at(x,y)===0&&y<ENTRY[1]&&REACH[y]?.[x];}
function receptionPair(){
  for(const o of OBJS.filter(o=>o.id==='reception_counter')){
    const [w,d]=FBY[o.id].views[o.rot].fp;
    const pairs=w>=d
      ? Array.from({length:w},(_,i)=>[[o.gx+i,o.gy+d],[o.gx+i,o.gy-1]])
      : Array.from({length:d},(_,i)=>[[o.gx+w,o.gy+i],[o.gx-1,o.gy+i]]);
    pairs.sort((a,b)=>Math.abs((w>=d?a[0][0]-o.gx:a[0][1]-o.gy)-(Math.max(w,d)-1)/2)-Math.abs((w>=d?b[0][0]-o.gx:b[0][1]-o.gy)-(Math.max(w,d)-1)/2));
    for(const [front,back] of pairs){const guest=o.rot<2?front:back,staff=o.rot<2?back:front;
      if(indoorStaffTile(...staff)&&!blocked(...guest)&&bfs(ENTRY,guest))return {o,guest,staff};}
  }
  return null;
}
function releaseReception(a){if(a.state==='reception'||a.state==='toReception'){a.state='wander';a.path=[];a.wait=0;}delete a.receptionUid;if(!closingOffice)assignSeats();}
// Nhân vật của người chơi đứng quầy lễ tân cố định (07/10/2026): không nhận bàn làm việc, không làm job, không đi thu tiền, không chủ trì họp.
// Khi chưa có quầy dùng được (bị bán, đang di chuyển, bị chắn lối) thì nhân vật của bạn làm việc như nhân viên thường.
function deskBound(a){return !!a&&a===frontDeskAgent()&&!!deskBound.on;}
function frontDeskAgent(){
 const current=AG.find(a=>a.receptionUid!=null&&!a.handover&&deskReady(a)&&(a.founder||['HR','Kế toán','Trợ lý'].includes(a.role)));if(current&&!current.founder)return current;
 const pool=AG.filter(a=>!a.mascot&&deskReady(a)&&!a.handover&&!a.pass&&!a.autoBreak&&['HR','Kế toán','Trợ lý'].includes(a.role)&&!(typeof agentTask==='function'&&agentTask(a)));
 pool.sort((a,b)=>(a.lastReception||0)-(b.lastReception||0));
 return pool[0]||current||AG.find(a=>a.founder&&!a.mascot&&deskReady(a)&&!a.handover)||null;
}
function deskReady(a){return !!a&&!a.away&&a.state!=='leaving'&&a.state!=='arrive'&&a.state!=='burn'&&!a.collection&&a.meetingJob==null;}
function finishReceptionTurn(host){
  host.lastReception=Date.now();if(!host.founder){releaseReception(host);updateAutoBreak(host);}
}
function claimFrontDesk(host,pair){
  if(host.state==='sit'&&host.acc){[host.x,host.y]=host.acc;}
  if(host.useObj){BUSY.delete(host.useObj);host.useObj=null;}
  host.react=null;host.seat=null;host.autoBreak=false;host.state='toReception';host.receptionUid=pair.o.uid;
  if(GS.homeSeats)delete GS.homeSeats[CHARS[host.ci].id];   // bàn cũ để trống cho người khác
  host.path=bfs([Math.round(host.x),Math.round(host.y)],pair.staff,true)?.slice(1)||[];
  assignSeats();
}
// Mở game: nhân vật của bạn xuất hiện ngay sau quầy thay vì ở bàn làm việc.
function placeFounderAtDesk(){
  const host=frontDeskAgent(),pair=receptionPair();deskBound.on=!!pair;
  if(!host||!pair||!deskReady(host))return false;
  host.seat=null;host.acc=null;host.react=null;host.path=[];[host.x,host.y]=pair.staff;host.state='reception';host.receptionUid=pair.o.uid;host.dir=faceToward(host,pair.o);
  if(GS.homeSeats)delete GS.homeSeats[CHARS[host.ci].id];
  assignSeats();return true;
}
function stepReception(dt){
  if(closingOffice||dt<=0)return;
  const pair=receptionPair(),waiting=VIS.filter(v=>(v.kind==='offer'&&v.state==='wait'&&GS.offers.some(j=>j.id===v.jobId&&!j.received))||(v.kind==='pickup'&&v.state==='pickup'&&(GS.pickups||[]).some(j=>j.id===v.jobId))).sort((a,b)=>(a.qn??a.id)-(b.qn??b.id));   // tiếp theo thứ tự xếp hàng
  const was=deskBound.on;deskBound.on=!!pair;
  const host=frontDeskAgent();
  for(const a of AG)if(a!==host&&a.receptionUid!=null&&!a.handover)releaseReception(a);   // bản lưu cũ: người khác đang đứng quầy thì về chỗ
  if(!host){for(const v of waiting)v.receptionT=0;return;}
  if(host.handover){for(const v of waiting)v.receptionT=0;return;}   // đang đi giao việc: khách chờ tại chỗ
  if(!pair||!deskReady(host)){for(const v of waiting)v.receptionT=0;if(host.receptionUid!=null)releaseReception(host);else if(was&&!pair&&!closingOffice)assignSeats();return;}
  if(handoverQueue.length&&!waiting.some(v=>(v.receptionT||0)>0)&&startHandover(host)){for(const v of waiting)v.receptionT=0;return;}
  if(host.receptionUid!==pair.o.uid)claimFrontDesk(host,pair);
  if(Math.hypot(host.x-pair.staff[0],host.y-pair.staff[1])>.1){
    for(const v of waiting)v.receptionT=0;
    host.state='toReception';
    const end=host.path[host.path.length-1];
    if(!end||end[0]!==pair.staff[0]||end[1]!==pair.staff[1]){const p=bfs([Math.round(host.x),Math.round(host.y)],pair.staff,true);if(p)host.path=p.slice(1);else releaseReception(host);}
    return;
  }
  host.state='reception';host.dir=faceToward(host,pair.o);
  if(!waiting.length)return;
  const v=queueOrder()[0];if(!v||!waiting.includes(v))return;   // người đầu hàng chưa tới quầy thì chờ, không cho người sau chen lên
  if(Math.hypot(v.x-pair.guest[0],v.y-pair.guest[1])>.1){
    v.receptionT=0;
    if(!v.path.length){const p=bfs([Math.round(v.x),Math.round(v.y)],pair.guest);if(p){v.path=p.slice(1);v.goal=pair.guest;}}
    return;
  }
  v.dir=faceToward(v,pair.o);v.receptionT=(v.receptionT||0)+dt;
  if(v.receptionT>=2){if(v.kind==='pickup'){completePickup(v);finishReceptionTurn(host);renderJobs();return;}const j=GS.offers.find(j=>j.id===v.jobId);if(j){j.received=true;v.emo={k:'job',t:3};renderJobs();save();}
    afterBrief(v,j);finishReceptionTurn(host);   // ngồi sofa chờ hoặc ra về rồi quay lại khi xong
  }
}

// ---------- giao việc cho Account ----------
// Nhận job xong, nhân vật của bạn rời quầy, đi tới Account gần nhất (không có thì Sale, rồi người khác), trao brief rồi về quầy.
// Việc giao là phần nhìn thấy được: job vẫn bắt đầu sản xuất ngay khi nhận, không chờ giao xong.
const HANDOVER_TALK=2.4, HANDOVER_GIVEUP=30;
let handoverQueue=[];   // id job chờ mang đi giao; không lưu vào save (tải lại thì coi như đã giao)
function queueHandover(j){if(j&&!j.account&&!handoverQueue.includes(j.id))handoverQueue.push(j.id);}
function handoverCandidates(){return AG.filter(a=>!a.founder&&!a.mascot&&!a.away&&!a.collection&&!a.pass&&a.state!=='leaving'&&a.state!=='arrive'&&a.state!=='burn'&&a.meetingJob==null&&a.receptionUid==null);}
function handoverTarget(from){
  const pool=handoverCandidates(),dist=a=>Math.hypot(a.x-from.x,a.y-from.y);
  for(const role of ['Account','Sale',null]){const c=pool.filter(a=>role==null||a.role===role).sort((p,q)=>dist(p)-dist(q));if(c.length)return c[0];}
  return null;
}
function handoverTile(b){return b.state==='sit'&&b.acc?b.acc:[Math.round(b.x),Math.round(b.y)];}
function handoverPath(from,b){   // ô trống sát người nhận mà đi tới được, đường ngắn nhất
  const [bx,by]=handoverTile(b);let best=null;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const t=[bx+dx,by+dy];if(!indoorStaffTile(...t))continue;
    const p=bfs(from,t,true);if(p&&(!best||p.length<best.length))best=p;}
  return best;
}
function dirTo(a,x,y){const dx=x-a.x,dy=y-a.y;return Math.abs(dx)>=Math.abs(dy)?(dx>0?'SE':'NW'):(dy>0?'SW':'NE');}
function deliverHandover(j,b,remote){
  if(!j)return;
  const roleName=b?(b.role?` (${b.role})`:''):'';
  if(b)j.account=CHARS[b.ci].id;
  if(typeof onBriefDelivered==='function')onBriefDelivered(j,b);   // V17: Account nhận luôn bước Brief
  const msg=b?`${staffName(FOUNDER_ID)} đã giao «${j.name}» cho ${staffName(CHARS[b.ci].id)}${roleName}${remote?' qua tin nhắn':''}`:`Chưa có Account để giao «${j.name}» · job vào đội tự động`;
  if(typeof addOfficeNews==='function')addOfficeNews('job',msg);
  toast(msg,b?'ok':'err');save();if(typeof document!=='undefined'&&document.getElementById('jobs')?.classList.contains('open'))renderJobs();
}
function startHandover(host){
  while(handoverQueue.length){
    const j=GS.jobs.find(x=>x.id===handoverQueue[0]);handoverQueue.shift();
    if(!j||j.account)continue;
    const from=[Math.round(host.x),Math.round(host.y)],b=handoverTarget(host);
    if(!b){deliverHandover(j,null);continue;}
    const path=handoverPath(from,b);
    if(!path){deliverHandover(j,b,true);continue;}
    delete host.receptionUid;host.state='handover';host.react=null;host.seat=null;host.wait=0;
    host.handover={jobId:j.id,to:CHARS[b.ci].id,phase:'go',t:0};host.emo={k:'job',t:HANDOVER_GIVEUP+5};host.path=path.slice(1);
    return true;
  }
  return false;
}
function endHandover(a){delete a.handover;a.emo=null;a.react=null;a.path=[];a.state='wander';a.wait=0;}   // khung hình kế stepReception đưa về quầy
function stepHandover(a,dt){
  const h=a.handover;h.t+=dt;
  const j=GS.jobs.find(x=>x.id===h.jobId),b=AG.find(x=>CHARS[x.ci].id===h.to);
  const gone=!b||b.away||b.collection||b.state==='leaving'||b.meetingJob!=null;
  if(h.phase==='go'){
    if(!j){endHandover(a);return;}
    if(gone||h.t>HANDOVER_GIVEUP){deliverHandover(j,gone?null:b,!gone);endHandover(a);return;}
    if(a.path.length){const [x,y]=a.path[0];if(blocked(x,y)){a.path=[];return;}
      const dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy),sp=3*dt;if(d>1e-3)a.dir=dirTo(a,x,y);a.t+=dt;
      if(d<=sp){a.x=x;a.y=y;a.path.shift();}else{a.x+=dx/d*sp;a.y+=dy/d*sp;}return;}
    const [bx,by]=handoverTile(b);
    if(Math.max(Math.abs(a.x-bx),Math.abs(a.y-by))>1.6){const p=handoverPath([Math.round(a.x),Math.round(a.y)],b);if(p&&p.length>1){a.path=p.slice(1);return;}if(!p){deliverHandover(j,b,true);endHandover(a);return;}}
    h.phase='talk';h.t=0;a.emo=null;startReact(a,'talk',HANDOVER_TALK,dirTo(a,bx,by));
    if(b.state!=='sit'&&!b.react&&!b.path.length&&!b.autoBreak)startReact(b,'talk',HANDOVER_TALK,dirTo(b,a.x,a.y));
    b.emo={k:'job',t:HANDOVER_TALK+.6};
    deliverHandover(j,b,false);return;
  }
  if(a.react){a.react.t+=dt;a.t+=dt;if(a.react.t<a.react.dur)return;}
  endHandover(a);
}
function jobAccountLine(j){
  const f=frontDeskAgent();
  if(f?.handover?.jobId===j.id)return `<br>Lễ tân đang mang brief tới ${staffName(f.handover.to)}`;
  if(handoverQueue.includes(j.id))return '<br>Chờ lễ tân mang brief tới Account';
  return j.account?`<br>Account phụ trách: ${staffName(j.account)}`:'';
}
function drawAgentEmo(c,a){
 const [sx,sy]=a.state==='sit'&&a.seat&&a.seat.sx!=null?[a.seat.sx,a.seat.sy+14]:iso(a.x+.5,a.y+.5);
 drawStatusChat(c,sx,sy,a.emo.k);
}

function beginClosing(){
  closingOffice=true;closingElapsed=0;handoverQueue=[];
  for(const j of GS.jobs)if(meetingPending(j))releaseMeeting(j);
  for(const v of VIS)visLeave(v);
  for(const a of AG){
    if(a.collection){delete a.collection;}
    if(a.handover){delete a.handover;a.emo=null;}
    if(a.pass)endPass(a);
    if(a.state==='sit'&&a.acc)[a.x,a.y]=a.acc;
    releaseReception(a);a.react=null;a.seat=null;
    if(a.useObj){BUSY.delete(a.useObj);a.useObj=null;}
    a.state='leaving';a.path=[];
  }
  toast('21:00 · Cả đội tan làm','ok');
}
function stepStaffExit(a,dt){
  if(a.away)return;
  if(!a.path.length){if(a.y>ENTRY[1]){a.path=a.y>=OUTSIDE_ENTRY[1]?[streetExit(a)]:[OUTSIDE_ENTRY,streetExit(a)];}else {const p=bfs([Math.round(a.x),Math.round(a.y)],ENTRY);
    if(!p)return;a.path=[...p.slice(1),OUTSIDE_ENTRY,streetExit(a)];}}
  const [x,y]=a.path[0],dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy),sp=3*dt;
  if(y<=ENTRY[1]&&blocked(x,y)){a.path=[];return;}
  a.dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?'SE':'NW'):(dy>0?'SW':'NE');a.t+=dt;
  if(d<=sp){a.x=x;a.y=y;a.path.shift();if(!a.path.length)a.away=true;}else{a.x+=dx/d*sp;a.y+=dy/d*sp;}
}
function finishClosing(){
  // Sáng hôm sau: người đã ra khỏi văn phòng đi bộ từ đầu vỉa hè vào, lần lượt cách nhau ~1 giây.
  let k=0;
  for(const a of AG){if(a.away||a.y>ENTRY[1]){startArrival(a,k*1.1+Math.random()*1.2);k++;continue;}a.away=false;a.state='wander';a.path=[];a.roam=0;a.wait=0;}
  closingOffice=false;assignSeats();
}
function startArrival(a,delay){
  const e=streetExit(a);[a.x,a.y]=e;a.away=false;a.state='arrive';a.seat=null;a.react=null;a.roam=0;
  a.path=[OUTSIDE_ENTRY,ENTRY];a.wait=delay||0;a.dir=e[0]<OUTSIDE_ENTRY[0]?'SE':'NW';
}
function stepStaffArrive(a,dt){
  if(a.wait>0){a.wait-=dt;return;}
  if(!a.path.length){a.state='wander';a.wait=0;assignSeats();return;}
  const [x,y]=a.path[0],dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy),sp=3*dt;
  if(y<=ENTRY[1]&&blocked(x,y)){a.path=[];return;}
  a.dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?'SE':'NW'):(dy>0?'SW':'NE');a.t+=dt;
  if(d<=sp){a.x=x;a.y=y;a.path.shift();}else{a.x+=dx/d*sp;a.y+=dy/d*sp;}
}

// A wide counter cannot use one x+y key for people along its whole front edge.
function receptionDepth(person,base){
  for(const o of OBJS){if(o.id!=='reception_counter')continue;
    const [w,d]=FBY[o.id].views[o.rot].fp,x=person.x,y=person.y;
    const alongX=x>=o.gx-.25&&x<=o.gx+w-.75,alongY=y>=o.gy-.25&&y<=o.gy+d-.75;
    const front=(alongX&&y>=o.gy+d-.1&&y<=o.gy+d+.65)||(alongY&&x>=o.gx+w-.1&&x<=o.gx+w+.65);
    const back=(alongX&&y>=o.gy-1.65&&y<=o.gy-1+.1)||(alongY&&x>=o.gx-1.65&&x<=o.gx-1+.1);
    if(front)base=Math.max(base,objKey(o)+.05);
    else if(back)base=Math.min(base,objKey(o)-.05);
  }
  return base;
}
