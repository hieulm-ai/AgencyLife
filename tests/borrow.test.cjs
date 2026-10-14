// Mượn nhân viên của bạn bè (14/10/2026): bản sao làm hết ngày game, không lương, chủ nhận 2 × lương ngày.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../source',f),'utf8');
function setup(){
 const ids=['03_Pali','11_Juice','13_AB','09_Vit_Vang','12_ADM'];
 const c={GS:{day:3,min:600,player:{kind:'preset',id:'03_Pali'},staffIds:['03_Pali','13_AB','09_Vit_Vang'],jobs:[],stars:{}},CHARS:ids.map(id=>({id})),AG:[],VISIT:null,closingOffice:false,CLOSE_MIN:1260,
  ENTRY:[31,56],OBJS:[{uid:1,id:'office_chair_blue'},{uid:2,id:'office_chair_blue'},{uid:3,id:'sofa_blue',guest:true}],WORKSEAT:new Set(['office_chair_blue']),SEATS:[{uid:1},{uid:2},{uid:3}],BUSY:new Map(),
  news:[],addOfficeNews(k,m){c.news.push(m);},startArrival(a){a.state='arrive';},assignSeats(){},save(){},updatePanels(){},renderStaff(){},hud(){},toast(m){c.last=m;},fmt:v=>v+' tr'};
 c.AG=ids.map((id,ci)=>({ci,x:0,y:0,path:[],state:'wander',stress:10}));
 vm.createContext(c);vm.runInContext(read('staff.js')+'\n'+read('payroll.js')+'\n'+read('borrow.js'),c);c.renderStaff=()=>{};c.restoreRoster();
 return c;
}
const has=(c,id)=>c.AG.some(a=>c.CHARS[a.ci].id===id);
test('mượn được người mình chưa có khi còn chỗ; không lương, không cho nghỉ, không vào danh sách đội',()=>{
 const c=setup();assert.deepEqual([...c.AG.map(a=>c.CHARS[a.ci].id)],['03_Pali','13_AB','09_Vit_Vang']);
 assert.equal(c.borrowBlock('13_AB'),'Agency của bạn đã có người này.');
 assert.equal(c.borrowBlock('09_Vit_Vang'),'Không mượn được người này.');
 assert.equal(c.borrowBlock('11_Juice'),'');
 assert.ok(c.startBorrow('11_Juice',{id:'u-b',agency:'Agency <B>'}));
 assert.ok(has(c,'11_Juice'));assert.ok(!c.GS.staffIds.includes('11_Juice'),'người mượn không lưu vào đội');
 assert.equal(c.salaryRate('11_Juice'),0);assert.equal(c.salaryLabel('11_Juice'),'Mượn từ Agency &#60;B&#62; · về cuối ngày');
 c.dismissStaff('11_Juice');assert.ok(has(c,'11_Juice'),'không cho nghỉ việc');
 assert.equal(c.borrowBlock('12_ADM'),'Mỗi ngày game chỉ mượn được 1 người.');
});
test('hết chỗ làm, gần giờ đóng cửa hoặc đang tham quan thì không mượn',()=>{
 let c=setup();c.SEATS=[{uid:1}];assert.match(c.borrowBlock('11_Juice'),/chỗ làm việc trống/);
 c=setup();c.GS.min=1200;assert.match(c.borrowBlock('11_Juice'),/20:00/);
 c=setup();c.VISIT={id:'x'};assert.match(c.borrowBlock('11_Juice'),/tham quan/);
});
test('tải lại giữa ngày vẫn còn người mượn; sang ngày mới thì về và giải phóng job',()=>{
 const c=setup();c.startBorrow('11_Juice',{id:'u-b',agency:'B'});
 const saved=JSON.parse(JSON.stringify(c.GS));
 const d=setup();d.GS=saved;d.AG=d.CHARS.map((x,ci)=>({ci,x:0,y:0,path:[],state:'wander',stress:10}));d.restoreRoster();
 assert.ok(has(d,'11_Juice'));assert.equal(d.AG.find(a=>d.CHARS[a.ci].id==='11_Juice').borrowed,true);
 d.GS.jobs=[{id:1,who:'11_Juice'}];d.GS.day++;d.endBorrowDay();
 assert.ok(!has(d,'11_Juice'));assert.equal(d.GS.jobs[0].who,null);assert.equal(d.GS.borrowed.length,0);assert.match(d.news.at(-1),/đã về B/);
 const e=setup();e.GS=JSON.parse(JSON.stringify(saved));e.GS.day=4;e.AG=e.CHARS.map((x,ci)=>({ci,x:0,y:0,path:[],state:'wander',stress:10}));e.restoreRoster();
 assert.ok(!has(e,'11_Juice'),'bản lưu từ hôm trước: người mượn đã về');
});
test('tiền công cho người cho mượn = 2 × lương ngày (★ tính lương ★); đọc mã nhân viên từ thư',()=>{
 const c=setup();assert.equal(c.borrowIdFromItem('wage_11_juice'),'11_Juice');assert.equal(c.borrowIdFromItem('wage_x<'),null);
 assert.equal(c.borrowWage('11_Juice'),5);assert.equal(c.borrowWage('12_ADM'),6);c.GS.stars['11_Juice']=1;assert.equal(c.borrowWage('11_Juice'),6);
});
