// Receivables persist; trips are transient and can be restarted after reload.
function receivables(){return GS.receivables||(GS.receivables=[]);}
function recordCollection(debt,a){
 const history=GS.collectionHistory||(GS.collectionHistory=[]);
 if(history.some(x=>x.id===debt.id))return;
 history.unshift({id:debt.id,name:debt.name,amount:debt.amount,day:GS.day,min:Math.floor(GS.min),staff:CHARS[a.ci].id});
 history.splice(10);
}
function collectorStatus(a){
 const t=a.collection;if(!t)return '';
 const name=staffName(CHARS[a.ci].id);
 if(t.phase==='collect')return `${name} · Đang thu tiền · còn ${Math.max(0,Math.ceil(t.remaining))} phút game`;
 return `${name} · ${t.blocked?'Đường bị chặn · hãy mở lối':t.phase==='back'?'Đã thu tiền · đang quay về':'Đang tới điểm hẹn'}`;
}
function payJob(j){
 const amount=Math.round(j.reward*(GS.kolDay===GS.day?2:1)*10)/10;
 if(j.invoice){receivables().push({id:j.id,name:j.name,amount,day:GS.day});toast(`Xong ${j.name} · chờ thu ${fmt(amount)}`,'ok');}
 else {cash+=amount;GS.revToday+=amount;GS.revTotal+=amount;toast(`Xong ${j.name} · +${fmt(amount)}`,'ok');}
 return amount;
}
// V17: Kế toán thu nhanh hơn (20 thay 30 phút game). Nhân vật chính gốc Kế toán lo giấy tờ ở quầy nên ai đi thu cũng nhanh hơn (thông số thử).
function collectMinutes(a){const m=(a&&a.role==='Kế toán'?20:30)*(typeof perkVal==='function'?perkVal('collect'):1);return Math.round(m*10)/10;}
function sendCollector(id,staffId){
 const debt=receivables().find(d=>d.id===id),a=AG.find(a=>CHARS[a.ci].id===staffId);
 if(!debt||!a||closingOffice||GS.min>=CLOSE_MIN-60)return;
 if(AG.some(a=>a.collection?.id===id)||a.mascot||a.collection||a.handover||a.pass||(typeof deskBound==='function'&&deskBound(a))||a.away||a.state==='arrive'||a.state==='burn'||a.meetingJob!=null||a.receptionUid!=null)return;
 const from=a.state==='sit'&&a.acc?a.acc:[Math.round(a.x),Math.round(a.y)],p=bfs(from,ENTRY);
 if(!p){toast('Không có đường ra cửa để thu tiền','err');return;}
 [a.x,a.y]=from;if(a.useObj){BUSY.delete(a.useObj);a.useObj=null;}
 a.seat=null;a.react=null;a.state='collect';a.collection={id,phase:'out',remaining:collectMinutes(a)};a.path=[...p.slice(1),OUTSIDE_ENTRY,streetExit(a)];
 renderJobs();save();
}
function stepCollector(a,dt){
 const trip=a.collection;if(!trip||dt<=0)return;
 if(a.path.length){const [x,y]=a.path[0];if(y<=ENTRY[1]&&blocked(x,y)){a.path=[];trip.blocked=true;return;}trip.blocked=false;
 const dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy),sp=3*dt;a.dir=Math.abs(dx)>=Math.abs(dy)?(dx>0?'SE':'NW'):(dy>0?'SW':'NE');a.t+=dt;
 if(d<=sp){a.x=x;a.y=y;a.path.shift();}else {a.x+=dx/d*sp;a.y+=dy/d*sp;}return;}
 if(trip.phase==='out'){
  const end=streetExit(a);
  if(Math.hypot(a.x-end[0],a.y-end[1])>.1){
   if(a.y>=OUTSIDE_ENTRY[1]){a.path=[end];return;}
   if(a.y>ENTRY[1]){a.path=[OUTSIDE_ENTRY,end];return;}
   const p=bfs([Math.round(a.x),Math.round(a.y)],ENTRY);trip.blocked=!p;if(p)a.path=[...p.slice(1),OUTSIDE_ENTRY,end];return;}
  trip.phase='collect';
 }
 if(trip.phase==='collect'){
  trip.remaining-=dt*GAME_MIN_PER_SEC;if(trip.remaining>0)return;
  const debt=receivables().find(d=>d.id===trip.id);
  if(debt){recordCollection(debt,a);GS.receivables=receivables().filter(d=>d!==debt);cash+=debt.amount;GS.revToday+=debt.amount;GS.revTotal+=debt.amount;toast(`Đã thu ${fmt(debt.amount)} · ${debt.name}`,'ok');save();hud();renderJobs();}
  trip.phase='back';trip.blocked=false;a.path=[OUTSIDE_ENTRY,ENTRY];renderJobs();return;
 }
 if(trip.phase==='back'){if(Math.hypot(a.x-ENTRY[0],a.y-ENTRY[1])>.1){const p=a.y>ENTRY[1]?[OUTSIDE_ENTRY,ENTRY]:bfs([Math.round(a.x),Math.round(a.y)],ENTRY)?.slice(1);a.path=p||[];return;}delete a.collection;a.state='wander';a.wait=0;assignSeats();renderJobs();}
}
function collectionUI(){
 const returning=AG.filter(a=>a.collection?.phase==='back').map(a=>`<div class="job"><b>${collectorStatus(a)}</b><div class="jm">Nhân viên tiếp tục công việc sau khi về văn phòng.</div></div>`).join('');
 const history=(GS.collectionHistory||[]).map(r=>`<div class="jm">Ngày ${r.day} · ${String(Math.floor(r.min/60)).padStart(2,'0')}:${String(r.min%60).padStart(2,'0')} · ${r.name}<br>+${fmt(r.amount)} · ${staffName(r.staff)}</div>`).join('');
 return returning+(history?`<div class="job"><b>Đã thu gần đây (tối đa 10 khoản)</b>${history}</div>`:'')+(receivables().length?`<div class="cg2">Công nợ cần thu · ${fmt(receivables().reduce((n,d)=>n+d.amount,0))}</div>`:'')+receivables().map(d=>{const runner=AG.find(a=>a.collection?.id===d.id),closed=closingOffice||GS.min>=CLOSE_MIN-60;
 const candidates=AG.filter(a=>!a.mascot&&!a.collection&&!a.handover&&!a.pass&&!(typeof deskBound==='function'&&deskBound(a))&&!a.away&&a.state!=='arrive'&&a.state!=='burn'&&a.meetingJob==null&&a.receptionUid==null);
 return `<div class="job"><b>${d.name} · ${fmt(d.amount)}</b><div class="jm">${runner?collectorStatus(runner):closed?'Cử người vào ngày mai (trước 20:00)':'Chọn người đi thu · 30 phút game tại điểm hẹn, cộng thời gian đi lại'}</div>${!runner&&!closed?candidates.sort((p,q)=>(q.role==='Kế toán')-(p.role==='Kế toán')).map(a=>`<button class="btn ${a.role==='Kế toán'?'g':'c'}" data-collect="${d.id}" data-person="${CHARS[a.ci].id}">${staffName(CHARS[a.ci].id)}${a.role==='Kế toán'?' · Kế toán (20 phút)':''}</button>`).join('')||'<div class="jm">Chưa có nhân viên rảnh</div>':''}</div>`;}).join('');
}
