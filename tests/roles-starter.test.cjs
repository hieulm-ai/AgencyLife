const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source'),src=fs.readFileSync(path.join(root,'template.html'),'utf8');
const slice=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const IDS=['01_Huy','02_Luwon','03_Pali','04_Tamny','06_Vu_a_Vu','07_Hao_Hao','08_Nganh','09_Vit_Vang','10_Con_LT','11_Juice','12_ADM','13_AB','14_HM','15_CongB','trinh_lac_corrected_v2'];
const ci=id=>IDS.indexOf(id);

function staffCtx(ids){const CHARS=IDS.map(id=>({id}));const c={CHARS,GS:{jobs:[],...(ids?{staffIds:ids}:{})},AG:CHARS.map((x,i)=>({ci:i,x:10,y:10,stress:20})),cash:100,ENTRY:[31,56],BUSY:new Set(),SEAT_COMPOSITES:new Map(),toasts:[],assignSeats(){},save(){},updatePanels(){},hud(){},toast(m,k){c.toasts.push([m,k]);},addOfficeNews(){},startArrival(a,d){a.state='arrive';a.x=-14;a.y=58;a.path=[[31,58],[31,56]];a.wait=d;},document:{getElementById(){return {classList:{remove(){}}};}},releaseMeeting(){}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'staff.js'),'utf8')+'\nrenderStaff=()=>{};',c);return c;}

test('chức danh theo V1: Trinh và Lạc là Account, Design thống nhất, Vịt Vàng là linh vật',()=>{
 const c=staffCtx();
 assert.equal(c.roleOf('trinh_lac_corrected_v2'),'Account');
 assert.equal(c.roleOf('11_Juice'),'Design');
 assert.equal(c.roleOf('01_Huy'),'Design');assert.equal(c.roleOf('02_Luwon'),'Design');
 assert.equal(c.roleOf('09_Vit_Vang'),'Linh vật');
 assert.equal(c.roleOf('12_ADM'),'Planner');   // V17: Đốc Giám làm Planner (chia việc)assert.equal(c.roleOf('15_CongB'),'Editor');
 for(const id of IDS)assert.ok(c.roleOf(id),id+' thiếu chức danh');
 assert.equal(c.staffName('06_Vu_a_Vu'),'Vũ à Vũ');assert.equal(c.staffName('trinh_lac_corrected_v2'),'Trinh và Lạc');assert.equal(c.staffName('01_Huy'),'Huy');
});
test('nhân vật cố định giữ tên cũ (trả lại 07/10 tối); tên game mới, giao diện không còn chữ 5bit',()=>{
 const c=staffCtx(),names=IDS.map(id=>c.staffName(id));
 assert.deepEqual(names,['Huy','Luwon','Pali','Tamny','Vũ à Vũ','Hảo Hảo','Ngánh','Vịt Vàng','Con LT','Juice','ADM','AB','HM','CongB','Trinh và Lạc']);
 assert.match(src,/<title>Agency's Life Tycoon/);assert.match(src,/<h1 id="introTitle">AGENCY'S LIFE TYCOON<\/h1>/);
 assert.ok(!/5bit/i.test(src.replace(/SAVE="5bit\.iso\.game\.v3"/,'')),'giao diện không còn chữ 5bit (trừ khóa lưu cũ)');
});
test('khôi phục đội gắn chức danh, cờ linh vật và người sáng lập',()=>{
 const c=staffCtx(['01_Huy','03_Pali','09_Vit_Vang']);c.AG[ci('09_Vit_Vang')].stress=80;c.restoreRoster();
 const by=id=>c.AG.find(a=>c.CHARS[a.ci].id===id);
 assert.equal(by('03_Pali').role,'Account');assert.equal(by('01_Huy').founder,true);
 assert.equal(by('09_Vit_Vang').mascot,true);assert.equal(by('09_Vit_Vang').stress,0);
});
test('người mới tuyển đi bộ từ đầu vỉa hè vào cửa chính; thiếu bàn thì báo, linh vật thì không',()=>{
 const c=staffCtx();c.restoreRoster();c.hireStaff('10_Con_LT');const a=c.AG.at(-1);
 assert.equal(a.state,'arrive');assert.deepEqual([a.x,a.y],[-14,58]);assert.deepEqual(a.path.at(-1),[31,56]);assert.equal(a.role,'Account');assert.equal(c.toasts.at(-1)[1],'err');
 const n=c.AG.length,cash=c.cash;c.hireStaff('09_Vit_Vang');assert.equal(c.AG.length,n,'Vịt Vàng có sẵn từ đầu, không tuyển');assert.equal(c.cash,cash);
});

