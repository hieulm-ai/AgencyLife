// Reputation is separate from purchased land levels and never changes accepted jobs.
const REP_LEVELS=[{min:0,name:'Agency mới'},{min:50,name:'Được biết đến'},{min:150,name:'Đáng tin cậy'},{min:350,name:'Agency nổi bật'},{min:700,name:'Thương hiệu uy tín'}];
function ensureReputation(){
 if(!GS.reputation||!Number.isFinite(GS.reputation.points))GS.reputation={points:Math.max(0,(GS.done||0)*10-(GS.failed||0)*8),history:[]};
 GS.reputation.points=Math.max(0,GS.reputation.points);
 if(!Array.isArray(GS.reputation.history))GS.reputation.history=[];
 return GS.reputation;
}
function reputationLevel(points){let index=0;for(let i=1;i<REP_LEVELS.length;i++)if(points>=REP_LEVELS[i].min)index=i;return index;}
function recordReputation(job,success,stars){
 const rep=ensureReputation(),before=reputationLevel(rep.points);
 const delta=success?10+(job.vip?5:0)+(GS.day<job.due?2:0)+(typeof STAR_REP!=='undefined'&&STAR_REP[stars]||0):(typeof lateRepDelta==='function'?lateRepDelta(job):-8);
 const applied=Math.max(0,rep.points+delta)-rep.points;rep.points+=applied;
 rep.history.unshift({day:GS.day,name:String(job.name),delta:applied,success,...(stars?{stars}:{})});rep.history=rep.history.slice(0,8);
 addOfficeNews(success?"job":"late",`${success?"Hoàn thành":"Trễ hạn"}: ${job.name}${stars?' · '+stars+'★':''} · danh tiếng ${applied>0?"+":""}${applied}`);
 const after=reputationLevel(rep.points);
 if(after>before)toast(`Danh tiếng cấp ${after+1}: ${REP_LEVELS[after].name}`,'ok');
 return applied;
}
function renderReputation(){
 const rep=ensureReputation(),index=reputationLevel(rep.points),level=REP_LEVELS[index],next=REP_LEVELS[index+1];
 const percent=next?Math.min(100,(rep.points-level.min)/(next.min-level.min)*100):100;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<div class="cg2">Danh tiếng · Cấp ${index+1}/5</div><b>${level.name}</b><div class="pbar"><i style="width:${percent}%"></i><span>${rep.points}${next?' / '+next.min:''} điểm</span></div><p style="font-size:12px;margin:6px 0">${next?'Còn '+(next.min-rep.points)+' điểm để đạt '+next.name+'.':'Đã đạt cấp danh tiếng cao nhất.'}<br>Hoàn thành +10 · VIP thêm +5 · trước hạn thêm +2 · trễ hạn −8 · đánh giá của khách 5★ +5, 4★ +2, 2★ −4, 1★ −8. Điểm thấp nhất là 0.</p><p style="font-size:11px;margin:0">Danh tiếng phản ánh kết quả công việc; cấp khu đất và giá job giữ nguyên.</p>`+
 (rep.history.length?'<div class="cg2">Kết quả gần đây</div>'+rep.history.map(h=>`<div class="row"><span>N${h.day} · ${esc(h.name)}</span><b>${h.stars?h.stars+'★ · ':''}${h.delta>0?'+':''}${h.delta}</b></div>`).join(''):'');
}
