const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../source',n),'utf8');
test('loader delays requests, shares fetches and retries twice',async()=>{
 let requests=0,fail=2;
 class Img{set src(s){requests++;queueMicrotask(()=>{if(fail-->0)this.onerror?.();else this.onload?.();});}get src(){return this.s;}}
 const c={Image:Img,HTMLImageElement:Img,setTimeout,clearTimeout};vm.createContext(c);vm.runInContext(read('loader.js'),c);
 const img=c.bootImage();img.src='assets/a.webp';assert.equal(requests,0);
 const a=c.bootLoad('assets/a.webp'),b=c.bootLoad('assets/a.webp');assert.equal(a,b);await a;assert.equal(requests,3);
});
test('loader limits concurrent requests',async()=>{
 const c={Image:class{},HTMLImageElement:class{},setTimeout,clearTimeout};vm.createContext(c);vm.runInContext(read('loader.js'),c);
 let active=0,max=0,done=0;await c.bootPool([1,2,3,4,5,6,7],async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;done++;},3);
 assert.equal(max,3);assert.equal(done,7);
});
function titleContext(player){
 const els=new Map();const el=id=>{if(!els.has(id))els.set(id,{hidden:false,focus(){},click(){this.clicked=true;}});return els.get(id);};
 const classes=new Set();const c={titleOpen:true,guideOpen:false,VISIT:false,hadSave:!!player,GS:{player,day:7},cash:120,OL:{be:null},SAVE:'qa',document:{getElementById:el,body:{classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}}},sessionStorage:{getItem:()=>null,removeItem(){}},agencyName:()=> 'Test Agency',lvl:()=>2,fmt:x=>String(x),closeHub(){},closeGuide(){},openIntro:x=>{c.intro=x;},setTimeout:f=>{c.welcome=f;},maybeStartTour:()=>false,showUiNotice:()=>false,offerGuide(){},openGuide(){},openHub(){},openLogin(){}};vm.createContext(c);vm.runInContext(read('title.js'),c);return {c,el,classes};
}
test('continue and fresh entry use correct flow; new-game delegates backup confirmation',()=>{
 let {c,el,classes}=titleContext({id:'Huy'});c.openTitle();assert.equal(el('titlePlay').textContent,'Chơi tiếp');assert.equal(classes.has('title-view'),true);el('titleNew').onclick();assert.equal(el('bNewGame').clicked,true);el('titlePlay').onclick();assert.equal(c.titleOpen,false);assert.equal(el('titleScreen').hidden,true);
 ({c,el}=titleContext(null));c.openTitle();assert.equal(el('titlePlay').textContent,'Bắt đầu');assert.equal(el('titleNew').hidden,true);el('titlePlay').onclick();assert.equal(c.intro,true);
});

test('activating loaded assets preserves repaint callbacks and avoids duplicate requests',async()=>{
 let repaints=0,requests=0;
 class Img extends EventTarget {constructor(){super();this.complete=false;this.naturalWidth=0;}set src(s){requests++;queueMicrotask(()=>{this.complete=true;this.naturalWidth=16;this.onload?.();this.dispatchEvent(new Event('load'));});}get src(){return '';}}
 const c={Image:Img,HTMLImageElement:Img,setTimeout,clearTimeout};vm.createContext(c);vm.runInContext(read('loader.js'),c);
 const img=c.bootImage();img.src='assets/outdoor.webp';const handler=()=>repaints++;img.onload=handler;
 await c.bootActivate(new Set(['assets/outdoor.webp']));assert.equal(repaints,1);assert.equal(img.onload,handler);
 await c.bootActivate(new Set(['assets/outdoor.webp']));assert.equal(requests,1);
});