function receptionCtx(staff){const c={ENTRY:[31,56],GS:{offers:[{id:1}],jobs:[]},VIS:[{jobId:1,kind:'offer',state:'wait',x:28,y:49,path:[]}],AG:staff,OBJS:[{uid:1,id:'reception_counter',gx:28,gy:48,rot:0}],FBY:{reception_counter:{views:Array.from({length:4},()=>({fp:[2,1]}))}},REACH:Array.from({length:64},()=>Array(64).fill(true)),blocked:()=>false,at:()=>0,bfs:(a,b)=>[a,b],BUSY:new Map(),faceToward:()=>'SW',renderJobs(){},save(){},waitSpots:()=>[],meetingPending:()=>false,releaseMeeting(){},visLeave(){},toast(){},assignSeats(){}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'visitor-lounge.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(root,'office-flow.js'),'utf8'),c);return c;}
test('chỉ nhân vật của bạn đứng quầy lễ tân; Account, Sale, linh vật không ra quầy',()=>{
 const p={x:28,y:47,path:[],state:'wander'};
 const me={...p,ci:0,role:'Lễ tân',founder:true},duck={...p,ci:7,role:'Linh vật',mascot:true},vu={...p,ci:4,role:'Sale'},pali={...p,ci:2,role:'Account'};
 let c=receptionCtx([vu,duck,pali,me]);c.stepReception(.1);assert.equal(me.receptionUid,1);assert.equal(pali.receptionUid,undefined);assert.equal(vu.receptionUid,undefined);
 c=receptionCtx([{...duck},{...pali},{...vu}]);c.stepReception(.1);assert.ok(c.AG.every(a=>a.receptionUid===undefined),'không có nhân vật của bạn thì không ai đứng quầy');
});
test('nhân vật của bạn có chức danh Lễ tân; nhân sự khác giữ chức danh gốc',()=>{
 const c=staffCtx(['11_Juice','03_Pali']);c.GS.player={kind:'preset',id:'11_Juice'};c.restoreRoster();
 assert.equal(c.roleOf('11_Juice'),'Lễ tân');assert.equal(c.roleOf('03_Pali'),'Account');assert.equal(c.roleOf('01_Huy'),'Design');
 assert.equal(c.AG.find(a=>c.CHARS[a.ci].id==='11_Juice').role,'Lễ tân');
});

function seatCtx(){const c={VIS:[],SEATS:[],GS:{},CHARS:IDS.map(id=>({id})),WORKSEAT:new Set(['office_chair_blue']),OBJS:[{uid:1,id:'office_chair_blue'},{uid:2,id:'office_chair_blue'},{uid:3,id:'sofa_blue',guest:true}],AG:[],SIMGS:IDS.map(()=>true),BUSY:new Map(),seatsOf:o=>o.id==='sofa_blue'?[{face:'SW'},{face:'SW'}]:[{face:'SW'}],meetingReservations:()=>new Map()};vm.createContext(c);vm.runInContext(slice('function assignSeats()','function rebuild()'),c);return c;}
const agent=(id,extra)=>({ci:ci(id),state:'wander',path:[],...extra});
test('bàn riêng theo ID: mở lại game vẫn về đúng bàn dù thứ tự danh sách đổi',()=>{
 const c=seatCtx();c.GS.homeSeats={'03_Pali':1,'01_Huy':2};c.AG=[agent('01_Huy'),agent('03_Pali')];c.assignSeats();
 assert.equal(c.AG[0].seat.uid,2);assert.equal(c.AG[1].seat.uid,1);
});
test('người chưa có bàn nhận chỗ chưa thuộc ai và được lưu làm bàn riêng',()=>{
 const c=seatCtx();c.GS.homeSeats={'01_Huy':1};c.AG=[agent('02_Luwon'),agent('01_Huy',{autoBreak:true})];c.assignSeats();
 assert.equal(c.AG[0].seat.uid,2);assert.equal(c.GS.homeSeats['02_Luwon'],2);assert.equal(c.GS.homeSeats['01_Huy'],1);
});
test('sofa của khách và linh vật không bao giờ nhận ghế',()=>{
 const c=seatCtx();c.AG=[agent('01_Huy'),agent('02_Luwon'),agent('03_Pali'),agent('09_Vit_Vang',{mascot:true})];c.assignSeats();
 assert.equal(c.AG[2].seat,null);assert.equal(c.AG[3].seat,null);assert.ok(c.AG.every(a=>!a.seat||a.seat.uid!==3));
});

function gameCtx(){const c={GS:{day:1,min:600,midRefresh:1,offers:[],jobs:[],retainers:[],templates:0,revToday:0,passToday:0,revTotal:0,weekDone:0,failed:0,dayStartTotals:{done:0,failed:0}},AG:[],VIS:[],OBJS:[],ENTRY:[31,56],FBY:{},BUSY:new Map(),AURA:{cat:0,aqua:0,trees:[]},GAME_MIN_PER_SEC:1,gameAcc:0,cash:0,CHARS:IDS.map(id=>({id})),MASCOT_RADIUS:3,MASCOT_RELIEF:6,closingOffice:false,CLOSE_MIN:1260,lvl:()=>1,hasItem:()=>false,isWorking:a=>a.state==='sit',seatKind:()=>'office_chair_blue',meetingPending:()=>false,advanceJobWork(){},beginClosing(){},assignSeats(){},fillOffers(){},renderJobs(){},toast(){},staffName:String,save(){}};vm.createContext(c);vm.runInContext(slice('function stepGame(gdt)','function useSource(k)'),c);Object.assign(c,{WORKSEAT:new Set(),workerRate:()=>0,deskBound:()=>false});vm.runInContext(fs.readFileSync(path.join(__dirname,'../source/pipeline.js'),'utf8'),c);return c;}
test('ngồi bàn khi chưa được giao bước nào không bị cộng stress; được giao bước mới tăng (V17)',()=>{
 const c=gameCtx(),a=agent('01_Huy',{state:'sit',stress:40,x:5,y:5});c.AG=[a];c.stepGame(60);assert.ok(a.stress<40);
 c.GS.jobs=[{id:1,need:10,work:0,who:'01_Huy'}];const b=agent('01_Huy',{state:'sit',stress:40,x:5,y:5});c.AG=[b];c.stepGame(60);assert.ok(b.stress>40);
 c.GS.jobs=[{id:1,need:10,work:0,paused:true,who:'01_Huy'}];const d=agent('01_Huy',{state:'sit',stress:40,x:5,y:5});c.AG=[d];c.stepGame(60);assert.ok(d.stress<40);
});
test('Vịt Vàng không tích stress và giảm stress cho người trong bán kính 3 ô',()=>{
 const c=gameCtx();c.GS.jobs=[{id:1,need:100,work:0,who:'01_Huy'},{id:2,need:100,work:0,who:'02_Luwon'}];   // V17: mỗi người làm 1 bước của 1 job
 const duck=agent('09_Vit_Vang',{mascot:true,stress:50,x:10,y:10,state:'wander'}),near=agent('01_Huy',{state:'sit',stress:40,x:12,y:9}),far=agent('02_Luwon',{state:'sit',stress:40,x:20,y:20});
 c.AG=[duck,near,far];c.stepGame(60);
 assert.equal(duck.stress,0);assert.equal(Math.round(far.stress),48);assert.equal(Math.round(near.stress),42);
});

test('quầy lễ tân khởi đầu không bán được trước khi mở khu thứ hai',()=>{
 const c={undo:[],cash:0,OBJS:[{uid:1,id:'reception_counter',locked:true},{uid:2,id:'chair'}],FBY:{reception_counter:{price:7,name:'Quầy'},chair:{price:2,name:'Ghế'}},REFUND:.5,RUBY_COIN:10,level:1,lvl:()=>c.level,G:[[0]],N:1,WS:{},DS:{},document:{getElementById(){return {};}},confirm:()=>true,toasts:[],toast(m,k){c.toasts.push(k);},rebuild(){},hud(){},save(){},fmt:String,structureCoinValue:()=>0};vm.createContext(c);
 vm.runInContext(slice('function sellObj(','function drawLayered'),c);
 vm.runInContext(src.slice(src.indexOf('function clearOfficeNow()'),src.indexOf('\ndocument.getElementById("bClear")')),c);
 c.sellObj({uid:1});assert.equal(c.OBJS.length,2);assert.equal(c.toasts.at(-1),'err');
 c.clearOfficeNow();assert.deepEqual(c.OBJS.map(o=>o.uid),[1]);assert.equal(c.cash,1);
 c.level=2;c.sellObj({uid:1});assert.equal(c.OBJS.length,0);assert.equal(c.cash,4.5);
});
test('sảnh trước cửa chính không đặt đồ được nhưng vẫn trải thảm được',()=>{
 const c={ENTRY:[31,56],FBY:{desk:{layer:'object',price:1,views:[{fp:[1,1]}]},rug:{layer:'floor',price:1,views:[{fp:[1,1]}]}},plotAt:()=>0,at:()=>0,agentTiles:()=>new Set(),OCC:new Map(),RUG:new Map(),GS:{gems:0},UNLIM:true,cash:0,fmt:String};vm.createContext(c);
 const l=src.indexOf('const LOBBY=');vm.runInContext(src.slice(l,src.indexOf('\n',l)),c);vm.runInContext(slice('function fCheck(','function placeFurn('),c);
 assert.equal(c.fCheck('desk',31,54,0).ok,false);assert.equal(c.fCheck('desk',29,53,0).ok,false);assert.equal(c.fCheck('desk',31,51,0).ok,true);
 assert.equal(c.fCheck('rug',31,54,0).ok,true);
});
// Footprint thật của 5 món khởi đầu (manifest v3), tường/đồ cũ giả lập bằng at()/OCC.
const FP={reception_counter:[[3,1],[1,3],[1,3],[3,1]],sofa_blue:[[2,1],[1,2],[2,1],[1,2]],work_desk:[[2,1],[1,2],[1,2],[2,1]],office_chair_blue:[[1,1],[1,1],[1,1],[1,1]],water_dispenser:[[1,1],[1,1],[1,1],[1,1]],ergo_chair:[[1,1],[1,1],[1,1],[1,1]],potted_plant:[[1,1],[1,1],[1,1],[1,1]]};
function starterCtx(objs=[],walls=[],gs={}){
 const FBY=Object.fromEntries(Object.entries(FP).map(([id,v])=>[id,{views:v.map(fp=>({fp}))}])),wall=new Set(walls.map(([x,y])=>x+','+y));
 const c={GS:{...gs},OBJS:objs.map(o=>({...o})),nextUid:objs.reduce((m,o)=>Math.max(m,o.uid+1),1),FBY,OCC:new Map(),
  WORKSEAT:new Set(['office_chair_blue','ergo_chair','dual_monitor_desk','editing_workstation']),DESKS:new Set(['work_desk','dual_monitor_desk','editing_workstation']),
  at:(x,y)=>wall.has(x+','+y)?1:0,plotAt:()=>0,rebuildLock(){}};
 c.rebuildOcc=()=>{c.OCC=new Map();for(const o of c.OBJS){const [w,d]=FBY[o.id].views[o.rot].fp;for(let y=o.gy;y<o.gy+d;y++)for(let x=o.gx;x<o.gx+w;x++)c.OCC.set(x+','+y,o.uid);}};
 vm.createContext(c);vm.runInContext(slice('const STARTER_OFFICE=','// Mở game:')+';this.STARTER_OFFICE=STARTER_OFFICE;',c);return c;
}
test('bộ khởi đầu: quầy cố định ngoài sảnh, sofa cho khách, 3 bàn riêng cho đội khởi đầu',()=>{
 const c=starterCtx();const added=c.applyStarterOffice();
 assert.deepEqual([...new Set(added)],['quầy lễ tân','sofa khách','bàn làm việc','cây nước']);assert.equal(c.GS.starterApplied,true);
 const counter=c.OBJS.find(o=>o.id==='reception_counter'),sofa=c.OBJS.find(o=>o.id==='sofa_blue');
 assert.equal(counter.locked,true);assert.equal(sofa.guest,true);
 assert.equal(c.OBJS.filter(o=>o.id==='work_desk').length,3);
 for(const id of ['01_Huy','02_Luwon','03_Pali'])assert.equal(c.OBJS.find(o=>o.uid===c.GS.homeSeats[id]).id,'office_chair_blue');
 assert.ok(c.OBJS.every(o=>!('home' in o)));
 const inLobby=(x,y)=>x>=29&&x<=33&&y>=53&&y<=56;assert.ok(c.OBJS.every(o=>!inLobby(o.gx,o.gy)));
 assert.equal(new Set(c.OBJS.map(o=>o.uid)).size,c.OBJS.length);
});
test('bản lưu cũ chưa có quầy và chỗ làm việc được bổ sung bộ khởi đầu; bản lưu đã có thì giữ nguyên',()=>{
 const empty=starterCtx([{uid:5,id:'potted_plant',gx:40,gy:40,rot:0}]);const added=empty.applyStarterOffice();
 assert.ok(added.includes('quầy lễ tân')&&added.includes('bàn làm việc'));
 assert.equal(empty.OBJS.filter(o=>o.id==='work_desk').length,3);assert.ok(empty.OBJS.every(o=>o.uid>=5));
 assert.equal(new Set(empty.OBJS.map(o=>o.uid)).size,empty.OBJS.length);
 const built=[{uid:1,id:'reception_counter',gx:10,gy:10,rot:0},{uid:2,id:'ergo_chair',gx:12,gy:12,rot:0}];
 const full=starterCtx(built);assert.deepEqual([...full.applyStarterOffice()],[]);
 assert.equal(full.OBJS.length,2);assert.equal(full.GS.starterApplied,true);
 const deskOnly=starterCtx([{uid:3,id:'work_desk',gx:5,gy:5,rot:0}]);const d=deskOnly.applyStarterOffice();
 assert.deepEqual([...new Set(d)],['quầy lễ tân','sofa khách']);assert.equal(deskOnly.OBJS.filter(o=>o.id==='work_desk').length,1);
});
test('nhóm bàn+ghế vướng tường bị bỏ cả nhóm, không để ghế lẻ; các nhóm khác vẫn đặt',()=>{
 const c=starterCtx([],[[27,49]]);c.applyStarterOffice();
 assert.ok(!c.OBJS.some(o=>o.gx===26&&o.gy===48));assert.ok(!c.OBJS.some(o=>o.id==='work_desk'&&o.gx===26));
 assert.equal(c.OBJS.filter(o=>o.id==='work_desk').length,2);assert.equal(c.GS.homeSeats['02_Luwon'],undefined);
 for(const id of ['01_Huy','03_Pali'])assert.equal(c.OBJS.find(o=>o.uid===c.GS.homeSeats[id]).id,'office_chair_blue');
 const blockedCounter=starterCtx([{uid:9,id:'potted_plant',gx:31,gy:52,rot:0}]);blockedCounter.applyStarterOffice();
 assert.ok(!blockedCounter.OBJS.some(o=>o.id==='reception_counter'));assert.equal(blockedCounter.OBJS.filter(o=>o.id==='potted_plant').length,1);
});
