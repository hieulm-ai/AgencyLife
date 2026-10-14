// Thế mạnh của nhân vật chính theo nghề gốc (14/10/2026). Thông số thử: test chỉ khoá cơ chế, không khoá cân bằng.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source'),src=fs.readFileSync(path.join(root,'template.html'),'utf8');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function staffCtx(player){const c={GS:player?{player:{kind:'preset',id:player}}:{},CHARS:[],AG:[]};vm.createContext(c);vm.runInContext(read('staff.js'),c);return c;}
test('mỗi nghề gốc có đúng một thế mạnh; nhân vật tự tạo và chưa chọn nhân vật thì không có',()=>{
 assert.equal(staffCtx('06_Vu_a_Vu').perkVal('offer'),1.1);
 assert.equal(staffCtx('03_Pali').perkVal('stage',null).acc,1.33);
 assert.equal(staffCtx('04_Tamny').perkVal('collect'),.67);
 const hr=staffCtx('07_Hao_Hao');assert.equal(hr.perkVal('stress'),.85);assert.equal(hr.hireCost(),17);
 assert.equal(staffCtx('08_Nganh').perkVal('patience'),1.25);
 for(const [id,role] of [['01_Huy','des'],['14_HM','des'],['15_CongB','edit'],['16_Khoa','edit'],['17_Linh','snd'],['13_AB','con'],['12_ADM','plan']])assert.equal(staffCtx(id).founderPerk().help,role,id);
 for(const c of [staffCtx('P_custom'),staffCtx(null)]){assert.equal(c.founderPerk(),null);assert.equal(c.perkVal('offer'),1);assert.equal(c.hireCost(),20);}
 const sale=staffCtx('06_Vu_a_Vu');assert.equal(sale.perkVal('stress'),1,'thế mạnh khác nghề không áp dụng');
});
const ROLE={F:'Lễ tân',A:'Account',B:'Account',P:'Planner',D:'Design',C:'Content'};
function pipeCtx(player,ids){
 const CHARS=[...ids].map(id=>({id}));
 const c={CHARS,GS:{day:1,min:600,jobs:[],player:{kind:'preset',id:player}},VIS:[],AG:CHARS.map((x,i)=>({ci:i,role:ROLE[x.id],founder:x.id==='F',state:x.id==='F'?'reception':'sit',seat:x.id==='F'?null:{uid:i+1},stress:0,x:i,y:0,path:[]})),
  OBJS:CHARS.map((x,i)=>({uid:i+1,id:'office_chair_blue'})),WORKSEAT:new Set(['office_chair_blue']),closingOffice:false,isWorking:a=>a.state==='sit',seatKind:()=>'office_chair_blue',
  meetingPending:()=>false,deskBound:a=>!!a.founder,deskReady:()=>true,staffName:String,save(){},renderJobs(){},addOfficeNews(){},handoverPath:(a,b)=>[a,[b.x,b.y]],handoverTile:b=>[b.x,b.y],dirTo:()=>'SW',
  startReact(){},blocked:()=>false,BUSY:new Map(),UIIMG:()=>'',MASCOT_ID:'V',CLOSE_MIN:1260,teamEditorJob:null};
 vm.createContext(c);
 vm.runInContext(read('staff.js').replace(/const STAFF_ROLE=\{/,"const STAFF_ROLE={'P_founder':'"+(player.split(':')[1]||'')+"',"),c);c.GS.player.id='P_founder';
 vm.runInContext(src.slice(src.indexOf('function assignedIds('),src.indexOf('function jobTeamUI(')),c);vm.runInContext(read('pipeline.js'),c);
 return c;
}
const job=(id,name,need)=>({id,name,need,work:0,due:5,req:[]});
test('nhân vật chính nghề Design phụ bước Design nửa tốc độ khi quầy vắng; có khách chờ hoặc đang tiếp khách thì thôi',()=>{
 const c=pipeCtx('x:Design','FACD'),j=job(1,'Thiết kế logo',100);c.GS.jobs=[j];c.ensureStages(j);
 for(let i=0;i<3;i++){j.stg[i].done=j.stg[i].need;}c.ensureStages(j);assert.equal(j.stg[j.cur].k,'prod');
 c.advanceJobWork(.5);assert.equal(j.who,'D');const solo=1.35*12*.5,help=.5*12*1.35*.5;
 assert.ok(Math.abs(j.stg[3].done-(solo+help))<1e-9,'Design làm + nhân vật chính phụ nửa tốc độ đúng nghề');
 let before=j.stg[3].done;c.VIS.push({state:'wait'});c.advanceJobWork(.5);assert.ok(Math.abs(j.stg[3].done-before-solo)<1e-9,'khách đang chờ ở quầy: không phụ');
 c.VIS.length=0;c.AG[0].receptionUid=5;before=j.stg[3].done;c.advanceJobWork(.5);assert.ok(Math.abs(j.stg[3].done-before-solo)<1e-9,'đang tiếp khách: không phụ');
});
test('phụ việc chỉ một job mỗi lúc và chỉ bước đúng nghề',()=>{
 const c=pipeCtx('x:Content','FABC'),a=job(1,'Thiết kế logo',100),b=job(2,'Thiết kế logo',100);c.GS.jobs=[a,b];c.ensureStages(a);c.ensureStages(b);
 c.advanceJobWork(.5);assert.ok(a.who&&b.who,'2 Account cùng làm brief');
 assert.ok(Math.abs(a.stg[0].done-1.35*12*.5)<1e-9&&Math.abs(b.stg[0].done-1.35*12*.5)<1e-9,'nghề Content không phụ bước Brief');
 assert.equal(c.founderHelpRate('con'),.5*12*1.35);assert.equal(c.founderHelpRate('des'),0);
});
test('nhân vật chính nghề Account: cả đội làm bước Brief nhanh hơn, các bước khác không đổi',()=>{
 const c=pipeCtx('x:Account','FAD'),j=job(1,'Thiết kế logo',100);c.GS.jobs=[j];c.ensureStages(j);
 c.advanceJobWork(.5);assert.ok(Math.abs(j.stg[0].done-1.35*12*.5*1.33)<1e-9);
 assert.equal(c.perkStage('des'),1);
});
test('Kế toán gốc làm mọi chuyến thu nợ nhanh hơn; không có thế mạnh thì giữ 30/20 phút',()=>{
 const c={GS:{},AG:[],perkVal:k=>k==='collect'?.67:1};vm.createContext(c);vm.runInContext(read('collections.js'),c);
 assert.equal(c.collectMinutes({role:'Design'}),20.1);assert.equal(c.collectMinutes({role:'Kế toán'}),13.4);
 const d={GS:{},AG:[]};vm.createContext(d);vm.runInContext(read('collections.js'),d);assert.equal(d.collectMinutes({role:'Design'}),30);assert.equal(d.collectMinutes({role:'Kế toán'}),20);
});
test('Sale gốc: khách trả cao hơn nhưng khối lượng việc tính theo giá gốc',()=>{
 assert.match(src,/const reward=Math\.round\(base\*\(typeof perkVal==='function'\?perkVal\('offer'\):1\)\*10\)\/10;/);
 assert.match(src,/const need=Math\.max\(2,Math\.round\(base\*\.18\*100\)\/100\)/);
 assert.match(src,/j\.expire=GS\.day\*1440\+GS\.min\+patienceMin\(\);/);
});
