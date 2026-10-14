// 07/10/2026 (chiều): khách xếp hàng một ở quầy lễ tân, ngồi sofa chờ hoặc ra về rồi quay lại khi xong;
// nhân vật của người chơi (chọn sẵn / tự tạo, đổi tên); mặt nạ vùng cho đổi màu.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'source/template.html'),'utf8');
const read=f=>fs.readFileSync(path.join(root,'source',f),'utf8');

// ---------- hàng chờ ----------
function queueCtx(){
 const c={ENTRY:[31,56],OUTSIDE_ENTRY:[31,58],LOBBY:[29,53,33,56],GS:{offers:[],jobs:[],pickups:[]},VIS:[],AG:[],
  OBJS:[{uid:1,id:'reception_counter',gx:30,gy:52,rot:0}],FBY:{reception_counter:{views:Array.from({length:4},()=>({fp:[3,1]}))}},
  REACH:Array.from({length:64},()=>Array(64).fill(true)),blocked:()=>false,at:(x,y)=>(x>=20&&x<=40&&y>=40&&y<=56)?0:-1,bfs:(a,b)=>[a,b],BUSY:new Map(),
  renderJobs(){},save(){},meetingPending:()=>false,releaseMeeting(){},toast(){},assignSeats(){},OBJS_SOFA:[],seatsOf:()=>[],accessOf:()=>null,
  visLeave(v,emo){v.state='leave';v.emo=emo;}};
 c.faceToward=(a,o)=>{const dx=o.gx+1.5-(a.x+.5),dy=o.gy+.5-(a.y+.5);return Math.abs(dx)>=Math.abs(dy)?(dx>0?'SE':'NW'):(dy>0?'SW':'NE');};
 vm.createContext(c);
 vm.runInContext(src.slice(src.indexOf('function queueLine('),src.indexOf('function freeSpot()')),c);
 vm.runInContext(read('visitor-lounge.js'),c);vm.runInContext(read('office-flow.js'),c);
 return c;
}
test('hàng chờ là một hàng dọc nối từ ô khách ra phía sau quầy, không lấn ô lễ tân và không chắn cửa',()=>{
 const c=queueCtx(),pair=c.receptionPair(),line=Array.from(c.queueLine(pair),p=>Array.from(p));
 assert.deepEqual(line[0],Array.from(pair.guest));
 assert.deepEqual(line.slice(0,3),[[31,53],[31,54],[31,55]],'thẳng hàng phía sau người đầu tiên');
 assert.ok(line.every(([x,y])=>y<c.ENTRY[1]),'không đứng ở ô cửa');
 assert.equal(line[3][1],55,'hết chỗ thì rẽ ngang, vẫn liền hàng');
 assert.equal(Math.abs(line[3][0]-31),1);
 assert.ok(!line.some(([x,y])=>x===pair.staff[0]&&y===pair.staff[1]));
});
test('khách đến trước đứng đầu hàng; người đầu hàng chưa tới quầy thì người sau không được tiếp trước',()=>{
 const c=queueCtx();c.GS.offers=[{id:1},{id:2}];
 const a={id:1,qn:1,kind:'offer',jobId:1,state:'in',x:31,y:58,path:[[31,58]]},b={id:2,qn:2,kind:'offer',jobId:2,state:'wait',x:31,y:53,path:[],goal:[31,53]};
 c.VIS.push(b,a);c.AG.push({ci:0,state:'wander',x:31,y:50,path:[]});
 c.updateQueue(1);
 assert.deepEqual(Array.from(a.goal),[31,53],'người đến trước được ô đầu hàng');
 assert.deepEqual(Array.from(b.goal),[31,54],'người đến sau lùi xuống ô thứ hai');
 for(let i=0;i<10;i++)c.stepReception(.5);
 assert.equal(c.GS.offers[1].received,undefined,'không tiếp người đứng sau khi người trước còn đang đi');
});
test('đứng chờ trong hàng thì quay mặt về quầy',()=>{
 const c=queueCtx(),v={x:31,y:55};c.faceCounter(v);assert.equal(v.dir,'NE');
 const side={x:33,y:52};c.faceCounter(side);assert.equal(side.dir,'NW');
});
test('giao yêu cầu xong: job ngắn thường ngồi sofa chờ; job dài thì ra về, đánh dấu để quay lại khi xong',()=>{
 const c=queueCtx();let sofa=0;c.goToSofa=()=>{sofa++;return true;};
 const shortJob={id:1,need:16},longJob={id:2,need:40};
 const sitters=Array.from({length:40},(_,i)=>({id:i+1})).filter(v=>c.waitsOnSofa(v,shortJob)).length;
 assert.ok(sitters>=22&&sitters<=36,`khoảng 3/4 khách job ngắn ngồi chờ (được ${sitters}/40)`);
 const v1={id:1,state:'wait'};c.afterBrief(v1,shortJob);
 const v2={id:1,state:'wait'};c.afterBrief(v2,longJob);
 assert.equal(sofa,c.waitsOnSofa({id:1},shortJob)?1:0);
 assert.equal(v2.state,'leave');assert.equal(longJob.visitorDeparted,true);assert.equal(v2.emo,'wait');
});
test('khách đang ngồi sofa: job xong thì vào cuối hàng nhận sản phẩm',()=>{
 const c=queueCtx(),v={id:3,jobId:9,kind:'offer',state:'lounge',seat:{uid:1},acc:[25,54],x:25,y:55,path:[]};c.VIS.push(v);c.save=()=>{};
 c.finishJobVisitor({id:9,name:'Logo'});
 assert.equal(v.kind,'pickup');assert.equal(v.state,'pickup');assert.ok(v.qn>0);assert.equal(c.GS.pickups.length,1);
});

