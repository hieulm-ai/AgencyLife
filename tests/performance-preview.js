// Isolated browser fixture: uses the actual movement, work, stress and closing loops.
const perfInitial=JSON.parse(JSON.stringify(GS));
const perfPanel=document.createElement('section');
perfPanel.style.cssText='position:fixed;top:110px;right:12px;z-index:100000;background:#fff8df;border:2px solid #89562e;padding:12px;width:420px;max-height:65vh;overflow:auto;font:13px sans-serif';
perfPanel.innerHTML='<b>Đo năng suất — ván riêng</b><p>Hàng đợi đầy; có đi lại, chuyển hồ sơ, góp ý, nghỉ và tan ca. Lễ tân và linh vật không tính là người làm job.</p><label>Số người làm job <select id="perfSize"><option>3</option><option>6</option><option>9</option></select></label> <label>Hạt ngẫu nhiên <input id="perfSeed" type="number" value="1" min="1" style="width:55px"></label><p><button id="perfPrepare">Chuẩn bị đo</button> <button id="perfDay">Đo một ngày</button> <button id="perfBeta">Kiểm tra 15 người nghỉ</button></p><pre id="perfOutput" style="white-space:pre-wrap"></pre>';
document.body.append(perfPanel);
let perfRows=[],perfSeed=1,perfBurn=new Set(),perfErrors=new Set(),perfNext=9000;
const perfWorkers=['03_Pali','02_Luwon','13_AB','12_ADM','15_CongB','04_Tamny','14_HM','10_Con_LT','11_Juice','07_Hao_Hao','08_Nganh','06_Vu_a_Vu','trinh_lac_corrected_v2'];
function perfOut(extra){document.getElementById('perfOutput').textContent=JSON.stringify({speed:typeof WORK_SPEED==='number'?WORK_SPEED:1,workers:AG.filter(a=>!a.founder&&!a.mascot).length,mode:document.getElementById('perfReal')?.checked?'real-offers':'saturated',energy:Math.floor(GS.energy),energyRemainingToday:enLeftToday(),pendingJobs:GS.jobs.length,payroll:GS.lastDayReport?.payroll,days:perfRows,burns:perfBurn.size,errors:[...perfErrors],...(extra||{})},null,2);}
function perfReset(n,seed){
 window.Date=perfNativeDate;perfClockOffset=0;
 perfSeed=seed;Math.random=()=>{perfSeed=(Math.imul(1664525,perfSeed)+1013904223)>>>0;return perfSeed/4294967296;};
 for(const k of Object.keys(GS))delete GS[k];Object.assign(GS,JSON.parse(JSON.stringify(perfInitial)),{player:{id:'01_Huy',kind:'preset'},agencyName:'Phòng đo năng suất',introPending:false,tourDone:true,guideSeen:true,uiV15Seen:true,day:1,min:480,speed:0,jobs:[],offers:[],pickups:[],receivables:[],collectionHistory:[],reviews:[],repeatCust:[],done:0,failed:0,revToday:0,revTotal:0,dayStartTotals:{done:0,failed:0},payroll:undefined,energy:120,enUse:null,midRefresh:0,retainers:[],templates:0,stars:{},staffIds:['01_Huy',...perfWorkers.slice(0,n),MASCOT_ID]});
 closingOffice=false;closingElapsed=0;dayTransitionLeft=0;introOpen=false;guideOpen=false;
 document.getElementById('intro').style.display='none';document.getElementById('dayTransition').hidden=true;
 FOUNDER_ID='01_Huy';AG.length=0;
 for(const id of GS.staffIds){const ci=CHARS.findIndex(c=>c.id===id);AG.push(tagStaff({ci,x:25+AG.length%10,y:52,path:[],dir:'SW',t:0,wait:0,seat:null,state:'wander',sitT:0,roam:0,stress:10,away:false}));}
 UNLOCKED.clear();UNLOCKED.add(0);UNLOCKED.add(1);UNLOCKED.add(3);rebuildShell();
 OBJS=[{uid:701,id:'reception_counter',gx:28,gy:49,rot:0},{uid:740,id:'water_dispenser',gx:33,gy:51,rot:0}];
 for(let i=0;i<n;i++){const x=23+(i%6)*3,y=42+Math.floor(i/6)*5;OBJS.push({uid:710+i*2,id:'work_desk',gx:x,gy:y,rot:0},{uid:711+i*2,id:'office_chair_blue',gx:x,gy:y+1,rot:2});}
 nextUid=800;VIS=[];BUSY.clear();SEAT_COMPOSITES.clear();handoverQueue.length=0;cash=200;
 rebuild();fit();hud();perfRows=[];perfBurn.clear();perfErrors.clear();perfNext=9000;GS.offers=[];if(document.getElementById('perfReal').checked)fillOffers();perfOut();
}
function perfFill(){
 if(document.getElementById('perfReal').checked){
  const j=GS.offers.find(j=>j.received&&!missingReq(j).length&&j.en<=GS.energy&&j.en<=enLeftToday());
  if(j&&GS.jobs.length<jobCapacity())acceptJob(j.id);return;
 }
 // Saturated queue measures processing capacity; real offers/energy are tested separately.
 while(GS.jobs.length<(typeof jobCapacity==='function'?jobCapacity():3)){
  const t=[['Thiết kế logo',16],['Bộ ấn phẩm Tết',30],['Quản lý fanpage 1 tuần',40]][(perfNext-9000)%3];
  const need=Math.round(t[1]*(.85+Math.random()*.3));
  const j={id:perfNext++,name:t[0],need,reward:10,days:5,due:GS.day+5,req:[],work:0,en:Math.ceil(need/2),cust:0,account:'03_Pali'};ensureStages(j);GS.jobs.push(j);
 }
}
function perfTick(){const dt=.1;stepAgents(dt);stepGame(dt);stepVisitors(dt);if(!closingOffice){stepReception(dt);stepMeetings(dt);}stepEnergy(dt);for(const a of AG)if(a.state==='burn')perfBurn.add(CHARS[a.ci].id);if(!Number.isFinite(cash)||AG.some(a=>!Number.isFinite(a.stress)))perfErrors.add('Giá trị không hữu hạn');}
document.getElementById('perfPrepare').onclick=()=>perfReset(+document.getElementById('perfSize').value,+document.getElementById('perfSeed').value);
document.getElementById('perfDay').onclick=()=>{
 const day=GS.day,before=GS.done,failed=GS.failed,progress=new Map();let ticks=0;
 try{while(GS.day===day&&ticks++<10000){if(!closingOffice)perfFill();perfTick();if(ticks%100===0){const seats=AG.filter(a=>a.seat&&!a.away).map(a=>a.seat.key);if(new Set(seats).size!==seats.length)perfErrors.add('Trùng ghế');
  for(const j of GS.jobs){const old=progress.get(j.id);if(!old||old.work!==j.work||!j.who||!jobReady(j)||closingOffice)progress.set(j.id,{work:j.work,min:GS.min});else if(GS.min-old.min>60)perfErrors.add('Job '+j.id+' đứng quá 60 phút khi đã được giao');}
 }}if(GS.day===day)perfErrors.add('Không chuyển được ngày');}catch(e){perfErrors.add(e.stack);}
 perfRows.push({day,done:GS.done-before,failed:GS.failed-failed,ticks,stress:AG.filter(a=>!a.founder&&!a.mascot).map(a=>Math.round(a.stress))});
 if(!document.getElementById('perfReal').checked){GS.offers=[];VIS=[];GS.pickups=[];handoverQueue.length=0;}
 dayTransitionLeft=0;document.getElementById('dayTransition').hidden=true;GS.speed=0;hud();save();perfOut();
};
document.getElementById('perfBeta').onclick=()=>{
 perfReset(13,1);GS.jobs=[];GS.offers=[];OBJS=OBJS.filter(o=>o.uid!==740);OBJS.push({uid:740,id:'premium_coffee',gx:33,gy:51,rot:0});rebuild();
 const recovered=new Set(),issues=new Set();for(const a of AG)if(!a.mascot)a.stress=85;
 for(let i=0;i<1800;i++){
  if(i===50){for(const [k,[x,y]] of [[32,51],[34,51],[33,50],[33,52]].entries())OBJS.push({uid:750+k,id:'potted_plant',gx:x,gy:y,rot:0});rebuild();}
  if(i===100){OBJS=OBJS.filter(o=>o.uid<750||o.uid>753);const o=OBJS.find(o=>o.uid===740);o.gx+=3;rebuild();}
  if(i===300){OBJS=OBJS.filter(o=>o.uid!==740);rebuild();}
  stepAgents(.1);stepGame(.1);
  for(const a of AG){if(a.stress<=55&&!a.autoBreak)recovered.add(CHARS[a.ci].id);if(!Number.isFinite(a.stress))issues.add('Stress lỗi');}
  const refs=[...BUSY.values()];if(new Set(refs).size!==refs.length)issues.add('Một người giữ nhiều máy');
 }
 save();perfOut({beta:{recovered:recovered.size,total:AG.length,issues:[...issues],removedMachineReserved:BUSY.has(740)}});
};
GS.speed=0;perfOut();
const perfRealLabel=document.createElement('label');perfRealLabel.innerHTML='<input type="checkbox" id="perfReal"> Dùng khách và năng lượng thật';perfPanel.insertBefore(perfRealLabel,document.getElementById('perfOutput'));
const perfAll=document.createElement('option');perfAll.value='13';perfAll.textContent='13 (15 người gồm lễ tân và linh vật)';document.getElementById('perfSize').append(perfAll);

