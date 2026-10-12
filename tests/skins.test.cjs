const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function setup(gems=100,fail=false){
  const data={a:{id:'a',src:'street-a'},b:{id:'b',src:'street-b'}};
  const ctx={GS:{gems},CHARS:[{id:'a',src:'base-a'},{id:'b',src:'base-b'}],
    IMGS:[],SIMGS:[],UIMGS:[],RIMGS:{talk:[],cele:[],sad:[]},CIMGS:[],BIMGS:[],
    SEAT_COMPOSITES:new Map(),save(){},hud(){},updatePanels(){},toast(){},renderGemShop(){},
    Image:class {set src(v){this.value=v;queueMicrotask(()=>fail?this.onerror():this.onload());}}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../source/skins.js'),'utf8').replace('__SKIN_DATA__',JSON.stringify(data)),ctx);
  return ctx;
}
test('purchase once; changing back and re-equipping is free',async()=>{
  const c=setup();await c.changeSkin('a');assert.equal(c.GS.gems,50);assert.equal(c.CHARS[0].src,'street-a');
  await c.changeSkin('a');assert.equal(c.CHARS[0].src,'base-a');
  await c.changeSkin('a');assert.equal(c.GS.gems,50);assert.equal(c.GS.ownedSkins.length,1);
});
test('duplicate clicks cannot double charge',async()=>{
  const c=setup();await Promise.all([c.changeSkin('a'),c.changeSkin('a')]);assert.equal(c.GS.gems,50);assert.equal(c.GS.ownedSkins.length,1);
});
test('concurrent purchases recheck balance after image loading',async()=>{
  const c=setup(50);await Promise.all([c.changeSkin('a'),c.changeSkin('b')]);assert.equal(c.GS.gems,0);assert.equal(c.GS.ownedSkins.length,1);
});
test('failed image loading never charges or equips',async()=>{
  const c=setup(100,true);await c.changeSkin('a');assert.equal(c.GS.gems,100);assert.equal(c.GS.ownedSkins.length,0);assert.equal(c.CHARS[0].src,'base-a');
});
test('saved equipped skin restores without payment; invalid ownership is removed',async()=>{
  const c=setup(3);c.GS.ownedSkins=['a'];c.GS.equippedSkins=['a','b','unknown'];await c.restoreSkins();
  assert.equal(c.GS.gems,3);assert.equal(c.CHARS[0].src,'street-a');assert.equal(c.GS.equippedSkins.length,1);
});
