// V15 (07/10/2026): Kho trong Cửa hàng + hệ thống bảng 5 trung tâm.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const src=read('template.html'),storeJs=read('store.js'),hub=read('hud-layout.js'),guide=read('guide.js'),css=read('hud-layout.css');

function ctx(extra={}){
 const el=()=>({disabled:false,hidden:false,innerHTML:'',textContent:'',querySelector:()=>null,querySelectorAll:()=>[],setAttribute(){},classList:{toggle(){},add(){},remove(){},contains:()=>false}});
 const c={GS:{day:3,gems:50,ach:{}},cash:100,UNLIM:false,REFUND:.5,RUBY_COIN:10,undo:[],OBJS:[],pend:null,nextUid:10,fSel:null,fRot:0,
  FBY:{work_desk:{name:'Bàn làm việc',price:3,views:[{fp:[2,1],src:''}]},office_chair_blue:{name:'Ghế xoay',price:1,views:[{fp:[1,1],src:''}]},potted_plant:{name:'Cây chậu lớn',price:.8,views:[{fp:[1,1],src:''}]},big_tree:{name:'Cây xanh lớn',price:0,gem:25,views:[{fp:[1,1],src:''}]},decorative_blue_mark:{name:'Mô hình khối xanh',price:3,views:[{fp:[1,1],src:''}]}},
  DESKS:new Set(['work_desk']),ACH:[['jobs10','Hoàn thành 10 job'],['lv2','Mở khu đầu tiên'],['jobs50','Hoàn thành 50 job']],
  toasts:[],toast(m,k){c.toasts.push([m,k]);},saves:0,save(){c.saves++;},hud(){},rebuild(){},rebuildOcc(){},assignSeats(){},unstick(){},standUp(){},renderPendBar(){},
  fmt:n=>String(n),gemify:s=>s,dq(){},at:()=>0,OCC:new Map(),agentTiles:()=>new Set(),deskChairSpot:o=>({x:o.gx,y:o.gy-1,rot:0}),
  addOfficeNews(){},document:{getElementById:()=>el(),querySelectorAll:()=>[]},
  openHub(){},askConfirm:async()=>true,...extra};
 vm.createContext(c);vm.runInContext(storeJs,c);
 vm.runInContext('renderStore=()=>{};renderStorePick=()=>{};',c);
 return c;
}