const perfRest=document.createElement('button');perfRest.textContent='Nghỉ 2 giờ thật (mô phỏng)';perfRest.id='perfRest';perfPanel.insertBefore(perfRest,document.getElementById('perfOutput'));
perfRest.onclick=()=>{const before={day:GS.day,min:GS.min,energy:GS.energy,allowance:enLeftToday()};stepEnergy(2*3600);save();hud();perfOut({rest:{before,after:{day:GS.day,min:GS.min,energy:GS.energy,allowance:enLeftToday()}}});};

// QA-only wall clock: advance real days without waiting or touching the main save.
const perfNativeDate=window.Date;let perfClockOffset=0;
const perfNextReal=document.createElement('button');perfNextReal.id='perfNextReal';perfNextReal.textContent='Qua 24 giờ thật (mô phỏng)';perfPanel.insertBefore(perfNextReal,document.getElementById('perfOutput'));
perfNextReal.onclick=()=>{perfClockOffset+=86400000;window.Date=class extends perfNativeDate{constructor(...args){super(...(args.length?args:[perfNativeDate.now()+perfClockOffset]));}static now(){return perfNativeDate.now()+perfClockOffset;}};stepEnergy(86400);save();hud();perfOut({realDaysAdvanced:perfClockOffset/86400000});};
