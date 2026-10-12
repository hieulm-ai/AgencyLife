// Test-only controls. The fixture uses a separate save key from the playable game.
const qa=document.createElement("div");
qa.style.cssText="position:fixed;left:12px;top:80px;z-index:99999;background:#fff8df;padding:10px;border:2px solid #89562e;border-radius:10px;font:12px sans-serif;max-width:440px";
qa.innerHTML='<b>Kiểm tra cảnh họp — dữ liệu riêng</b><br><label>Khách thử <select id="qaCustomer">'+CUSTS.map((c,i)=>`<option value="${i}">${c.name}</option>`).join('')+'</select></label> <label>Góc <select id="qaRotation">'+[0,1,2,3].map(i=>`<option value="${i}">${i+1}</option>`).join('')+'</select></label><br><button id="qaPrepare">Chuẩn bị cuộc họp</button> <button id="qaArrive">Đến bàn</button> <button id="qaAdvance">Tiến 25 giây</button> <button id="qaSell">Bán bàn thử</button><br><output id="qaStatus"></output>';
document.body.append(qa);
const skinQA=document.createElement('button');skinQA.textContent='Cấp 1000 ruby thử';qa.append(skinQA);
skinQA.onclick=()=>{GS.gems=1000;hud();save();};
const allSkinQA=document.createElement('button');allSkinQA.textContent='Mặc Streetwear cả đội';qa.append(allSkinQA);
allSkinQA.onclick=async()=>{GS.gems=1000;for(const c of CHARS)if(!GS.equippedSkins?.includes(c.id))await changeSkin(c.id);hud();save();};
const qaStatus=()=>{
  const j=GS.jobs.find(j=>j.id===9001);
  document.getElementById('qaStatus').textContent=j?`${meetingLabel(j)} | work=${j.work.toFixed(2)} | phase=${j.meeting.phase} | reserved=${meetingReservations().size}`:'Chưa tạo cảnh thử';
};
const five=document.createElement('button');five.textContent='Tiến 5 giây';qa.append(five);
five.onclick=()=>{for(let i=0;i<150;i++)qaTick();qaStatus();save();};
document.getElementById('qaPrepare').onclick=()=>{
  const ci=+document.getElementById('qaCustomer').value,rot=+document.getElementById('qaRotation').value;
  GS.jobs=[];GS.offers=[];GS.energy=120;GS.enUse=null;GS.day=1;GS.min=480;GS.speed=0;VIS=[];BUSY.clear();SEAT_COMPOSITES.clear();
  OBJS=[{uid:101,id:'meeting_table',gx:27,gy:48,rot},{uid:102,id:'sofa_blue',gx:35,gy:48,rot},
    {uid:103,id:'work_desk',gx:32,gy:45,rot:0},{uid:104,id:'office_chair_blue',gx:32,gy:46,rot:2}];nextUid=105;
  AG.forEach((a,i)=>Object.assign(a,{x:25+i%10,y:53+Math.floor(i/10),state:'wander',seat:null,path:[],wait:0,stress:10,react:null,meetingJob:undefined,useObj:null,acc:null}));
  rebuild();
  GS.offers=[{id:9001,received:true,name:'Pitch khách hàng lớn',cust:ci,need:18,reward:70,days:2,req:['meeting_table'],work:0,en:9}];
  acceptJob(9001);setTool('pan');fit();hud();qaStatus();save();
};
function qaTick(){stepAgents(1/30);stepGame(1/30);stepVisitors(1/30);if(!closingOffice){stepReception(1/30);stepMeetings(1/30);}}
document.getElementById('qaArrive').onclick=()=>{
  for(let i=0;i<2700;i++){qaTick();if(GS.jobs.find(j=>j.id===9001)?.meeting.phase==='meeting')break;}
  // Place staff at sofa seats too, so all furniture rotations can be inspected.
  for(const a of AG.filter(a=>a.seat?.uid===102)){a.state='sit';a.sitT=999;a.acc=accessOf(a.seat);}
  qaStatus();save();
};
document.getElementById('qaAdvance').onclick=()=>{for(let i=0;i<750;i++)qaTick();qaStatus();save();};
document.getElementById('qaSell').onclick=()=>{const o=OBJS.find(o=>o.uid===101);if(o)sellObj(o);stepMeetings(0);qaStatus();};
GS.speed=0;setInterval(qaStatus,500);qaStatus();

