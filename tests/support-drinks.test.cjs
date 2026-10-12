const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../source',n),'utf8');
test('six packs map to three drink tiers; coming-soon closes without granting currency',()=>{
 const src=read('hud-layout.js').split('function openSupportDrink')[1];
 for(const kind of ['coin','gem'])for(let tier=0;tier<3;tier++){
 let mount,html;const button={};const c={GS:{gems:0},cash:0,fmt:String,hud(){},save(){},toast(){},olBox(h,m){html=h;mount=m;}};
 vm.createContext(c);vm.runInContext('function openSupportDrink'+src.replace('__SUPPORT_DRINK_IMAGES__','["one","two","three"]'),c);
 c.openSupportDrink(kind,60,tier);assert.ok(html.includes('src="'+['one','two','three'][tier]+'"'));assert.equal(c.cash+c.GS.gems,0);
 let closed=0;mount({querySelector:()=>button},()=>{closed++;});button.onclick();assert.equal(closed,1);assert.equal(c.cash+c.GS.gems,0);assert.equal((html.match(/<button /g)||[]).length,1);assert.ok(html.includes('Tính năng sắp ra mắt'));
 }
});
test('logout opens title only after successful sign out',async()=>{
 const fn=read('online.js').match(/async function olLogout\(\)\{[\s\S]*?\n\}/)[0];
 for(const fail of [false,true]){
 let title=0;const c={askConfirm:async()=>true,olPush:async()=>{},OL:{be:{signOut:async()=>{if(fail)throw Error('offline');}}},olOnAuth:async()=>{},closeHub(){},guideOpen:false,sessionStorage:{removeItem(){}},SAVE:'save',OL_VISIT_KEY:'visit',VISIT:null,openTitle(){title++;},toast(){},olErrText:String};
 vm.createContext(c);vm.runInContext(fn,c);await c.olLogout();assert.equal(title,fail?0:1);
 }
});
