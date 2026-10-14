// Job đi qua 4 bước theo bộ phận (14/10/2026): Brief (Account) → Chia việc (Planner) → Sáng tạo (Content) → Sản xuất (Design).
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source'),src=fs.readFileSync(path.join(root,'template.html'),'utf8'),pipe=fs.readFileSync(path.join(root,'pipeline.js'),'utf8');
const ROLE={A:'Account',P:'Planner',D:'Design',C:'Content',E:'Editor',K:'Kế toán',H:'HR'};
function setup(ids='ACDEK'){
 const CHARS=[...ids].map(id=>({id}));
 const c={CHARS,GS:{day:1,min:600,jobs:[]},AG:CHARS.map((x,i)=>({ci:i,role:ROLE[x.id],state:'sit',seat:{uid:i+1},stress:0,x:i,y:0,path:[]})),OBJS:CHARS.map((x,i)=>({uid:i+1,id:'office_chair_blue'})),
  WORKSEAT:new Set(['office_chair_blue']),closingOffice:false,isWorking:a=>a.state==='sit',seatKind:()=>'office_chair_blue',meetingPending:j=>!!j.meeting&&j.meeting.phase!=='done',
  deskBound:()=>false,staffName:String,save(){},renderJobs(){},news:[],addOfficeNews(k,m){c.news.push(m);},handoverPath:(a,b)=>[a,[b.x,b.y]],handoverTile:b=>[b.x,b.y],dirTo:()=>'SW',
  startReact(a,k,d){a.react={kind:k,t:0,dur:d};},blocked:()=>false,BUSY:new Map(),UIIMG:()=>'',MASCOT_ID:'V',CLOSE_MIN:1260,teamEditorJob:null};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf('function assignedIds('),src.indexOf('function jobTeamUI(')),c);vm.runInContext(pipe,c);
 vm.runInContext(src.slice(src.indexOf('function jobTeamUI('),src.indexOf('function toggleJobPaused(')),c);
 return c;
}
const job=(id,name,need,extra={})=>({id,name,need,work:0,due:5,req:[],...extra});
const who=(c,j)=>j.who;
test('dựng 4 bước (có Chia việc của Planner), tổng giờ công đúng bằng job; bản lưu cũ rải giờ công đã làm từ bước đầu',()=>{
 const c=setup(),j=c.ensureStages(job(1,'Quản lý fanpage 1 tuần',24));
 assert.deepEqual(Array.from(j.stg,s=>s.k),['brief','plan','creative','prod']);
 assert.deepEqual(Array.from(j.stg,s=>s.role),['acc','plan','con','des']);
 assert.ok(Math.abs(j.stg.reduce((n,s)=>n+s.need,0)-24)<1e-9);
 const old=c.ensureStages(job(2,'⭐ Thiết kế logo',20,{work:7}));
 assert.equal(old.stg[3].role,'des');assert.equal(old.cur,2);assert.ok(Math.abs(old.stg[0].done-3.6)<1e-9);assert.ok(Math.abs(old.stg[1].done-2)<1e-9);assert.ok(Math.abs(old.stg[2].done-1.4)<1e-9);assert.equal(old.stg[3].done,0);
});
test('mỗi bước giao cho người đúng chuyên môn; người làm đúng nghề nhanh ×1,35',()=>{
 const c=setup('APCDEK'),j=job(1,'Quản lý fanpage 1 tuần',100);c.GS.jobs=[j];
 c.advanceJobWork(1);assert.equal(j.who,'A');assert.ok(Math.abs(j.stg[0].done-1.35*12)<1e-9);
 j.stg[0].done=j.stg[0].need-0.1;c.advanceJobWork(1);assert.equal(j.cur,1);assert.equal(j.handoff,'A');
 c.advanceJobWork(0);assert.equal(j.who,'P');assert.equal(j.passing,true,'Account mang hồ sơ sang bàn Planner');assert.equal(c.AG[0].pass.to,'P');
 const before=j.stg[1].done;c.advanceJobWork(1);assert.equal(j.stg[1].done,before,'chưa nhận hồ sơ thì chưa làm');
 c.endPass(c.AG[0]);c.advanceJobWork(1);assert.ok(j.stg[1].done>before);
});
test('thiếu bộ phận thì người khác làm thay, chậm hơn (gần nghề ×1, trái nghề ×0,6)',()=>{
 const c=setup('ADK'),j=job(1,'Quản lý fanpage 1 tuần',100);c.GS.jobs=[j];c.ensureStages(j);
 c.advanceJobWork(1);assert.equal(j.who,'A','chưa có Planner: Account chia việc thay');
 for(let i=0;i<2;i++)j.stg[i].done=j.stg[i].need;j.who=null;c.ensureStages(j);   // tới bước Sáng tạo (Content)
 c.advanceJobWork(1);assert.ok(j.who,'vẫn có người làm thay');assert.ok(Math.abs(j.stg[2].done-0.6*12)<1e-9,'không ai gần nghề Content: ×0,6');
 const c3=setup('PK'),j3=job(1,'Kế hoạch truyền thông',100);c3.GS.jobs=[j3];c3.ensureStages(j3);for(let i=0;i<2;i++)j3.stg[i].done=j3.stg[i].need;c3.ensureStages(j3);
 c3.advanceJobWork(1);assert.equal(j3.who,'P','Planner gần nghề Content');assert.ok(Math.abs(j3.stg[2].done-12)<1e-9);
 const c2=setup('AK'),j2=job(1,'Thiết kế logo',100);c2.GS.jobs=[j2];c2.ensureStages(j2);for(let i=0;i<3;i++)j2.stg[i].done=j2.stg[i].need;c2.ensureStages(j2);
 c2.advanceJobWork(1);assert.ok(Math.abs(j2.stg[3].done-0.6*12)<1e-9,'trái nghề ×0,6');
});
test('mỗi người 1 bước; job đứng trước trong danh sách được chọn người trước',()=>{
 const c=setup('AD'),a=job(1,'Thiết kế logo',100),b=job(2,'Bộ ấn phẩm Tết',100);c.GS.jobs=[a,b];
 c.advanceJobWork(.1);assert.equal(a.who,'A');assert.equal(b.who,'D');
 c.GS.jobs=[b,a];a.who=b.who=null;c.advanceJobWork(.1);assert.equal(b.who,'A');assert.equal(a.who,'D');
});
test('tạm dừng, chờ họp, chờ lễ tân mang brief: không làm; đội riêng chỉ dùng người được chọn',()=>{
 const c=setup(),j=job(1,'Thiết kế logo',100,{paused:true});c.GS.jobs=[j];c.advanceJobWork(1);assert.equal(j.work,0);
 j.paused=false;j.meeting={phase:'queued',remaining:20};c.advanceJobWork(1);assert.equal(j.work,0);
 delete j.meeting;c.handoverQueue=[1];vm.runInContext('var handoverQueue=this.handoverQueue',c);c.advanceJobWork(1);assert.equal(j.work,0);
 c.handoverQueue.length=0;j.staff=['D'];c.advanceJobWork(1);assert.equal(j.who,'D','bước Brief nhưng đội riêng chỉ có Design');assert.ok(j.work>0);
 j.staff=[];j.who=null;const w=j.work;c.advanceJobWork(1);assert.equal(j.work,w,'đội riêng trống thì dừng');
});
test('người bận (họp, thu nợ, bốc cháy, tự nghỉ) bị thay; không vượt quá giờ công; xong bước cuối thì job đủ giờ công',()=>{
 const c=setup('AP'),j=job(1,'Thiết kế logo',100);c.GS.jobs=[j];c.advanceJobWork(1);assert.equal(j.who,'A');
 c.AG[0].collection={};c.advanceJobWork(.1);assert.equal(j.who,'P');delete c.AG[0].collection;
 j.need=10;j.stg=null;c.ensureStages(j);for(const s of j.stg)s.done=s.need;j.stg[3].done=j.stg[3].need-0.01;c.ensureStages(j);j.who=null;
 for(let i=0;i<5;i++)c.advanceJobWork(1);assert.equal(j.cur,4);assert.equal(j.work,10);
 c.closingOffice=true;const k=job(2,'Thiết kế logo',10);c.GS.jobs=[k];c.advanceJobWork(1);assert.equal(k.work,0);
});
test('Account nhận brief từ lễ tân thì làm luôn bước Brief',()=>{
 const c=setup(),j=job(1,'Thiết kế logo',10);c.GS.jobs=[j];c.onBriefDelivered(j,c.AG[0]);assert.equal(j.who,'A');
});
test('HR giới thiệu 1 ứng viên nổi bật mỗi ngày; người đó làm nhanh hơn 20%',()=>{
 const c=setup('AD'),free=[{id:'X'},{id:'Y'},{id:'V'}];assert.equal(c.starCandidate(free),null,'không có HR');
 c.AG[1].role='HR';const id=c.starCandidate(free);assert.ok(['X','Y'].includes(id));assert.equal(c.starCandidate(free),id,'cố định trong ngày');
 const d=setup('AD');d.GS.stars={D:1};const j=job(1,'Thiết kế logo',100);d.GS.jobs=[j];d.ensureStages(j);for(let i=0;i<3;i++)j.stg[i].done=j.stg[i].need;d.ensureStages(j);
 d.advanceJobWork(1);assert.equal(j.who,'D');assert.ok(Math.abs(j.stg[3].done-1.35*1.2*12)<1e-9);
});
test('thẻ job: cảnh báo khi đội riêng trống, không ra vô cực; ước tính theo các bước còn lại',()=>{
 const c=setup(),j=job(1,'Thiết kế logo',10,{staff:[]});c.GS.jobs=[j];c.ensureStages(j);
 let html=c.jobTeamUI(j);assert.ok(html.includes('Chưa có người phụ trách'));assert.ok(html.includes('Chưa ước tính được'));assert.ok(!html.includes('Infinity'));
 delete j.staff;c.advanceJobWork(0.01);html=c.jobTeamUI(j);assert.ok(html.includes('4 bước còn lại'));
 c.GS.min=1250;j.due=1;c.GS.day=1;j.need=500;c.ensureStages(Object.assign(j,{stg:null}));html=c.jobTeamUI(j);assert.ok(html.includes('Có nguy cơ trễ hạn'));
});
test('người đúng chuyên môn vừa rảnh nhận lại bước (chưa quá nửa) từ người làm thay, có chuyển hồ sơ',()=>{
 const c=setup('PC'),a=job(1,'Kế hoạch truyền thông',100),b=job(2,'Kế hoạch truyền thông',100);c.GS.jobs=[b,a];
 for(const j of [a,b]){c.ensureStages(j);for(let i=0;i<2;i++)j.stg[i].done=j.stg[i].need;c.ensureStages(j);}   // cả 2 job ở bước Sáng tạo (Content)
 c.advanceJobWork(1);assert.equal(b.who,'C');assert.equal(a.who,'P','Planner (gần nghề) làm thay');
 b.stg[2].done=b.stg[2].need;c.ensureStages(b);b.who=null;b.paused=true;c.advanceJobWork(0);   // Content xong bước ở job b
 assert.equal(a.who,'C','Content nhận lại bước Sáng tạo');assert.equal(c.AG[0].pass.to,'C','Planner mang hồ sơ sang');assert.equal(a.passing,true);
});
test('số chỗ nhận việc tăng theo người làm job, loại lễ tân và linh vật; không mất chỗ khi tan ca',()=>{
 const c=setup('ADK');assert.equal(c.jobCapacity(),3);
 c.AG.push({ci:0,founder:true},{ci:0,mascot:true});assert.equal(c.jobCapacity(),3);
 for(let i=0;i<3;i++)c.AG.push({ci:0,away:true});assert.equal(c.jobCapacity(),4);
 for(let i=0;i<3;i++)c.AG.push({ci:0});assert.equal(c.jobCapacity(),6);
});
test('ước tính từng bước dùng đúng hệ số sản xuất; ghế tốt và ứng viên nổi bật rút ngắn thời gian',()=>{
 const c=setup('ADK'),j=job(1,'Thiết kế logo',30);c.ensureStages(j);
 const hours=c.estimateStageHours(j,c.AG);
 assert.ok(Number.isFinite(hours));assert.ok(hours<7,'không dùng lại tốc độ cũ cho 5 bước còn lại');
 assert.equal(c.estimateStageHours(j,[]),Infinity);
 c.GS.stars={A:1,D:1,K:1};c.seatKind=()=> 'ergo_chair';
 assert.ok(c.estimateStageHours(j,c.AG)<hours);
 c.AG[1].mascot=true;assert.ok(c.stagePotentialRate(c.AG[1],'des')===0);
});