// ---------- nhân vật người chơi ----------
function playerCtx(player){
 const CHARS=['01_Huy','02_Luwon','03_Pali','11_Juice','09_Vit_Vang'].map(id=>({id,src:id+'.png'}));
 const c={CHARS,BASE_SKIN_CHARS:CHARS,CREATOR:{scale:50,bases:{m:{char:'01_Huy',lum:{},masks:{}},f:{char:'02_Luwon',lum:{},masks:{}}}},
  GS:{jobs:[],...(player?{player}:{})},AG:CHARS.map((c,ci)=>({ci,x:10,y:10,stress:0})),cash:100,ENTRY:[10,10],startArrival(){},BUSY:new Set(),SEAT_COMPOSITES:new Map(),
  assignSeats(){},save(){c.saved=(c.saved||0)+1;return true;},updatePanels(){},hud(){},toast(m){c.lastToast=m;},addOfficeNews(){},releaseMeeting(){},
  document:{getElementById(){return {classList:{remove(){},contains(){return false;}}};},querySelector(){return null;}}};
 vm.createContext(c);vm.runInContext(read('staff.js')+'\nrenderStaff=()=>{};'+read('player.js'),c);return c;
}
test('tên agency: bỏ ký tự HTML, gộp khoảng trắng, tối đa 24 ký tự; tên rỗng bị từ chối; chưa đặt thì hiện TYCOON AGENCY',()=>{
 const c=playerCtx();
 assert.equal(c.sanitizeName('  Hà <b>"x"</b>  '),'Hà bx/b');
 assert.equal(c.sanitizeName('Trần   Hà'),'Trần Hà');
 assert.equal(c.sanitizeName('a'.repeat(40),24).length,24);
 assert.equal(c.agencyName(),'TYCOON AGENCY');
 assert.equal(c.renameAgency('   '),false);assert.equal(c.GS.agencyName,undefined);
 assert.equal(c.renameAgency('  Sao   Mai <Agency> '),true);assert.equal(c.GS.agencyName,'Sao Mai Agency');assert.equal(c.agencyName(),'Sao Mai Agency');
 assert.equal(c.validAgency('Sao Mai Agency'),true);assert.equal(c.validAgency('<b>'),false);assert.equal(c.validAgency(''),false);assert.equal(c.validAgency('x'.repeat(25)),false);
 assert.equal(typeof c.renamePlayer,'undefined','không còn đổi tên nhân vật');
});
test('chọn nhân vật có sẵn: nhân vật đó là nhân vật của bạn (lễ tân); tên nhân sự khác cố định',()=>{
 const c=playerCtx({kind:'preset',id:'11_Juice'});c.GS.staffIds=['02_Luwon','03_Pali'];c.restoreRoster();
 assert.equal(vm.runInContext('FOUNDER_ID',c),'11_Juice');
 assert.deepEqual(c.AG.map(a=>c.CHARS[a.ci].id).sort(),['02_Luwon','03_Pali','09_Vit_Vang','11_Juice'],'Vịt Vàng luôn có trong đội');
 assert.equal(c.staffName('11_Juice'),'Juice');assert.equal(c.staffName('02_Luwon'),'Luwon');assert.equal(c.staffName('01_Huy'),'Huy');
 assert.equal(c.roleOf('11_Juice'),'Lễ tân');
 c.dismissStaff('11_Juice');assert.ok(c.AG.some(a=>c.CHARS[a.ci].id==='11_Juice'),'không cho thôi việc nhân vật của bạn');
});
test('bản lưu cũ có tên nhân vật vẫn hiện tên đó; chưa chọn nhân vật thì Huy là nhân vật mặc định',()=>{
 let c=playerCtx({kind:'preset',id:'11_Juice',name:'Hà'});c.restoreRoster();assert.equal(c.staffName('11_Juice'),'Hà');
 c=playerCtx();c.restoreRoster();assert.equal(vm.runInContext('FOUNDER_ID',c),'01_Huy');assert.equal(c.staffName('01_Huy'),'Huy');
});
function introCtx(){
 const c=playerCtx(),intro={querySelector(){return {replaceChildren(){}};}};
 c.document.getElementById=id=>id==='intro'?intro:{classList:{remove(){},contains(){return false;}},focus(){}};c.document.createElement=()=>({});c.location={reload(){c.reloaded=true;}};
 vm.runInContext('introFresh=true',c);return c;
}
test('2 nhân vật đồng hành: bắt buộc 1 Account + 1 nhân sự sản xuất; thông báo nêu rõ chức vụ còn thiếu',()=>{
 const c=introCtx();
 assert.equal(c.companionCheck(['10_Con_LT','02_Luwon']).ok,true);
 assert.equal(c.companionCheck(['trinh_lac_corrected_v2','14_HM']).ok,true,'Account + AI Designer');
 assert.equal(c.companionCheck(['13_AB','15_CongB']).ok,false,'thiếu Account');
 assert.equal(c.companionCheck(['03_Pali','10_Con_LT']).ok,false,'2 Account, thiếu sản xuất');
 assert.equal(c.companionCheck(['03_Pali','06_Vu_a_Vu']).ok,false,'Sale không phải nhân sự sản xuất');
 assert.equal(c.companionCheck(['03_Pali']).ok,false);assert.equal(c.companionCheck([]).ok,false);assert.equal(c.companionCheck(undefined).ok,false);
 assert.match(c.companionMessage(['13_AB','15_CongB']),/Cần chọn 1 Account thì mới khởi đầu được/);
 assert.match(c.companionMessage([]),/Đã chọn 0\/2 · Cần chọn 1 Account và 1 nhân sự sản xuất \(Design, AI Designer, Content, Editor\) thì mới khởi đầu được/);
 assert.match(c.companionMessage(['03_Pali','02_Luwon']),/Đủ chức vụ/);
 const pool=Array.from(c.companionPool('02_Luwon'));
 assert.ok(!pool.includes('02_Luwon')&&!pool.includes('09_Vit_Vang'),'không có nhân vật của bạn và linh vật');
 assert.equal(c.STAFF_ROLE?.[pool[0]]??vm.runInContext('STAFF_ROLE',c)[pool[0]],'Account','Account xếp đầu');
});
test('màn mở đầu: bắt buộc tên agency và đủ chức vụ đồng hành; đội = bạn + 2 đồng hành + Vịt Vàng',()=>{
 const c=introCtx();
 assert.equal(c.confirmIntro({kind:'preset',id:'03_Pali',agency:'   ',companions:['10_Con_LT','02_Luwon']}),false);assert.equal(c.GS.player,undefined);assert.match(c.lastToast,/tên agency/);
 assert.equal(c.confirmIntro({kind:'preset',id:'03_Pali',agency:'Sao Mai',companions:['13_AB','02_Luwon']}),false);assert.equal(c.GS.player,undefined);assert.equal(c.GS.agencyName,undefined);assert.match(c.lastToast,/Account/);
 assert.equal(c.confirmIntro({kind:'preset',id:'03_Pali',agency:'Sao Mai',companions:['03_Pali','02_Luwon']}),false,'không chọn chính mình làm đồng hành');
 assert.equal(c.confirmIntro({kind:'preset',id:'03_Pali',agency:'  Sao  Mai ',companions:['10_Con_LT','02_Luwon']}),true);
 assert.equal(c.GS.agencyName,'Sao Mai');assert.deepEqual(JSON.parse(JSON.stringify(c.GS.player)),{kind:'preset',id:'03_Pali'});
 assert.deepEqual(Array.from(c.GS.staffIds),['03_Pali','10_Con_LT','02_Luwon','09_Vit_Vang']);assert.equal(c.reloaded,true);
 const c2=introCtx();assert.equal(c2.confirmIntro({kind:'custom',agency:'Mây',look:{base:'f',skin:0,hair:0,top:0,bottom:0},companions:['trinh_lac_corrected_v2','15_CongB']}),true);
 assert.deepEqual(Array.from(c2.GS.staffIds),['P_custom','trinh_lac_corrected_v2','15_CongB','09_Vit_Vang']);
});
test('bản lưu cũ chọn nhân vật: không cần chọn đồng hành, giữ đội, thêm Vịt Vàng khi mở game',()=>{
 const c=introCtx();vm.runInContext('introFresh=false',c);c.GS.staffIds=['01_Huy','11_Juice'];
 assert.equal(c.confirmIntro({kind:'preset',id:'02_Luwon',agency:'Cũ'}),true);assert.deepEqual(Array.from(c.GS.staffIds),['01_Huy','11_Juice','02_Luwon']);
 c.restoreRoster();assert.ok(c.AG.some(a=>c.CHARS[a.ci].id==='09_Vit_Vang'));
 c.dismissStaff('09_Vit_Vang');assert.ok(c.AG.some(a=>c.CHARS[a.ci].id==='09_Vit_Vang'),'không cho linh vật thôi việc');
});
test('kiểm tra dữ liệu nhân vật trong bản lưu',()=>{
 const c=playerCtx();
 assert.equal(c.validPlayer({kind:'preset',id:'11_Juice',name:'Hà'}),true);assert.equal(c.validPlayer({kind:'preset',id:'11_Juice'}),true);
 assert.equal(c.validPlayer({kind:'custom',id:'P_custom',name:'Hà',look:{base:'f',skin:1,hair:2,top:3,bottom:4}}),true);
 for(const bad of [{kind:'preset',id:'11_Juice',name:'<img>'},{kind:'preset',id:'a b',name:'x'},{kind:'custom',id:'P_custom',name:'x',look:{base:'z',skin:0,hair:0,top:0,bottom:0}},
  {kind:'custom',id:'P_custom',name:'x',look:{base:'m',skin:99,hair:0,top:0,bottom:0}},{kind:'boss',id:'x',name:'x'},null,[]])assert.equal(c.validPlayer(bad),false,JSON.stringify(bad));
 assert.match(src,/if\(o\.gs\.player!==undefined&&!validPlayer\(o\.gs\.player\)\)throw Error\('Invalid player'\)/);
 assert.match(src,/if\(o\.gs\.agencyName!==undefined&&!validAgency\(o\.gs\.agencyName\)\)throw Error\('Invalid agency'\)/);
});
test('đổi màu theo vùng: giữ vùng 0, điểm có độ sáng trung vị lấy đúng màu đã chọn, tối/sáng theo bóng gốc',()=>{
 const c=playerCtx(),look={base:'m',skin:0,hair:0,top:2,bottom:0},top=Array.from(vm.runInContext('PLAYER_PALETTE.top[2][1]',c));
 const px=new Uint8ClampedArray([100,100,100,255, 128,128,128,255, 128,128,128,0, 40,40,40,255, 230,230,230,255]);
 const mask=new Uint8ClampedArray([0,0,0,255, 150,150,150,255, 150,150,150,255, 150,150,150,255, 150,150,150,255]);
 c.recolorPixels(px,mask,look,{3:[40,128,230]},50);
 assert.deepEqual(Array.from(px.slice(0,3)),[100,100,100],'vùng 0 giữ nguyên');
 assert.deepEqual(Array.from(px.slice(4,7)),top,'trung vị = màu chọn');
 assert.deepEqual(Array.from(px.slice(8,11)),[128,128,128],'điểm trong suốt giữ nguyên');
 assert.ok(px[12]<top[0]&&px[16]>top[0],'tối hơn và sáng hơn theo bóng gốc');
});

