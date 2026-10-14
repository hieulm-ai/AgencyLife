const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){const c={GS:{day:1,min:480,done:0,offers:[],jobs:[]},AG:[],VIS:[],PATIENCE_MIN:240,document:{getElementById:()=>null},save(){},toast(){},renderJobs(){},missingReq:()=>[],acceptJob(id){const j=c.GS.offers.find(x=>x.id===id);c.GS.offers=c.GS.offers.filter(x=>x!==j);c.GS.jobs.push(j);},ensureStages(j){j.cur=j.stg.findIndex(s=>s.done<s.need);},hasWorkFor:()=>true};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../source/early-play.js'),'utf8'),c);c.earlyRender=()=>{};return c;}
test('brief, idea and review default without user clicks; reward cannot be claimed twice',()=>{
 const c=setup(),j={id:1,received:true,name:'Logo',reward:20,need:4,work:0,cur:0,stg:[{k:'creative',need:2,done:0},{k:'prod',need:2,done:0}]};c.GS.offers=[j];
 c.earlyTick();c.GS.min+=21;c.earlyTick();assert.equal(c.GS.jobs.length,1);assert.equal(j.early.brief,'clear');
 j.cur=1;c.earlyTick();c.earlyChoose(1,'idea','bold');const reward=j.reward;c.earlyChoose(1,'idea','bold');assert.equal(j.reward,reward);
 j.work=j.need;assert.equal(c.earlyReviewReady(j),false);c.earlyTick();c.GS.min+=21;c.earlyTick();assert.equal(c.earlyReviewReady(j),true);
});
test('water once per customer, cheer has cooldown, older saves get no onboarding',()=>{
 const c=setup(),j={id:1,expire:800};c.GS.offers=[j];c.VIS=[{jobId:1,state:'wait'}];c.earlyWater();c.earlyWater();assert.equal(j.expire,860);
 c.AG=[{stress:40}];c.earlyCheer();c.earlyCheer();assert.equal(c.AG[0].stress,30);
 c.GS.done=3;assert.equal(c.earlyEligible(),false);c.GS.done=0;c.GS.day=10;assert.equal(c.earlyEligible(),false);
});
