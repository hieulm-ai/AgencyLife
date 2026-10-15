// 15/10: vốn 10 tr, khách theo sao danh tiếng, ruby từ chơi game tối đa 200/tuần.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const tpl=fs.readFileSync(path.join(__dirname,'../source/template.html'),'utf8');
const pick=(re)=>{const m=tpl.match(re);assert.ok(m,String(re));return m[0];};
function gemCtx(){
 const c={GS:{gems:20,gemEarned:0},toasts:[],toast(m){c.toasts.push(m);},save(){}};vm.createContext(c);
 vm.runInContext([pick(/const GEM_WEEK_CAP=200;/),pick(/function gemWeekKey\(\)\{[^\n]*\n/),pick(/function gemWeekLeft\(\)\{[^\n]*\n/),pick(/function grantGems\(n\)\{[^\n]*\n/),pick(/function gemCapNote\(g,n\)\{[^\n]*\n/),pick(/function addGems\(n,why\)\{[^\n]*\n/)].join('\n'),c);return c;
}
test('vốn khởi đầu 10 tr',()=>{assert.match(tpl,/let cash=10, undo=\[\];/);});
test('ruby từ chơi game dừng ở 200 mỗi tuần, sang tuần mới nhận lại',()=>{
 const c=gemCtx();let got=0;for(let i=0;i<60;i++)got+=c.addGems(5,'Nhiệm vụ');
 assert.equal(got,200);assert.equal(c.GS.gems,220);assert.equal(c.gemWeekLeft(),0);assert.match(c.toasts.at(-1),/đã nhận đủ 200/);
 c.GS.gemWeek.k='2000-1-3';assert.equal(c.gemWeekLeft(),200);assert.equal(c.addGems(7,'x'),7);
 c.GS.gemWeek={k:c.gemWeekKey(),n:198};assert.equal(c.addGems(5,'x'),2,'chỉ nhận phần còn lại');
});
test('làm hết nhiệm vụ ngày + điểm danh 7 ngày nằm dưới 200 ruby/tuần',()=>{
 const dq=JSON.parse(pick(/\[\["job"[^\n]*?\]\]/).replace(/"/g,'"')).map(r=>r[3]).sort((a,b)=>b-a);
 const streak=JSON.parse(pick(/(?<=const STREAK=)\[[^\]]*\]/));
 const week=7*(dq[0]+dq[1]+dq[2])+streak.reduce((a,b)=>a+b,0);
 assert.ok(week<=200,`tối đa ${week}`);
});
test('khách cùng lúc theo sao danh tiếng, không vượt sức đội ngũ',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../source/pipeline.js'),'utf8');
 const c={AG:[],GS:{reputation:{points:0}}};vm.createContext(c);
 vm.runInContext(src.match(/const REP_CUSTOMERS=[^\n]*\n/)[0]+src.match(/function teamCapacity\(\)[^\n]*\n/)[0]+src.match(/function repCapacity\(\)[^\n]*\n/)[0]+src.match(/function jobCapacity\(\)[^\n]*\n/)[0],c);
 for(let i=0;i<12;i++)c.AG.push({ci:0});   // đội đông: sức đội ngũ 7
 const at=p=>{c.GS.reputation.points=p;return c.jobCapacity();};
 assert.deepEqual([0,50,150,350,700].map(at),[2,3,4,5,6]);
 c.AG.length=3;assert.equal(at(700),3,'đội 3 người chỉ nhận 3 khách dù 5★');
 c.GS={done:6,failed:0};c.AG.length=12;assert.equal(c.jobCapacity(),3,'bản lưu chưa có điểm danh tiếng: tính từ số job');
});
