const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../source/template.html'),'utf8');
test('visitor image failure skips drawing without stopping the game frame',()=>{
 const ctx={CUIMG:[{complete:true,naturalWidth:0}]};vm.createContext(ctx);
 vm.runInContext(src.slice(src.indexOf('function drawVisitor('),src.indexOf('function startReact(')),ctx);
 assert.doesNotThrow(()=>ctx.drawVisitor({}, {ci:0}));
 ctx.CUIMG[0]={complete:false,naturalWidth:0};assert.doesNotThrow(()=>ctx.drawVisitor({}, {ci:0}));
});
