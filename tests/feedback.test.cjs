// V18: khách góp ý giữa chừng (sau Sản xuất) và trả lời đánh giá 2 lượt, theo bản game đầu (deploy v4).
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const src=rd('template.html'),pipe=rd('pipeline.js'),fb=rd('feedback.js'),rep=rd('reputation.js');
const ROLE={A:'Account',P:'Planner',D:'Design',C:'Content',E:'Editor',K:'Kế toán'};
function setup(ids='APDCEK'){
 const CHARS=[...ids].map(id=>({id}));
 const c={CHARS,GS:{day:1,min:600,jobs:[],offers:[]},AG:CHARS.map((x,i)=>({ci:i,role:ROLE[x.id],state:'sit',seat:{uid:i+1},stress:0,x:i,y:0,path:[]})),OBJS:CHARS.map((x,i)=>({uid:i+1,id:'office_chair_blue'})),
  WORKSEAT:new Set(['office_chair_blue']),closingOffice:false,isWorking:a=>a.state==='sit',seatKind:()=>'office_chair_blue',meetingPending:()=>false,
  deskBound:()=>false,staffName:String,save(){},renderJobs(){},news:[],addOfficeNews(k,m){c.news.push(m);},toasts:[],toast(m){c.toasts.push(m);},handoverPath:()=>null,dirTo:()=>'SW',
  startReact(){},blocked:()=>false,BUSY:new Map(),UIIMG:()=>'',MASCOT_ID:'V',CLOSE_MIN:1260,teamEditorJob:null,agencyName:()=>'Sao Mai',setTimeout(){},document:undefined,
  CUSTS:[{name:'Doanh nhân'},{name:'KOL'}]};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf('function assignedIds('),src.indexOf('function jobTeamUI(')),c);
 vm.runInContext(pipe+'\n'+rep+'\n'+fb,c);return c;
}
const job=(id,name,need,extra={})=>({id,name,need,work:0,due:5,req:[],cust:1,...extra});
function runAll(c,j,maxSteps=2000){ c.ensureStages(j); for(let i=0;i<maxSteps&&j.cur<j.stg.length;i++){ if(c.fbPending(j)) c.resolveRevision(j,'talk',0); c.advanceJobWork(.5); } }
test('chất lượng: cả đội đúng chuyên môn → 5★; thiếu Design (người trái nghề làm) → thấp hơn',()=>{
 let c=setup(),j=job(1,'Quản lý fanpage 1 tuần',20);c.GS.jobs=[j];runAll(c,j);
 assert.equal(j.cur,4);assert.ok(Math.abs(c.jobQuality(j)-1)<1e-9);assert.equal(c.jobStars(j),5);
 c=setup('ACK');j=job(1,'Quản lý fanpage 1 tuần',20);c.GS.jobs=[j];runAll(c,j);
 assert.ok(c.jobQuality(j)<.95,'bước Design do người khác làm');assert.ok(c.jobStars(j)<5);
 const q=c.ensureStages(job(3,'x',10));assert.equal(c.jobQuality(q),.75,'job cũ chưa có dữ liệu = mức trung bình');
});
test('sao: trước hạn +, VIP khó tính hơn, góp ý thuyết phục thất bại làm giảm',()=>{
 const c=setup(),j={qs:80,qp:100,due:5,vip:false};
 assert.equal(c.jobStars(j),4);c.GS.day=1;assert.equal(c.jobStars({...j,due:1}),4);
 assert.equal(c.jobStars({...j,vip:true,due:1}),3);assert.equal(c.jobStars({...j,qs:85}),5,'.85 + trước hạn .05 = .9');
 assert.equal(c.jobStars({...j,fbMod:-.15}),3);
});
test('góp ý sau Sản xuất: job dừng tới khi chọn; Sửa kỹ thêm 25% khối lượng; quá hạn thì Account sửa nhẹ',()=>{
 const c=setup(),j=c.ensureStages(job(1,'Thiết kế logo',20));c.GS.jobs=[j];
 assert.equal(c.maybeRevision(j,'creative',0),false,'chỉ sau bước Sản xuất');
 assert.equal(c.maybeRevision(j,'prod',.99),false);assert.equal(j.fb.done,true);assert.equal(c.maybeRevision(j,'prod',0),false,'mỗi job tối đa 1 lần');
 delete j.fb;assert.equal(c.maybeRevision(j,'prod',0),true);assert.ok(c.fbPending(j));assert.equal(c.jobReady(j),false);
 assert.match(c.stageLine(j),/Khách góp ý/);
 const need=j.need,prod=j.stg[3].need;j.stg.forEach((s,i)=>{if(i<=3)s.done=s.need;});c.ensureStages(j);assert.equal(j.cur,4);
 c.resolveRevision(j,'fix');assert.ok(Math.abs(j.stg[3].need-prod*1.25)<.01);assert.ok(Math.abs(j.need-need-(j.stg[3].need-prod))<1e-9);
 assert.equal(j.cur,3,'quay lại bước Sản xuất');assert.equal(j.fbMod,.1);assert.equal(c.fbPending(j),false);assert.equal(c.jobReady(j),true);
 const k=c.ensureStages(job(2,'Thiết kế logo',20));c.GS.jobs.push(k);c.maybeRevision(k,'prod',0);k.fb.at-=120;c.tickRevisions();
 assert.equal(k.fb.kind,'auto');assert.equal(k.fbMod,0);
});
test('thuyết phục: thành công không phải sửa; thất bại −2 danh tiếng và sao thấp hơn',()=>{
 const c=setup(),j=c.ensureStages(job(1,'Thiết kế logo',20));c.GS.jobs=[j];c.GS.reputation={points:50,history:[]};
 c.maybeRevision(j,'prod',0);const need=j.need;c.resolveRevision(j,'talk',0);assert.equal(j.need,need);assert.equal(j.fbMod,0);
 delete j.fb;c.maybeRevision(j,'prod',0);c.resolveRevision(j,'talk',.99);assert.equal(j.fbMod,-.15);assert.equal(c.GS.reputation.points,48);
 assert.ok(c.persuadeChance()>.35,'có Account làm tăng tỉ lệ');
});
test('đánh giá khi xong job: sao cộng/trừ vào danh tiếng; trễ hạn để lại đánh giá 1★',()=>{
 const c=setup();c.GS.reputation={points:0,history:[]};
 const j={id:1,name:'Thiết kế logo',due:1,qs:95,qp:100,cust:1};c.GS.day=2;
 const s=c.reviewJob(j);assert.equal(s,5);assert.equal(c.recordReputation(j,true,s),15);
 const r=c.GS.reviews[0];assert.equal(r.s,5);assert.equal(r.s0,5);assert.equal(r.name,'Thiết kế logo');assert.ok(c.news.some(m=>m.includes('KOL')));
 const bad={id:2,name:'TVC',due:9,qs:40,qp:100,cust:0};assert.equal(c.recordReputation(bad,true,c.reviewJob(bad)),4,'1★: 10 + 2 trước hạn − 8');
 c.reviewLate({id:3,name:'Podcast',cust:0});assert.equal(c.GS.reviews[0].s,1);assert.equal(c.unansweredReviews(),3);
 for(let i=0;i<40;i++)c.addReview({name:'x',cust:0},3,'t');assert.equal(c.GS.reviews.length,30);
});
test('trả lời đánh giá thấp: giảng hoà +1★ rồi +danh tiếng; combat hạ sao tăng dần; tối đa 2 lượt',()=>{
 const c=setup();c.GS.reputation={points:100,history:[]};
 let r=c.addReview({name:'a',cust:0},2,'chê');assert.deepEqual(Array.from(c.replyOptions(r),o=>o.k),['peace','combat']);
 let res=c.applyReply(r,'peace',.9);assert.equal(res.dStar,1);assert.equal(r.s,3);assert.equal(c.GS.reputation.points,103);
 res=c.applyReply(r,'peace',.9);assert.equal(res.dStar,0);assert.equal(c.GS.reputation.points,107);
 assert.equal(c.applyReply(r,'peace'),null,'hết lượt');assert.equal(r.conv.length,4);assert.ok(r.conv.every(m=>!m.t.includes('{A}')),'tên agency thay cho {A}');assert.equal(c.fillA('{A} ok'),'Sao Mai ok');
 r=c.addReview({name:'b',cust:0},3,'tạm');c.applyReply(r,'combat',.9);assert.equal(r.s,2);c.applyReply(r,'combat',.9);assert.equal(r.s,1,'lượt 2 hạ 2 sao nhưng không dưới 1');
 r=c.addReview({name:'c',cust:0},2,'x');c.applyReply(r,'combat',.9);res=c.applyReply(r,'peace',.9);assert.equal(res.dStar,1,'xin lỗi sau khi combat được nâng lại');
});
test('trả lời đánh giá tốt: cảm ơn +danh tiếng; mời dự án tiếp → khách quen quay lại, giá +10%',()=>{
 const c=setup();c.GS.reputation={points:10,history:[]};
 let r=c.addReview({name:'a',cust:1},5,'tốt');assert.deepEqual(Array.from(c.replyOptions(r),o=>o.k),['thanks','upsell']);
 c.applyReply(r,'thanks',.9);assert.equal(c.GS.reputation.points,12);
 r=c.addReview({name:'b',cust:1},4,'ok');c.applyReply(r,'upsell',.1);assert.deepEqual(Array.from(c.GS.repeatCust),[1]);c.applyReply(r,'upsell',.1);assert.equal(c.GS.repeatCust.length,1,'không trùng');
 const o=c.applyRepeat({cust:0,reward:10});assert.equal(o.cust,1);assert.equal(o.reward,11);assert.equal(o.repeat,true);assert.equal(c.GS.repeatCust.length,0);
 assert.equal(c.applyRepeat({cust:0,reward:10}).cust,0);
});
test('giao diện và bản lưu: chip danh tiếng ở bảng avatar, hộp đánh giá, nội dung khách hiển thị đã escape',()=>{
 for(const id of ['repChip','repBox'])assert.ok(src.includes(`id="${id}"`),id);
 assert.match(src,/<\/div><button id="repChip"[^>]*>.*<\/button><\/div>/,'chip nằm trong #co');
 assert.match(src,/__PIPELINE__\n__FEEDBACK__/);
 assert.match(src,/'collectionHistory','reviews'\]/);assert.match(src,/Invalid reviews/);assert.match(src,/Invalid feedback/);
 assert.ok(!/\$\{r\.t\}|\$\{m\.t\}|\$\{j\.name\}<|\$\{r\.name\}/.test(fb.slice(fb.indexOf('// ----- giao diện'))),'mọi chữ hiển thị qua escH');
 assert.ok(!fb.includes('5bit'));
});