// ---------- mặt nạ vùng của dáng gốc ----------
function readPng(f){const b=fs.readFileSync(f);let o=8,w,h,ct,idat=[];while(o<b.length){const len=b.readUInt32BE(o),type=b.toString('ascii',o+4,o+8),d=b.subarray(o+8,o+8+len);
  if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);ct=d[9];}else if(type==='IDAT')idat.push(d);o+=12+len;}
 const bpp={0:1,2:3,4:2,6:4}[ct],raw=zlib.inflateSync(Buffer.concat(idat)),st=w*bpp,px=Buffer.alloc(h*st);
 for(let y=0;y<h;y++){const ft=raw[y*(st+1)],s=raw.subarray(y*(st+1)+1,(y+1)*(st+1));for(let x=0;x<st;x++){const a=x>=bpp?px[y*st+x-bpp]:0,up=y?px[(y-1)*st+x]:0,cc=(x>=bpp&&y)?px[(y-1)*st+x-bpp]:0;let v=s[x];
  if(ft===1)v+=a;else if(ft===2)v+=up;else if(ft===3)v+=(a+up)>>1;else if(ft===4){const p=a+up-cc,pa=Math.abs(p-a),pb=Math.abs(p-up),pc=Math.abs(p-cc);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:cc);}px[y*st+x]=v&255;}}
 return {w,h,bpp,px,at:(x,y)=>px[(y*w+x)*bpp]};}