test('price drives workload and migration preserves progress once',()=>{
 const c=setup();const j=job(1,'Logo',24,{work:12,reward:30});c.ensureStages(j);
 assert.equal(j.need,5.4);assert.equal(j.work,2.7);c.ensureStages(j);assert.equal(j.need,5.4);
 const higher=job(2,'Logo',24,{reward:60});c.ensureStages(higher);assert.equal(higher.need,10.8);
});

test('10 jobs at 30tr fit within a 13-hour workday with transfer allowance',()=>{
 const c=setup('ACD');let hours=0;
 for(let id=1;id<=10;id++){
  const j=job(id,'Thiết kế logo',40,{reward:30});c.GS.jobs=[j];
  for(let ticks=0;ticks<1000&&j.work<j.need;ticks++){
   c.advanceJobWork(.025);hours+=.025;
   for(const a of c.AG)if(a.pass){c.endPass(a);a.state='sit';hours+=.12;}
  }
  assert.equal(j.work,j.need);hours+=.25; // reception, walking and breaks per job
 }
 assert.ok(hours<=13,`${hours.toFixed(2)} game hours`);
});
test('Đốc Giám (Planner) làm bước Chia việc đúng chuyên môn; chọn ý tưởng đầu game chỉ chặn ở bước Sáng tạo',()=>{
 const c=setup('APCD'),j=job(1,'Thiết kế logo',100,{early:{}});c.GS.jobs=[j];c.ensureStages(j);
 j.stg[0].done=j.stg[0].need;c.ensureStages(j);assert.equal(j.stg[j.cur].k,'plan');
 assert.equal(c.jobReady(j),true,'bước Chia việc không phải chờ chọn ý tưởng');
 c.advanceJobWork(.5);assert.equal(j.who,'P');assert.ok(Math.abs(j.stg[1].done-1.35*12*.5)<1e-9,'Planner đúng chuyên môn ×1,35');
 j.stg[1].done=j.stg[1].need;j.who=null;c.ensureStages(j);assert.equal(j.stg[j.cur].k,'creative');
 assert.equal(c.jobReady(j),false,'tới Sáng tạo thì chờ chọn ý tưởng');j.early.idea='safe';assert.equal(c.jobReady(j),true);
});
// 15/10/2026: job video có bước Quay (máy quay) và Dựng (Editor); Podcast có Thu âm; Dựng video sự kiện không có Quay.
test('luồng theo loại job: video 5 bước, podcast thu âm, dựng sự kiện 4 bước; bản lưu cũ dựng lại bước và rải giờ công',()=>{
 const c=setup(),J=x=>JSON.parse(JSON.stringify(x));
 const v=c.ensureStages(job(1,'Quay video TikTok',100));
 assert.deepEqual(J(v.stg.map(s=>[s.k,s.role])),[['brief','acc'],['plan','plan'],['creative','con'],['shoot','cam'],['prod','edit']]);
 assert.ok(Math.abs(v.stg.reduce((n,s)=>n+s.need,0)-100)<1e-6,'tổng giờ công giữ nguyên');
 assert.deepEqual(J(c.ensureStages(job(2,'⭐ Podcast thương hiệu',50)).stg.map(s=>s.role)),['acc','plan','con','snd','edit']);
 const ev=c.ensureStages(job(3,'Dựng video sự kiện',100));assert.deepEqual(J(ev.stg.map(s=>s.k)),['brief','plan','creative','prod']);assert.equal(ev.stg[3].need,60);
 assert.deepEqual(J(c.ensureStages(job(4,'Thiết kế logo',20)).stg.map(s=>s.role)),['acc','plan','con','des'],'job thường giữ nguyên');
 // bản lưu cũ: job video còn 4 bước kiểu cũ, đã làm 30 giờ công
 const old=job(5,'TVC 15 giây',100,{flowVersion:2,work:30,who:'D',stg:[{k:'brief',role:'acc',need:18,done:18},{k:'plan',role:'plan',need:10,done:10},{k:'creative',role:'con',need:32,done:2},{k:'prod',role:'des',need:40,done:0}]});
 c.ensureStages(old);assert.equal(old.stg.length,5);assert.equal(old.stg[2].role,'des','TVC: storyboard do Design');assert.equal(old.who,null);
 assert.ok(Math.abs(old.stg.reduce((n,s)=>n+s.done,0)-30)<1e-6,'giữ 30 giờ công đã làm');
 assert.equal(c.stepName(old,3),'Quay');assert.equal(c.stepName(old,4),'Dựng');
});
test('Quay phim đúng nghề cả Quay và Dựng; Editor gần nghề Quay; Design trái nghề Dựng',()=>{
 const c=setup(),r=(role,st)=>c.roleMatch({role},st);
 assert.equal(r('Quay phim','cam'),'spec');assert.equal(r('Quay phim','edit'),'spec');
 assert.equal(r('Editor','edit'),'spec');assert.equal(r('Editor','cam'),'near');assert.equal(r('Editor','snd'),'near');
 assert.equal(r('Âm thanh','snd'),'spec');assert.equal(r('Design','edit'),'off');
});
test('bước Quay: người làm đi tới máy quay, đứng quay mới tính giờ công; xong bước thì trả máy',()=>{
 const c=setup('AE');c.OBJS.push({uid:9,id:'camera_tripod',gx:5,gy:5,rot:0});
 c.FBY={camera_tripod:{views:[{fp:[1,1]}]}};c.useSpot=()=>[4,5];c.bfs=(a,b)=>[a,b];c.faceToward=()=>'SE';
 const j=c.ensureStages(job(1,'Quay video TikTok',100));c.GS.jobs=[j];
 for(const s of j.stg.slice(0,3))s.done=s.need;c.ensureStages(j);assert.equal(j.stg[j.cur].k,'shoot');
 const e=c.AG[1];j.who='E';
 assert.equal(c.stepShoot(e,.1,[1,0]),true);assert.equal(e.state,'toShoot');assert.equal(c.BUSY.get(9),e);
 e.path=[];assert.equal(c.stepShoot(e,.1,[4,5]),true);assert.equal(e.state,'shoot');assert.ok(c.shootingAt(e),'đứng tại máy quay');
 j.stg[3].done=j.stg[3].need;c.ensureStages(j);j.who='E';   // sang bước Dựng (làm ở bàn)
 assert.equal(c.stepShoot(e,.1,[4,5]),false);assert.equal(e.state,'wander');assert.equal(c.BUSY.has(9),false,'trả máy quay');
});
test('không có máy quay thì bước Quay làm ở bàn như bước thường',()=>{
 const c=setup('AE');c.FBY={};c.useSpot=()=>null;c.bfs=()=>null;
 const j=c.ensureStages(job(1,'Quay video TikTok',100));c.GS.jobs=[j];for(const s of j.stg.slice(0,3))s.done=s.need;c.ensureStages(j);j.who='E';
 assert.equal(c.stepShoot(c.AG[1],.1,[1,0]),false);assert.equal(c.AG[1].state,'sit');
});
