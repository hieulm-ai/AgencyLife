// Giai đoạn A sau playtest 26/10: job gấp, ý tưởng táo bạo, sự kiện ngẫu nhiên, cảnh báo khách, giờ chậm khi mở bảng.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../source/decisions.js'),'utf8');
function ctx(extra={}){
 const c={GS:{day:5,min:600,jobs:[],offers:[]},AG:[],CHARS:[{id:'a'}],toasts:[],news:[],toast(m,k){c.toasts.push([m,k]);},addOfficeNews(k,m){c.news.push(m);},save(){},renderJobs(){},hud(){},fmt:v=>v+' tr',
  rep:0,repAdd(n){c.rep+=n;return n;},jobQuality:()=>.75,earlyEligible:()=>false,console,...extra};
 vm.createContext(c);vm.runInContext(src,c);return c;
}
test('A1: job gấp thưởng +40%, hạn ngắn 1 ngày; không áp cho VIP, job 1 ngày, 3 job đầu',()=>{
 const c=ctx();const o=c.applyOfferTier({reward:20,days:3,vip:false},0);
 assert.equal(o.rush,1);assert.equal(o.reward,28);assert.equal(o.days,2);
 assert.equal(c.applyOfferTier({reward:20,days:3},.5).rush,undefined,'xác suất 22%');
 assert.equal(c.applyOfferTier({reward:20,days:1},0).rush,undefined);
 assert.equal(c.applyOfferTier({reward:20,days:3,vip:true},0).rush,undefined);
 const e=ctx({earlyEligible:()=>true});assert.equal(e.applyOfferTier({reward:20,days:3},0).rush,undefined);
 assert.equal(c.lateRepDelta({rush:1}),-20);assert.equal(c.lateRepDelta({}),-8);
});
test('A2: táo bạo thành công +30% thưởng và cộng chất lượng; thất bại −15% thưởng, −5 danh tiếng; an toàn không đổi',()=>{
 const c=ctx();const w={reward:50,idea:'bold'};assert.equal(c.resolveIdea(w,0),'win');assert.equal(w.reward,65);assert.ok(w.fbMod>.1);
 assert.equal(c.resolveIdea(w,0),null,'chỉ tính 1 lần');
 const l={reward:50,early:{idea:'bold'}};assert.equal(c.resolveIdea(l,.99),'lose');assert.equal(l.reward,42.5);assert.ok(l.fbMod<0);assert.equal(c.rep,-5);
 assert.equal(c.resolveIdea({reward:50,idea:'safe'},0),null);
 const hi=ctx({jobQuality:()=>1}),lo=ctx({jobQuality:()=>.45});assert.ok(hi.boldChance({})>lo.boldChance({}));assert.ok(Math.abs(lo.boldChance({})-.31)<1e-9);assert.ok(Math.abs(hi.boldChance({})-.75)<1e-9);
});
test('A2: chọn táo bạo thêm 15% giờ công bước Sáng tạo; chỉ hỏi job lớn',()=>{
 const c=ctx();const j={id:7,name:'TVC',need:40,stg:[{k:'creative',need:10,done:0}]};c.GS.jobs.push(j);
 assert.equal(c.chooseIdea(7,'bold'),true);assert.equal(j.idea,'bold');assert.equal(j.stg[0].need,11.5);assert.equal(j.need,41.5);assert.equal(c.chooseIdea(7,'safe'),false,'đã chọn rồi');
 assert.equal(c.isBigJob({big:false,reward:80}),false);assert.equal(c.isBigJob({req:['camera_tripod'],reward:10}),true);
});
test('A3: sự kiện từ ngày 3, tối đa 1 lần/ngày, giờ ngẫu nhiên 10:00–17:00',()=>{
 const c=ctx();c.GS.day=2;assert.equal(c.planEvent().done,true);
 c.GS.day=6;let on=0;for(let i=0;i<200;i++){c.GS.ev=null;const e=c.planEvent();if(!e.done){on++;assert.ok(e.at>=600&&e.at<1020);}}
 assert.ok(on>110&&on<170,'khoảng 70% số ngày: '+on);
 const e=c.planEvent();assert.equal(c.planEvent(),e,'cùng ngày giữ nguyên kế hoạch');
});
test('A3: nhân viên được cho nghỉ làm chậm một nửa trong ngày đó; đổi brief cộng giờ công phần còn lại',()=>{
 const c=ctx();c.GS.sick={a:5};assert.equal(c.sickF({ci:0}),.5);c.GS.day=6;assert.equal(c.sickF({ci:0}),1);
 const j={need:20,work:10,cur:0,stg:[{need:20}]};c.addWork(j,.25);assert.equal(j.need,22.5);assert.equal(j.stg[0].need,22.5);
});
test('A4: cảnh báo 1 lần khi khách chỉ còn ≤ 45 phút; giờ chạy chậm ×0,35 khi mở bảng',()=>{
 const c=ctx();c.GS.offers=[{name:'Logo',expire:5*1440+600+40,received:true},{name:'B',expire:5*1440+600+200}];
 c.patienceWarn();c.patienceWarn();assert.equal(c.toasts.filter(t=>/sắp bỏ về/.test(t[0])).length,1);
 assert.match(c.patienceChip(c.GS.offers[0]),/40′/);assert.equal(c.patienceChip(c.GS.offers[1]),'');
 const open=ctx({document:{body:{classList:{contains:k=>k==='hub-open'}}}});assert.equal(open.menuSlowF(),.35);
 const shut=ctx({document:{body:{classList:{contains:()=>false}}}});assert.equal(shut.menuSlowF(),1);
});
