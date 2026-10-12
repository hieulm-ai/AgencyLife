const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../source/template.html'),'utf8');
function setup(){
 const handlers={},box={classList:{add(){},remove(){}}};
 const c={GS:{energy:20,enT:40,revTotal:100,day:2,min:480},CLOSE_MIN:1260,EN_MAX:120,EN_REGEN_S:90,LAST_SEEN:100000,cash:0,now:130000,saves:0,hud(){},save(){c.saves++;},UIIMG(){return '';},fmt:String,performance:{now(){return 1;}},document:{hidden:false,getElementById(){return box;},addEventListener(k,v){handlers[k]=v;}},addEventListener(k,v){handlers[k]=v;}};
 c.Date={now:()=>c.now};vm.createContext(c);
 for(const [start,end] of [['function stepEnergy(dt)','\n',],['function offlineIncome()','// ---------- vẽ'],['let last=performance.now()','(function loop(now)']]){
  const a=source.indexOf(start);let b;
  if(start.startsWith('function stepEnergy')) b=source.indexOf('\n}',a)+2;else b=source.indexOf(end,a);
  vm.runInContext(source.slice(a,b),c);
 }
 c.handlers=handlers;return c;
}
test('offline regeneration retains partial seconds and is consumed once',()=>{const c=setup();c.offlineIncome();assert.equal(c.GS.energy,20);assert.equal(c.GS.enT,70);assert.equal(c.saves,1);c.offlineIncome();assert.equal(c.GS.enT,70);c.stepEnergy(20);assert.equal(c.GS.energy,21);assert.equal(c.GS.enT,0);});
test('future timestamps cannot remove energy',()=>{const c=setup();c.now=1;c.offlineIncome();assert.equal(c.GS.energy,20);assert.equal(c.GS.enT,40);});
test('energy cap discards excess time instead of banking it',()=>{const c=setup();c.stepEnergy(1e9);assert.equal(c.GS.energy,120);assert.equal(c.GS.enT,0);c.GS.energy=119;c.stepEnergy(1);assert.equal(c.GS.energy,119);assert.equal(c.GS.enT,1);});
test('hidden, pagehide and restored page count each second once without advancing game time',()=>{const c=setup();c.document.hidden=true;c.handlers.visibilitychange();c.now+=30000;c.handlers.pagehide();assert.equal(c.GS.enT,70);c.now+=30000;c.document.hidden=false;c.handlers.pageshow();c.handlers.visibilitychange();assert.equal(c.GS.energy,21);assert.equal(c.GS.enT,10);assert.equal(c.GS.day,2);assert.equal(c.GS.min,480);});
test('offline revenue is capped at eight hours and awarded once',()=>{const c=setup();c.now=c.LAST_SEEN+12*3600000;c.offlineIncome();assert.equal(c.cash,100);c.offlineIncome();assert.equal(c.cash,100);assert.equal(c.saves,1);});

function loopContext(mode){
 const c=setup();Object.assign(c,{portraitBlocked:false,bootBusy:false,titleOpen:false,introOpen:false,guideOpen:false,cv:{width:1,height:1},frame(){},requestAnimationFrame:f=>{c.nextFrame=f;},console,GS:{energy:20,enT:0,day:3,min:600,speed:1},...mode});
 const start=source.indexOf('(function loop(now)');const end=source.indexOf('})(last);',start)+9;
 vm.runInContext(source.slice(start,end),c);return c;
}
for(const mode of ['titleOpen','introOpen','guideOpen','bootBusy','portraitBlocked'])test('real-time energy continues while '+mode+' freezes game clock',()=>{
 const c=loopContext({[mode]:true});c.nextFrame(90001);assert.equal(c.GS.energy,21);assert.equal(c.GS.day,3);assert.equal(c.GS.min,600);
 c.nextFrame(90001);assert.equal(c.GS.energy,21,'same time is not credited twice');
});
test('slow rendering credits elapsed energy but limits active simulation step',()=>{
 let advanced=0;const noop=()=>{};const c=loopContext({SPEEDS:[0,1],stepDayTransition:()=>false,stepAgents:noop,stepDoors:noop,stepTraffic:noop,stepGame:dt=>{advanced+=dt;},stepVisitors:noop,closingOffice:false,stepReception:noop,stepMeetings:noop,drawRain:noop});
 c.nextFrame(90001);assert.equal(c.GS.energy,21);assert.equal(advanced,.05);
});