test('Kho: thêm/lấy theo id nội thất có thật, giới hạn 99, bỏ id lạ trong bản lưu',()=>{
 const c=ctx();c.GS.store={work_desk:2,khong_co:3,potted_plant:0};
 vm.runInContext('ensureStore()',c);assert.deepEqual({...c.GS.store},{work_desk:2});
 assert.equal(c.addToStore('potted_plant',1,'buy'),true);assert.equal(c.storeCount('potted_plant'),1);
 assert.equal(c.addToStore('khong_co'),false);assert.equal(c.addToStore('potted_plant',99),false,'quá 99 món');
 assert.equal(c.takeFromStore('work_desk',3),false);assert.equal(c.takeFromStore('work_desk',2),true);assert.equal(c.storeCount('work_desk'),0);
 assert.ok(!('work_desk' in c.GS.store),'hết thì xóa khỏi kho');assert.equal(c.GS.storeLog[0].src,'buy');
});
test('Kho: bán từ kho hoàn 50% (đồ ruby quy đổi 1 ruby = 10 tr)',()=>{
 const c=ctx();c.GS.store={big_tree:1,work_desk:1};
 assert.equal(c.storeValue('big_tree'),125);assert.equal(c.storeValue('work_desk'),1.5);
 vm.runInContext('sellFromStore("work_desk")',c);assert.equal(vm.runInContext('cash',c),101.5);assert.equal(c.storeCount('work_desk'),0);
 assert.equal(vm.runInContext('sellFromStore("work_desk")',c),false,'không bán được món đã hết');
});
test('Cất kho khi đang di chuyển: bàn đi kèm ghế, ghi lại để Hoàn tác',()=>{
 const c=ctx();vm.runInContext(`OBJS=[{uid:1,id:'work_desk',gx:5,gy:5,rot:0},{uid:2,id:'office_chair_blue',gx:5,gy:4,rot:0},{uid:3,id:'potted_plant',gx:9,gy:9,rot:0}];pend={mode:'move',uid:1,id:'work_desk',gx:7,gy:7,rot:0,carry:2};`,c);
 assert.equal(vm.runInContext('stashPend()',c),true);
 assert.deepEqual(Array.from(vm.runInContext('OBJS.map(o=>o.id)',c)),['potted_plant']);
 assert.equal(c.storeCount('work_desk'),1);assert.equal(c.storeCount('office_chair_blue'),1);
 const u=vm.runInContext('undo[0]',c);assert.equal(JSON.parse(u.objs).length,3);assert.deepEqual(JSON.parse(u.store),{});assert.equal(vm.runInContext('pend',c),null);
});
test('Vào kho khi đặt món mới: trả tiền như mua, món nằm trong kho, không đặt lên sàn',()=>{
 const c=ctx();vm.runInContext(`pend={mode:'buy',id:'potted_plant',gx:1,gy:1,rot:0};`,c);
 assert.equal(vm.runInContext('stashPend()',c),true);assert.equal(vm.runInContext('cash',c),99.2);
 assert.equal(c.storeCount('potted_plant'),1);assert.equal(vm.runInContext('OBJS.length',c),0);
 const u=vm.runInContext('undo[0]',c);assert.equal(u.cost,.8);assert.equal(u.objs,null);
 vm.runInContext(`cash=0;pend={mode:'buy',id:'work_desk',gx:1,gy:1,rot:0};`,c);
 assert.equal(vm.runInContext('stashPend()',c),false,'thiếu tiền thì không vào kho');assert.equal(c.storeCount('work_desk'),0);
});
test('Đặt từ kho: không tốn tiền; bàn lấy ghế trong kho trước, không có thì mua ghế',()=>{
 const c=ctx();c.GS.store={work_desk:2,office_chair_blue:1};vm.runInContext('storePick="work_desk";fSel="work_desk";',c);
 vm.runInContext(`placeFromStore({mode:'buy',id:'work_desk',gx:3,gy:3,rot:0,store:true})`,c);
 assert.equal(vm.runInContext('cash',c),100);assert.deepEqual(Array.from(vm.runInContext('OBJS.map(o=>o.id)',c)),['work_desk','office_chair_blue']);
 assert.equal(c.storeCount('work_desk'),1);assert.equal(c.storeCount('office_chair_blue'),0);
 vm.runInContext(`placeFromStore({mode:'buy',id:'work_desk',gx:8,gy:3,rot:0,store:true})`,c);
 assert.equal(vm.runInContext('cash',c),99,'hết ghế trong kho: mua ghế 1 tr');assert.equal(c.storeCount('work_desk'),0);
 assert.equal(vm.runInContext('storePick',c),null,'hết món thì thôi chế độ đặt từ kho');
});
test('Quà vật phẩm của thành tựu vào Kho đúng 1 lần, kể cả bản lưu đã đạt từ trước',()=>{
 const c=ctx();c.GS.ach={jobs10:1,lv2:1};
 assert.equal(c.grantAchItems(),2);assert.equal(c.storeCount('potted_plant'),1);assert.equal(c.storeCount('decorative_blue_mark'),1);
 assert.equal(c.GS.storeNew,2,'đếm phần thưởng mới để hiện chấm đỏ ở Cửa hàng');
 assert.equal(c.grantAchItems(),0);assert.equal(c.storeCount('potted_plant'),1);
 c.GS.ach.jobs50=1;assert.equal(c.grantAchItems(),1);assert.equal(c.storeCount('big_tree'),1);
 assert.match(src,/function checkAch\(\)\{[^\n]*grantAchItems\(\); \}/);
});
test('Pass tuần mốc cuối có thêm vật phẩm vào Kho',()=>{
 const w=read('weekly-pass.js');assert.match(w,/jobs:12,coin:25,gems:10,item:'potted_plant'/);assert.match(w,/grantStoreItem\(reward\.item/);
});
test('bản lưu: Kho hợp lệ được nhận, Kho sai kiểu bị từ chối',()=>{
 const st=new Map(),c={N:2,SAVE:'t',cash:5,WS:{},DS:{},FL:{},UNLIM:false,GS:{jobs:[],offers:[],day:1},UNLOCKED:new Set([0]),AG:[],CHARS:[],OBJS:[],FBY:{},G:[[0,0],[0,0]],LAST_SEEN:0,nextUid:1,rebuildLock(){},toast(){},localStorage:{getItem:k=>st.get(k)||null,setItem:(k,v)=>st.set(k,v)}};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf('let saveBlocked='),src.indexOf('// ---------- hình học isometric')),c);
 const base={cash:5,cells:['00','00'],objs:[],gs:{jobs:[],offers:[]}};
 const ok=g=>c.parseGameSave(JSON.stringify({...base,gs:{...base.gs,...g}}));
 assert.ok(ok({store:{work_desk:2},storeNew:1,storeLog:[{day:1,id:'work_desk',src:'put',n:1}],achItems:{jobs10:1},uiV15Seen:true}));
 for(const bad of [{store:{work_desk:-1}},{store:{work_desk:1.5}},{store:{'<b>':1}},{store:[1]},{storeNew:-2},{storeLog:[{id:1}]},{storeLog:[{day:'x',id:'a',src:'put'}]},{uiV15Seen:'yes'}])
  assert.throws(()=>ok(bad),JSON.stringify(bad));
});
test('thanh dưới: 5 trung tâm, mỗi trung tâm ≤ 4 tab; Cửa hàng có tab Kho; Phần thưởng đổi thành Thành tựu (icon cúp)',()=>{
 const H=vm.runInContext(hub.slice(hub.indexOf('const HUBS='),hub.indexOf('const BUILD_TOOLS='))+';HUBS',vm.createContext({}));
 const bottom=['work','team','build','shop','ach'];
 assert.deepEqual(bottom.map(k=>H[k].title),['Công việc','Đội ngũ','Xây dựng','Cửa hàng','Thành tựu']);
 for(const k of Object.keys(H))assert.ok(H[k].tabs.length>=1&&H[k].tabs.length<=4,k);
 assert.deepEqual(Array.from(H.shop.tabs,t=>t.label),['Cửa hàng ruby','Nạp coin','Kho']);
 assert.deepEqual(Array.from(H.team.tabs,t=>t.label),['Đội','Tuyển'],'Đồ mặc chuyển vào Cửa hàng ruby');
 assert.equal(H.ach.icon,'trophy');assert.ok(!JSON.stringify(H).includes('Phần thưởng'));
 assert.deepEqual(Array.from(H.build.tabs,t=>t.label),['Nội thất','Tường & sàn','Di chuyển','Mở rộng']);
 assert.match(src,/"trophy": "assets\/static\/2e4d243bdd2e7907f86ac50e\.png"/,'icon cúp mới');
 assert.ok(fs.existsSync(path.join(root,'static/2e4d243bdd2e7907f86ac50e.png')));
});
test('Cửa hàng ruby gom gói, đồ mặc, nạp ruby và VIP; nút + ruby mở thẳng phần Nạp ruby',()=>{
 assert.doesNotMatch(src,/id="bVip"/);
 assert.match(src,/\[\["items","Gói & vật phẩm"\],\["skins","Đồ mặc"\],\["topup","Nạp ruby"\],\["vip","VIP"\]\]/);
 assert.match(hub,/if\(kind==='gem'\)\{gemSub='topup';openHub\('shop','shop',\{keep:true\}\);return;\}/);
});
test('dải trên có đồng hồ, không có nút dừng hay tốc độ',()=>{
 const res=src.slice(src.indexOf('<div id="res"'),src.indexOf('<div id="topR"'));
 assert.match(res,/class="pill clock-pill"[^\n]*id="clock"/);
 assert.ok(!/data-spd|aria-label="Tạm dừng"|×2|×4/.test(src.slice(src.indexOf('<body>'),src.indexOf('<script>'))),'không có nút tốc độ trong giao diện');
});
test('một ngăn tại một lúc; Esc đóng; hộp xác nhận thay confirm() của trình duyệt',()=>{
 assert.match(hub,/if\(hubKey===key&&!tabId&&!opts\.keep\)\{closeHub\(\);return;\}/);
 assert.match(hub,/if\(hubKey&&hubKey!==key\)leaveHub\(hubKey\);/);
 assert.match(src,/else closeHub\(\); \}/);
 assert.ok(!/[^.\w]confirm\(/.test(src.replace(/askConfirm\(/g,'')),'không còn confirm() gốc trong template');
 assert.ok(!/[^.\w]confirm\(/.test(read('staff.js')+read('collections.js')+read('visitor-lounge.js')),'module phụ cũng không dùng confirm()');
});
test('hướng dẫn chạm đi qua đủ 5 trung tâm; bảng hướng dẫn nói đúng tên mới',()=>{
 for(const id of ['#bJobs','#bStaff','#bBuild','#bShop','#bAch','#bGuide'])assert.ok(guide.includes(`domRect("${id}")`),id);
 assert.ok(!guide.includes('Job khách hàng</b> (cặp hồ sơ)'));assert.ok(!guide.includes('Cài đặt → Hướng dẫn'));
 assert.match(guide,/Công việc → Đang làm/);assert.match(guide,/Đội ngũ → Tuyển dụng/);
});
test('CSS: ngăn phải dùng chung, tab, thanh ngữ cảnh 1 tầng, màn thấp không chồng nội dung',()=>{
 for(const sel of ['#hub{','.hub-tab[aria-selected="true"]','#hub .hub-page.open','#ctxbar{','#askBox{','.store-item{'])assert.ok(css.includes(sel),sel);
 assert.match(css,/@media\(max-height:480px\)\{\n #wrap #hub\{top:8px;bottom:76px/);
});
