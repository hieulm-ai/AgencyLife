// Hai đầu vỉa hè trước văn phòng nằm ở mép bản đồ (x = −M và N+M−1, M=14, N=64): khách và nhân viên xuất hiện/biến mất ở đó.
const STREET_L=[-14,58], STREET_R=[77,58];
function streetExit(person){return (person.exitSide??=((person.id??person.ci??0)%2))?STREET_L:STREET_R;}
// Độ hiện của người đi trên vỉa hè: mờ dần trong 3 ô cuối trước mép bản đồ, không bật/tắt đột ngột.
function streetFade(p){if(p.y<57.5)return 1;const d=Math.min(p.x-STREET_L[0],STREET_R[0]-p.x);return Math.max(0,Math.min(1,d/3));}
// Hàng chờ ở quầy lễ tân: khách xếp theo thứ tự đến; người đầu hàng xong thì cả hàng tiến lên; đứng chờ thì quay mặt về quầy.
let queueSeq=0, queueT=0;
function inQueue(v){
 if(v.state==='leave'||v.gone)return false;
 if(v.kind==='offer')return (v.state==='in'||v.state==='wait')&&!GS.offers.find(j=>j.id===v.jobId)?.received;
 return v.kind==='pickup'&&(v.state==='in'||v.state==='pickup');
}
function queueOrder(){return VIS.filter(inQueue).sort((a,b)=>(a.qn??a.id)-(b.qn??b.id));}
function walkVisitorTo(v,goal){
 const outside=v.y>ENTRY[1],from=outside?ENTRY:[Math.round(v.x),Math.round(v.y)],p=bfs(from,goal);if(!p)return false;
 v.goal=goal;v.path=outside?[...(v.y>OUTSIDE_ENTRY[1]-.5?[OUTSIDE_ENTRY]:[]),ENTRY,...p.slice(1)]:p.slice(1);return true;
}
function faceCounter(v){const pair=receptionPair();if(pair)v.dir=faceToward(v,pair.o);}
function updateQueue(dt){
 queueT-=dt;if(queueT>0)return;queueT=.4;
 const spots=waitSpots();if(!spots.length)return;
 queueOrder().forEach((v,i)=>{
  const s=spots[Math.min(i,spots.length-1)];
  if(v.receptionT>0||(v.goal&&v.goal[0]===s[0]&&v.goal[1]===s[1]))return;   // đang được tiếp thì đứng yên
  walkVisitorTo(v,s);
 });
}
// Giao yêu cầu xong: job ngắn (≤ 24 giờ công) thì khách thường ngồi sofa chờ; job dài, hết chỗ sofa hoặc khách bận thì ra về.
// Khách đã về sẽ quay lại khi sản phẩm xong (finishJobVisitor → hàng chờ nhận sản phẩm).
const SOFA_WAIT_MAX_NEED=24, SOFA_WAIT_CHANCE=.75;
function waitsOnSofa(v,j){return !!j&&j.need<=SOFA_WAIT_MAX_NEED&&((v.id*9301+49297)%233280)/233280<SOFA_WAIT_CHANCE;}
function afterBrief(v,j){
 if(waitsOnSofa(v,j)){goToSofa(v);return;}
 if(j)j.visitorDeparted=true;
 visLeave(v,'wait');
}
function goToSofa(v){
 const occupied=new Set([...AG,...VIS.filter(x=>x!==v)].filter(a=>a.seat).map(a=>a.seat.key));
 for(const o of OBJS.filter(o=>o.id==='sofa_blue'))for(const [i,z] of seatsOf(o).entries()){
  const seat={...z,uid:o.uid,key:o.uid+':'+i};if(occupied.has(seat.key))continue;
  const acc=accessOf(seat),p=acc&&bfs([Math.round(v.x),Math.round(v.y)],acc);if(!p)continue;
  v.seat=seat;v.acc=acc;v.goal=acc;v.path=p.slice(1);v.state='toLounge';return true;
 }
 const j=GS.offers.find(j=>j.id===v.jobId);if(j)j.visitorDeparted=true;
 visLeave(v);return false;
}
function stepLounge(v){
 if(v.state!=='toLounge'&&v.state!=='lounge')return false;
 const o=OBJS.find(o=>o.uid===v.seat?.uid),z=o&&seatsOf(o)[Number(v.seat.key.split(':')[1])];
 if(!z||Math.abs(z.px-v.seat.px)>.01||Math.abs(z.py-v.seat.py)>.01||z.face!==v.seat.face){v.seat=null;goToSofa(v);return true;}
 if(!v.path.length){if(Math.hypot(v.x-v.acc[0],v.y-v.acc[1])<.1){v.state='lounge';v.dir=v.seat.face;}else {v.seat=null;goToSofa(v);}}
 return false;
}
function finishJobVisitor(j){
 const v=VIS.find(v=>v.jobId===j.id&&v.state!=='leave');
 const q=GS.pickups||(GS.pickups=[]);
 if(!q.some(x=>x.id===j.id))q.push({id:j.id,name:j.name,cust:j.cust,req:j.req||[]});
 if(v){if(v.acc&&v.seat)[v.x,v.y]=v.acc;v.seat=null;v.path=[];v.goal=null;v.kind='pickup';v.state='pickup';v.receptionT=0;v.wait=0;v.qn=++queueSeq;queueT=0;return;}
 if(!VIS.some(v=>v.jobId===j.id))spawnVisitor('pickup',j);
}
function completePickup(v){
 GS.pickups=(GS.pickups||[]).filter(j=>j.id!==v.jobId);
 visLeave(v,'money');save();
}
function pickupUI(){
 const queue=GS.pickups||[];if(!queue.length)return '';
 const pair=receptionPair();
 return `<div class="cg2">Sản phẩm chờ bàn giao (${queue.length})</div>`+queue.map(j=>{
  const v=VIS.find(v=>v.jobId===j.id);
  const status=closingOffice?'Khách nhận vào ngày mai':!pair?'Cần quầy lễ tân có lối vào':!v?'Đang chờ khách quay lại':v.state==='leave'?'Khách đang về; sẽ quay lại nhận':v.state==='pickup'?(v.receptionT>0?'Đang bàn giao tại quầy':'Khách đang chờ nhân viên ở quầy'):'Khách đang tới quầy';
  return `<div class="job"><b>${j.name}</b><div class="jm">${status}</div></div>`;
 }).join('');
}
