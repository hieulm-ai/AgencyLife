// Ngày/đêm, vỉa hè + đèn đường, và kiểm tra vị trí khi di chuyển vật phẩm (07/10/2026).
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source'),src=fs.readFileSync(path.join(root,'template.html'),'utf8');
const slice=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));

function daylight(){const c={iso:(x,y)=>[x*16-y*16,x*8+y*8],document:{createElement:()=>({getContext:()=>({})})}};vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(root,'daylight.js'),'utf8'),c);return c;}

test('ánh sáng theo giờ: sáng hơi ấm, ban ngày giữ nguyên màu, chiều vàng, tối xanh đậm và bật đèn từ khoảng 18:00',()=>{
 const c=daylight(),at=m=>c.dayLight(m);
 assert.equal(at(480).phase,'Sáng');assert.equal(at(780).phase,'Chiều');assert.equal(at(1170).phase,'Tối');
 assert.deepEqual(Array.from(at(720).tint),[255,255,255]);assert.equal(at(720).lamps,0);
 const after=at(1005).tint;assert.ok(after[2]<200&&after[0]===255,'chiều ngả vàng');
 assert.equal(at(1050).lamps<0.2,true);assert.ok(at(1095).lamps>=0.8,'18:15 đèn đã bật');
 const night=at(1170);assert.equal(night.lamps,1);assert.ok(night.tint.every(v=>v<160)&&night.tint[2]>night.tint[0],'tối: tối và xanh');
 for(let m=480;m<=1260;m+=15){const d=at(m);assert.ok(d.lamps>=0&&d.lamps<=1);assert.ok(d.tint.every(v=>v>=0&&v<=255));}
});

function outdoor(){const c={M:14,N:64,LAMPS:[],TREES:[],hash:()=>0.5};vm.createContext(c);
 vm.runInContext(slice('function outType(','const OUTDOOR_SHEET'),c);
 const l=src.indexOf('for(let x=-M+2;x<64;x+=6) LAMPS.push');vm.runInContext(src.slice(l,src.indexOf('// Cache outdoor layers',l)),c);return c;}
test('vỉa hè trước văn phòng kéo tới hai mép bản đồ; chỗ cắt đường dọc là vạch qua đường',()=>{
 const c=outdoor();
 for(const x of [-14,-5,0,30,64,70,77])for(const y of [58,59])assert.equal(c.outType(x,y),'walk',`${x},${y}`);
 for(const x of [65,67,69])assert.equal(c.outType(x,58),'roadX');
});
test('đèn đường 2 hàng: sát văn phòng và bên kia đường, đầu đèn quay ra lòng đường, không đặt giữa ngã tư',()=>{
 const c=outdoor(),L=c.LAMPS.map(a=>Array.from(a));
 const near=L.filter(([x,y])=>y===59),far=L.filter(([x,y])=>y===65);
 assert.ok(near.length>=10&&far.length>=10,'mỗi hàng ngang đủ đèn');
 assert.ok(L.some(([x])=>x===64)&&L.some(([x])=>x===70),'có đèn dọc đường bên phải');
 assert.ok(near.every(l=>l[2]===1)&&far.every(l=>l[2]===0),'hai hàng lật ngược nhau');
 assert.ok(!L.some(([x,y])=>x>=65&&x<=69&&y>=58&&y<=65),'không có đèn trên lòng đường');
});

function moveCtx(objs){const FBY={desk:{layer:'object',price:3,views:[{fp:[2,1]},{fp:[1,2]},{fp:[1,2]},{fp:[2,1]}]}};
 const c={FBY,OBJS:objs,OCC:new Map(),RUG:new Map(),GS:{gems:0},UNLIM:false,cash:0,fmt:String,ENTRY:[31,56],plotAt:()=>0,at:()=>0,agentTiles:()=>new Set(),inLobby:()=>false};
 for(const o of objs){const [w,d]=FBY[o.id].views[o.rot].fp;for(let y=o.gy;y<o.gy+d;y++)for(let x=o.gx;x<o.gx+w;x++)c.OCC.set(x+','+y,o.uid);}
 vm.createContext(c);vm.runInContext(slice('function fCheck(','function placeFurn(')+slice('function placeCheck(','// Người đang ngồi/dùng'),c);return c;}
test('di chuyển: chỗ cũ của chính món đó không bị coi là "ô đã có đồ", không tính tiền; vẫn chặn khi đè món khác',()=>{
 const c=moveCtx([{uid:1,id:'desk',gx:10,gy:10,rot:0},{uid:2,id:'desk',gx:14,gy:10,rot:0}]);
 assert.equal(c.placeCheck({mode:'move',uid:1,id:'desk',gx:11,gy:10,rot:0}).ok,true,'dịch 1 ô đè lên chỗ cũ của nó');
 assert.equal(c.placeCheck({mode:'move',uid:1,id:'desk',gx:13,gy:10,rot:0}).ok,false,'đè lên bàn khác');
 assert.equal(c.OCC.get('10,10'),1,'OCC gốc được trả lại');
 const buy=c.placeCheck({mode:'buy',id:'desk',gx:20,gy:20,rot:0});assert.equal(buy.ok,false);assert.equal(buy.money,true,'mua khi thiếu tiền: báo để tô đỏ');
});