const largeHUD=document.createElement('button');largeHUD.textContent='Thử số dư lớn';qa.append(largeHUD);largeHUD.onclick=()=>{GS.gems=9876543210;cash=123456789;hud();updatePanels();};
const burnQA=document.createElement('button');burnQA.textContent='So sánh đứng và bốc cháy';qa.append(burnQA);burnQA.onclick=()=>{GS.speed=0;AG.slice(0,2).forEach((a,i)=>Object.assign(a,{x:28+i*2,y:54,state:i?'burn':'wander',path:[],seat:null,react:null,sadToday:false,stress:i?100:0}));};
const sixQA=document.createElement('button');sixQA.textContent='Ngồi đủ 6 ghế';qa.append(sixQA);
sixQA.onclick=()=>{
  GS.speed=0;GS.jobs=[];VIS=[];SEAT_COMPOSITES.clear();
  const o=OBJS.find(o=>o.uid===101),seats=SEATS.filter(s=>s.uid===101);
  AG.forEach((a,i)=>Object.assign(a,{state:i<6?'sit':'wander',seat:i<6?seats[i]:null,sitT:9999,path:[],react:null,meetingJob:undefined}));
  const [x,y]=iso(o.gx+1.5,o.gy+1),r=wrap.getBoundingClientRect();scale=5;ox=r.width*.55-x*scale;oy=r.height*.58-y*scale;
  document.getElementById('qaStatus').textContent=`Ghế riêng: ${seats.length}`;
};
const baseSix=document.createElement('button');baseSix.textContent='Thử nhóm trong ảnh lỗi';qa.append(baseSix);
baseSix.onclick=async()=>{
  for(let ci=0;ci<CHARS.length;ci++)applySkinImages(ci,BASE_SKIN_CHARS[ci],await loadSkinImages(BASE_SKIN_CHARS[ci]));
  GS.equippedSkins=[];sixQA.click();const seats=SEATS.filter(s=>s.uid===101);
  AG.forEach((a,i)=>Object.assign(a,{state:i>=4&&i<10?'sit':'wander',seat:i>=4&&i<10?seats[i-4]:null,sitT:9999,path:[],react:null,meetingJob:undefined}));
  SEAT_COMPOSITES.clear();
};
const loungeQA=document.createElement('button');loungeQA.textContent='Thử bàn tròn và sofa';qa.append(loungeQA);
loungeQA.onclick=()=>{
 GS.speed=0;GS.jobs=[];GS.offers=[];VIS=[];BUSY.clear();SEAT_COMPOSITES.clear();
 const rot=+document.getElementById('qaRotation').value;
 OBJS=[{uid:101,id:'round_table',gx:27,gy:48,rot},{uid:102,id:'sofa_blue',gx:32,gy:48,rot}];nextUid=103;
 AG.forEach(a=>Object.assign(a,{state:'wander',seat:null,path:[],react:null,meetingJob:undefined,useObj:null}));rebuild();
 const seats=SEATS.filter(s=>s.uid===101).concat(SEATS.filter(s=>s.uid===102));
 AG.forEach((a,i)=>Object.assign(a,{state:i<6?'sit':'wander',seat:i<6?seats[i]:null,sitT:9999,path:[],react:null}));
 const [x,y]=iso(30,49),r=wrap.getBoundingClientRect();scale=4;ox=r.width*.55-x*scale;oy=r.height*.6-y*scale;
};
const accessQA=document.createElement('button');accessQA.textContent='Kiểm tra đường vào ghế';qa.append(accessQA);
const accessResult=document.createElement('output');qa.append(accessResult);
accessQA.onclick=()=>{
 const targets=SEATS.filter(s=>s.uid===101||s.uid===102);
 const reachable=targets.filter(s=>{const acc=accessOf(s);return acc&&bfs(ENTRY,acc);});
 accessResult.textContent=` Lối vào: ${reachable.length}/${targets.length} ghế`;
};
const ergoQA=document.createElement('button');ergoQA.textContent='Thử ghế Pali mới';qa.append(ergoQA);
ergoQA.onclick=async()=>{
 GS.speed=0;GS.jobs=[];VIS=[];BUSY.clear();const ci=CHARS.findIndex(c=>c.id==='03_Pali');
 await applySkinImages(ci,SKINS['03_Pali'],await loadSkinImages(SKINS['03_Pali']));
 OBJS=[0,1,2,3].map((rot,i)=>({uid:201+i,id:'ergo_chair',gx:27+i*2,gy:48,rot}));nextUid=205;
 AG.forEach(a=>Object.assign(a,{state:'wander',seat:null,path:[],react:null,meetingJob:undefined,useObj:null}));rebuild();
 const originals=AG.filter(a=>a.ci!==ci);const p=AG.find(a=>a.ci===ci)||{ci,t:0,stress:0};
 originals.forEach(a=>Object.assign(a,{x:0,y:0,state:'wander',seat:null}));
  AG.splice(0,AG.length,...originals,...SEATS.filter(s=>s.uid>=201&&s.uid<=204).map(s=>({...p,state:'sit',seat:s,sitT:9999,path:[],react:null,acc:accessOf(s)})));
 const [x,y]=iso(30,49),r=wrap.getBoundingClientRect();scale=4;ox=r.width*.55-x*scale;oy=r.height*.6-y*scale;SEAT_COMPOSITES.clear();
};