const baseDir=b=>path.join(root,b.own?'assets/creator_bases':'assets/characters',b.char);
test('mặt nạ vùng: đủ tư thế (dáng có sẵn 7, dáng vẽ riêng 6), cùng cỡ ảnh gốc; mỗi khung đi bộ có đủ da, tóc, áo, quần',()=>{
 const L=JSON.parse(fs.readFileSync(path.join(root,'assets/creator/layout.json'),'utf8'));
 assert.deepEqual(Object.keys(L.bases),['m','f','m2','f2']);
 for(const [key,b] of Object.entries(L.bases)){
  assert.equal(b.sheets.length,b.own?6:7,key);
  for(const sheet of b.sheets){
   const m=readPng(path.join(root,'assets/creator',b.char,sheet+'.png')),o=readPng(path.join(baseDir(b),`hd_${sheet}.png`));
   assert.deepEqual([m.w,m.h],[o.w,o.h],`${key} ${sheet}`);
  }
  const m=readPng(path.join(root,'assets/creator',b.char,'walk.png'));
  for(let fy=0;fy<2;fy++)for(let fx=0;fx<3;fx++){const n=[0,0,0,0,0];for(let y=0;y<128;y++)for(let x=0;x<96;x++)n[Math.round(m.at(fx*96+x,fy*128+y)/L.scale)]++;
   assert.ok(n[2]>300&&n[3]>150&&n[4]>150,`${key} khung ${fx},${fy}: tóc ${n[2]}, áo ${n[3]}, quần ${n[4]}`);
   if(fy===0)assert.ok(n[1]>100,`${key} khung ${fx}: da ${n[1]}`);}
  for(const r of ['1','2','3','4']){const [lo,mid,hi]=b.lum[r];assert.ok(lo<mid&&mid<hi,`${key} vùng ${r}`);}
 }
});
test('thanh dưới: 5 trung tâm dùng icon đã cắt sát, có chữ; không còn ô Gói VIP (14/10: VIP vào Cửa hàng ruby)',()=>{
 const build=read('build.py');
 for(const [id,k,label] of [['bJobs','brief','Công việc'],['bStaff','people','Đội ngũ'],['bBuild','hammer','Xây dựng'],['bShop','shop','Cửa hàng'],['bAch','trophy','Thành tựu']])
  assert.match(src,new RegExp(`id="${id}"[^\\n]*data-ic="nav_${k}"[^\\n]*<span class="nl">${label}</span>`));
 assert.doesNotMatch(src,/id="bVip"/);
 assert.match(build,/NAV_ICONS=\['brief','people','hammer','shop','trophy'\]/);
 assert.match(src,/Object\.assign\(window\.UIICON,__NAVICON__\)/);
});
test('màn mở đầu: có 2 lựa chọn và chặn phím tắt khi đang gõ tên',()=>{
 const p=read('player.js');
 assert.match(p,/data-go="preset"[\s\S]*Chọn nhân vật có sẵn/);assert.match(p,/data-go="custom"[\s\S]*Tự tạo nhân vật/);
 assert.match(read("title.js"),/if\(!GS\.player\)\s*openIntro\(!hadSave\|\|GS\.introPending===true\);/);assert.match(read("title.js"),/maybeStartTour\(\)/);assert.match(src,/if\(!hadSave&&!GS\.player\) GS\.introPending=true;/);
 assert.match(src,/addEventListener\("keydown",e=>\{ if\(VISIT\|\|bootBusy\|\|titleOpen\|\|introOpen\|\|guideOpen\|\|portraitBlocked\|\|tourOn\|\|askOpen\(\)\|\|e\.target\.closest\?\.\("input,textarea,select,\[contenteditable\]"\)\) return;/);
});

test('mặt nạ không để viền răng cưa: điểm chuyển tiếp quanh da/tóc đã nhập vùng; áo và quần tách đúng ở thắt lưng',()=>{
 const L=JSON.parse(fs.readFileSync(path.join(root,'assets/creator/layout.json'),'utf8'));
 for(const b of Object.values(L.bases)){
  const m=readPng(path.join(root,'assets/creator',b.char,'walk.png')),o=readPng(path.join(baseDir(b),'hd_walk.png'));
  const reg=(x,y)=>Math.round(m.at(x,y)/L.scale);let fringe=0,sh=0;
  for(let y=1;y<o.h-1;y++)for(let x=1;x<o.w-1;x++){
   const i=(y*o.w+x)*4,[r,g,bl,a]=[o.px[i],o.px[i+1],o.px[i+2],o.px[i+3]];if(!a)continue;
   const k=reg(x,y);if(k===1||k===2){sh++;continue;}if(k)continue;
   const lum=.299*r+.587*g+.114*bl,chroma=Math.max(r,g,bl)-Math.min(r,g,bl);if(lum<=(b.own?80:38)||(lum>200&&chroma<40))continue;   // dáng vẽ riêng có viền nâu đậm (độ sáng ~50–75) thay cho viền đen: giữ nguyên làm viền
   let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const q=reg(x+dx,y+dy);if(q===1||q===2){near=true;break;}}
   if(near)fringe++;
  }
  assert.ok(fringe/sh<.01,`${b.char}: ${fringe} điểm mép chưa nhập vùng / ${sh}`);
  for(let fy=0;fy<2;fy++)for(let fx=0;fx<3;fx++){let ty=[],by=[];
   for(let y=0;y<128;y++)for(let x=0;x<96;x++){const k=reg(fx*96+x,fy*128+y);if(k===3)ty.push(y);if(k===4)by.push(y);}
   const tm=ty.reduce((s,v)=>s+v,0)/ty.length;assert.ok(by.filter(v=>v<tm).length/by.length<.03,`${b.char} khung ${fx},${fy}: quần lấn lên vùng áo`);}
 }
});
test('điểm sáng vượt mức ở mép vùng không bị đẩy lên nấc sáng nhất (tránh viền trắng)',()=>{
 const c=playerCtx(),t=(y,l)=>vm.runInContext(`lumT(${y},${JSON.stringify(l)})`,c);
 assert.equal(t(60,[20,50,60]),1);assert.ok(t(140,[20,50,60])<=.72);assert.equal(t(50,[20,50,60]),.5);assert.equal(t(20,[20,50,60]),0);
});