const flowStart=document.createElement('button');flowStart.textContent='Thử khách từ vỉa hè';qa.append(flowStart);
flowStart.onclick=()=>{closingOffice=false;GS.speed=0;GS.min=480;GS.offers=[];GS.jobs=[];VIS=[];BUSY.clear();
 OBJS=[{uid:501,id:'reception_counter',gx:28,gy:48,rot:+document.getElementById('qaRotation').value},{uid:502,id:'sofa_blue',gx:34,gy:48,rot:0}];
 for(const a of AG){a.x=30;a.y=51;a.state='wander';a.seat=null;a.path=[];a.react=null;a.away=false;delete a.receptionUid;delete a.meetingJob;}
 rebuild();fillOffers();stepVisitors(.01);flowStatus();};
const flowOutput=document.createElement('output');qa.append(flowOutput);
function flowStatus(){flowOutput.textContent=`Quầy ${JSON.stringify(receptionPair())}; lễ tân ${AG.filter(a=>a.receptionUid!=null).map(a=>a.state+":"+a.x+","+a.y)}; Giờ ${Math.floor(GS.min/60)}:${Math.floor(GS.min%60)}; ngày ${GS.day}; đã gặp lễ tân ${GS.offers.filter(j=>j.received).length}; khách ${VIS.map(v=>v.state+':'+v.x.toFixed(1)+','+v.y.toFixed(1)).join(' / ')}; nhân viên ra ngoài ${AG.filter(a=>a.y>56).length}; đã về ${AG.filter(a=>a.away).length}`;}
const flowStep=document.createElement('button');flowStep.textContent='Chạy luồng 10 giây';qa.append(flowStep);flowStep.onclick=()=>{for(let i=0;i<300;i++)qaTick();flowStatus();};
const flowClose=document.createElement('button');flowClose.textContent='Chuyển tới 20:59';qa.append(flowClose);flowClose.onclick=()=>{GS.min=1259;flowStatus();};
const flowMove=document.createElement('button');flowMove.textContent='Di chuyển quầy đang tiếp';qa.append(flowMove);
flowMove.onclick=()=>{const o=OBJS.find(o=>o.id==='reception_counter');if(!o)return;o.gx+=2;rebuild();for(const v of VIS){const j=GS.offers.find(j=>j.id===v.jobId);if(j)j.received=false;}stepReception(.01);flowStatus();};
const buyReceptionQA=document.createElement('button');buyReceptionQA.textContent='Đặt món đang chọn tại 28,48';qa.append(buyReceptionQA);buyReceptionQA.onclick=()=>{placeFurn(28,48);flowStatus();};
const counterPose=document.createElement('button');counterPose.textContent='Xem lớp quầy và người';qa.append(counterPose);counterPose.onclick=()=>{GS.speed=0;const p=receptionPair();if(!p)return;const a=AG[0],v=VIS.find(v=>v.kind==='offer');if(!v)return;for(const n of AG){n.x=35;n.y=45;n.path=[];n.seat=null;n.state='wander';n.react=null;}a.x=p.staff[0];a.y=p.staff[1];a.state='reception';a.receptionUid=p.o.uid;a.dir=faceToward(a,p.o);v.x=p.guest[0];v.y=p.guest[1];v.path=[];v.state='wait';v.dir=faceToward(v,p.o);const [x,y]=iso(p.o.gx+1.5,p.o.gy+1),r=wrap.getBoundingClientRect();scale=6;ox=r.width*.55-x*scale;oy=r.height*.65-y*scale;flowStatus();};
const priorityQA=document.createElement('button');priorityQA.textContent='Thử ưu tiên job';qa.append(priorityQA);priorityQA.onclick=()=>{GS.speed=0;GS.jobs=[{id:9101,name:'Logo đang làm',work:4,need:16,reward:12,due:GS.day+2,req:[]},{id:9102,name:'Banner gấp',work:2,need:8,reward:9,due:GS.day,req:[]}];renderJobs();};
const debtQA=document.createElement('button');debtQA.textContent='Thử công nợ 20tr';qa.append(debtQA);debtQA.onclick=()=>{GS.speed=0;GS.min=480;closingOffice=false;GS.receivables=[];for(const a of AG){delete a.collection;delete a.meetingJob;delete a.receptionUid;a.away=false;a.state='wander';a.path=[];a.x=31;a.y=55;a.seat=null;}payJob({id:9201,name:'VIP thử công nợ',reward:20,invoice:true});renderJobs();};
const dayQA=document.createElement('button');dayQA.textContent='Thử màn chuyển ngày';qa.append(dayQA);dayQA.onclick=()=>{qa.style.display='none';GS.min=1260;GS.speed=0;beginClosing();for(const a of AG)a.away=true;stepGame(.1);};
const pickupQA=document.createElement('button');pickupQA.textContent='Thử khách nhận sản phẩm';qa.append(pickupQA);pickupQA.onclick=()=>{flowStart.onclick();GS.offers=[];VIS=[];GS.pickups=[];finishJobVisitor({id:9401,name:'Sản phẩm thử',cust:0,req:[]});renderJobs();save();};
const soakStart=document.createElement('button');soakStart.textContent='Chuẩn bị chơi thử nhiều ngày';qa.append(soakStart);
const soakOutput=document.createElement('output');qa.append(soakOutput);
soakStart.onclick=()=>{
 closingOffice=false;closingElapsed=0;dayTransitionLeft=0;document.getElementById('dayTransition').hidden=true;
 document.getElementById('unlockBox').classList.remove('open');GS.speed=0;GS.day=1;GS.min=480;GS.jobs=[];GS.offers=[];GS.pickups=[];GS.receivables=[];GS.collectionHistory=[];GS.done=0;GS.failed=0;GS.revToday=0;GS.revTotal=0;GS.dayStartTotals={done:0,failed:0};GS.kolDay=-1;GS.energy=120;GS.enUse=null;GS.midRefresh=0;GS.retainers=[];VIS=[];BUSY.clear();cash=200;
 OBJS=[{uid:701,id:'reception_counter',gx:28,gy:49,rot:0},{uid:702,id:'meeting_table',gx:33,gy:46,rot:0},{uid:703,id:'sofa_blue',gx:35,gy:51,rot:0}];
 for(let i=0;i<4;i++){OBJS.push({uid:710+i*2,id:'work_desk',gx:25+i*3,gy:43,rot:0},{uid:711+i*2,id:'office_chair_blue',gx:25+i*3,gy:44,rot:2});}
 nextUid=730;for(const [i,a] of AG.entries()){Object.assign(a,{x:25+i%10,y:53+Math.floor(i/10),state:'wander',seat:null,path:[],wait:0,stress:10,react:null,useObj:null,acc:null,away:false});delete a.collection;delete a.meetingJob;delete a.receptionUid;}
 rebuild();fillOffers();hud();soakOutput.textContent='Sẵn sàng · 4 bàn làm việc, 1 quầy, 1 bàn họp, 1 sofa';
};
const soakDay=document.createElement('button');soakDay.textContent='Chơi tự động một ngày';qa.append(soakDay);
soakDay.onclick=()=>{
 const start=GS.day,issues=new Set();let ticks=0;
 try{while(GS.day===start&&ticks<32000){
  qaTick();stepEnergy(1/30);ticks++;
  if(ticks%30===0){
   const offer=GS.offers.find(j=>j.received&&!missingReq(j).length&&j.en<=GS.energy&&j.en<=enLeftToday());if(offer&&GS.jobs.length<3&&!closingOffice)acceptJob(offer.id);
   for(const d of receivables()){const a=AG.find(a=>!a.collection&&!a.away&&a.meetingJob==null&&a.receptionUid==null&&a.state!=='burn');if(a&&!AG.some(a=>a.collection?.id===d.id))sendCollector(d.id,CHARS[a.ci].id);}
   const keys=[...AG,...VIS].filter(a=>a.seat).map(a=>a.seat.key);if(new Set(keys).size!==keys.length)issues.add('Trùng ghế');
   if(AG.some(a=>a.y>ENTRY[1]&&!a.collection&&!closingOffice&&!a.away))issues.add('Nhân viên ra ngoài sai nhiệm vụ');
   if(!Number.isFinite(cash)||GS.jobs.some(j=>!Number.isFinite(j.work)))issues.add('Giá trị không hữu hạn');
  }
 }}catch(e){issues.add(e.stack);}
 dayTransitionLeft=0;document.getElementById('dayTransition').hidden=true;GS.speed=0;
 soakOutput.textContent=`Ngày ${start} → ${GS.day}; ticks ${ticks}; xong ${GS.done}; trễ ${GS.failed}; đang làm ${GS.jobs.length}; nhận hàng ${GS.pickups.length}; nợ ${receivables().length}; coin ${cash.toFixed(2)}; lỗi: ${[...issues].join(' | ')||'không'}`;hud();
};
const removeCounterQA=document.createElement('button');removeCounterQA.textContent='Bỏ quầy kiểm tra';qa.append(removeCounterQA);removeCounterQA.onclick=()=>{OBJS=OBJS.filter(o=>o.id!=='reception_counter');rebuild();renderJobs();};
const restoreCounterQA=document.createElement('button');restoreCounterQA.textContent='Khôi phục quầy kiểm tra';qa.append(restoreCounterQA);restoreCounterQA.onclick=()=>{if(!OBJS.some(o=>o.id==='reception_counter'))OBJS.push({uid:501,id:'reception_counter',gx:28,gy:49,rot:0});rebuild();renderJobs();};
// Automatic-rest playtest: real simulation, isolated save.
const restQA=document.createElement('button');restQA.textContent='Thử cả đội stress cao';qa.append(restQA);
const restOutput=document.createElement('output');restOutput.id='restQAOutput';restOutput.style.display='block';qa.append(restOutput);
function restQAStatus(){restOutput.textContent=AG.map(a=>`${staffName(CHARS[a.ci].id)}: ${a.state}, stress ${a.stress.toFixed(1)}, nghỉ ${!!a.autoBreak}, máy ${a.useObj??'-'}`).join(' | ');}
restQA.onclick=()=>{soakStart.onclick();GS.offers=[];VIS=[];OBJS.push({uid:740,id:'premium_coffee',gx:27,gy:51,rot:0},{uid:741,id:'water_dispenser',gx:33,gy:51,rot:0});for(const a of AG){a.autoBreak=false;a.stress=85;}rebuild();restQAStatus();setTool('pan');fit();};
const restStep=document.createElement('button');restStep.textContent='Thư giãn 30 giây';qa.append(restStep);restStep.onclick=()=>{for(let i=0;i<900;i++){stepAgents(1/30);stepGame(1/30);}restQAStatus();};
const restThree=document.createElement('button');restThree.textContent='Thử 3 người không tiện ích';qa.append(restThree);restThree.onclick=()=>{restQA.onclick();AG.splice(3);GS.staffIds=AG.map(a=>CHARS[a.ci].id);OBJS=OBJS.filter(o=>o.uid!==740&&o.uid!==741);BUSY.clear();for(const a of AG){a.autoBreak=false;a.state='wander';a.useObj=null;a.path=[];a.stress=85;}rebuild();restQAStatus();hud();};
const restCheck=document.createElement('button');restCheck.textContent='Kiểm tra hồi phục trong 3 giờ game';qa.append(restCheck);restCheck.onclick=()=>{const seen=new Set(),issues=new Set(),initial=AG.map(a=>a.stress);for(let i=0;i<5400;i++){stepAgents(1/30);stepGame(1/30);for(const a of AG){if(!a.autoBreak&&a.stress<=55)seen.add(a.ci);if(a.y>=ENTRY[1]&&!a.collection&&!closingOffice)issues.add('Ra cửa');if(!Number.isFinite(a.stress))issues.add('Stress lỗi');}}restOutput.textContent=`Hồi phục: ${seen.size}/${AG.length}; stress đầu ${initial.map(n=>n.toFixed(1))}; stress cuối ${AG.map(a=>a.stress.toFixed(1))}; lỗi ${[...issues].join(',')||'không'}`;};
const hideRestQA=document.createElement('button');hideRestQA.textContent='Ẩn bảng thử để xem nhân sự';qa.append(hideRestQA);hideRestQA.onclick=()=>{qa.style.display='none';document.getElementById('bStaff').click();};
