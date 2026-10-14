// V16 online: máy chủ thử (cùng luật với SQL), danh sách quà hằng ngày, văn phòng mẫu, nối vào game.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../source',f),'utf8');
const src=read('template.html'),ol=read('online.js'),hub=read('hud-layout.js'),sql=fs.readFileSync(path.join(__dirname,'../online/supabase-schema.sql'),'utf8');
function setup(){
 const store=new Map();
 const ls={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const c={localStorage:ls,sessionStorage:ls,N:64,SAVE:'t',VISIT:null,FBY:{potted_plant:{name:'Cây'},bookshelf:{name:'Tủ sách'}},FIMG:{},CHARS:[],GS:{},
  document:{getElementById:()=>null,querySelector:()=>null,body:{classList:{add(){}}},hidden:false},setInterval(){},setTimeout(){},clearTimeout(){},
  UIIMG:()=>'',toast(){},console,btoa:s=>Buffer.from(s,'binary').toString('base64'),unescape,encodeURIComponent,Date,Math,JSON,Promise,Error,Object,Array,String,Set};
 vm.createContext(c);vm.runInContext(ol.replace('__ONLINE_CFG__','null')+';this.olMockBackend=olMockBackend;this.olGiftsToday=olGiftsToday;this.OL_BOTS=OL_BOTS;this.OL_GIFT_DECOR=OL_GIFT_DECOR;this.OL_GIFT_RUBY=OL_GIFT_RUBY;this.olErrText=olErrText;this.olRankRows=olRankRows;',c);
 return c;
}
const rej=async(p,code)=>{await assert.rejects(p,e=>e.message===code,code);};
test('máy chủ thử: kết bạn, quà 1 lần/bạn/ngày, tặng nhiều bạn, nhận 1 lần, nhận tất cả',async()=>{
 const c=setup(),be=c.olMockBackend();await be.init();
 await rej(be.friends(),'not_logged_in');
 await rej(be.signUp('sai','123456'),'bad_email');await rej(be.signUp('a@x.vn','123'),'weak_pw');
 const A=await be.signUp('a@x.vn','123456');await rej(be.signUp('a@x.vn','123456'),'email_taken');
 const pa=await be.upsertProfile({agency:'A',look:{},level:1,rep:0,jobs:0});assert.match(pa.code,/^AGN-[A-Z2-9]{4}$/);
 const r=await be.requests();assert.equal(r.incoming.length,1,'Sao Mai gửi lời mời sẵn');assert.equal(r.incoming[0].from.agency,'Sao Mai Agency');
 assert.equal(await be.respond(r.incoming[0].id,true),'accepted');
 await rej(be.addFriend(pa.code),'self');await rej(be.addFriend('AGN-ZZZZ'),'code_not_found');
 assert.equal(await be.addFriend('agn-mocx'),'accepted','agency mẫu chấp nhận ngay');
 await rej(be.addFriend('AGN-MOCX'),'already_friends');
 assert.equal((await be.friends()).length,2);
 // B
 await be.signOut();const B=await be.signUp('b@x.vn','abcdef');const pb=await be.upsertProfile({agency:'B',look:{},level:2,rep:0,jobs:0});
 assert.equal(await be.addFriend(pa.code),'sent');assert.equal(await be.addFriend(pa.code),'sent');
 await rej(be.sendGift(A.id,'potted_plant'),'not_friends');
 await be.signOut();await be.signIn('a@x.vn','123456');await rej(be.signIn('a@x.vn','sai'),'bad_login');
 const inc=(await be.requests()).incoming.find(x=>x.from.id===B.id);assert.ok(inc);await be.respond(inc.id,true);
 // A tặng B và tặng Sao Mai trong cùng ngày
 await rej(be.sendGift(B.id,'big_tree'),'bad_gift');
 await be.sendGift(B.id,'potted_plant');await rej(be.sendGift(B.id,'ruby_1'),'gift_done_today');
 await be.sendGift('bot-saomai','ruby_2');
 for(let i=0;i<3;i++)await be.sendNote(B.id,'chào '+i);await rej(be.sendNote(B.id,'4'),'note_limit');await rej(be.sendNote(B.id,'x'.repeat(141)),'bad_note');
 await be.sendLike(B.id);await rej(be.sendLike(B.id),'like_done_today');
 assert.deepEqual(JSON.parse(JSON.stringify(await be.sentToday(B.id))),{gift:true,like:true,notes:3,borrow:false});
 // B nhận: 1 lần; nhận tất cả không còn gì
 await be.signOut();await be.signIn('b@x.vn','abcdef');
 const mail=await be.mail(),gift=mail.find(m=>m.kind==='gift');assert.equal(gift.item,'potted_plant');assert.equal(gift.from.agency,'A');
 assert.equal(await be.claim(gift.id),'potted_plant');await rej(be.claim(gift.id),'not_claimable');
 assert.equal((await be.claimAll()).length,0);
 assert.equal((await be.myProfile()).likes,1,'like cộng vào hồ sơ');
 // A: quà từ 2 agency mẫu đến hằng ngày → nhận tất cả
 await be.signOut();await be.signIn('a@x.vn','123456');
 const am=await be.mail();assert.equal(am.filter(m=>m.kind==='gift'&&!m.claimed).length,2);
 assert.equal((await be.claimAll()).length,2);assert.equal((await be.mail()).filter(m=>m.kind==='gift'&&!m.claimed).length,0,'agency mẫu chỉ gửi 1 quà/ngày');
 // văn phòng: chỉ bạn bè xem; chặn → hết xem
 await be.putOffice({objs:[]});await be.signOut();await be.signIn('b@x.vn','abcdef');assert.ok(await be.getOffice(A.id));
 await be.signOut();await be.signIn('a@x.vn','123456');await be.block(B.id);
 await be.signOut();await be.signIn('b@x.vn','abcdef');assert.equal(await be.getOffice(A.id),null);await rej(be.addFriend(pa.code),'blocked');
 assert.ok(c.olErrText(Error('gift_done_today')).includes('đã tặng quà'));
});
test('máy chủ thử: mượn nhân viên của bạn — chỉ người có trong văn phòng, mỗi bạn 1 lần/ngày, chủ nhận thư tiền công; Sao Mai mượn người của mình',async()=>{
 const c=setup();c.MASCOT_ID='09_Vit_Vang';c.STAFF_ROLE={'11_Juice':'Design','13_AB':'Content','04_Tamny':'Kế toán'};const be=c.olMockBackend();await be.init();
 const A=await be.signUp('a@x.vn','123456');await be.upsertProfile({agency:'A',look:{},level:1,rep:0,jobs:0});
 const sm=c.OL_BOTS[0];
 await rej(be.borrowStaff(sm.id,'11_Juice'),'not_friends');
 const r=await be.requests();await be.respond(r.incoming[0].id,true);
 await rej(be.borrowStaff(sm.id,sm.player),'borrow_bad_staff');
 await rej(be.borrowStaff(sm.id,'01_Huy'),'borrow_bad_staff');
 await rej(be.borrowStaff(sm.id,'09_Vit_Vang'),'borrow_bad_staff');
 assert.ok(await be.borrowStaff(sm.id,'11_Juice')>0);
 await rej(be.borrowStaff(sm.id,'04_Tamny'),'borrow_done_today');
 assert.equal((await be.sentToday(sm.id)).borrow,true);
 // Sao Mai mượn lại người của A khi A đã lưu văn phòng; A nhận tiền công 1 lần
 await be.putOffice({gs:{player:{id:'03_Pali'},staffIds:['03_Pali','13_AB','09_Vit_Vang']}});
 const mail=await be.mail(),w=mail.find(m=>m.kind==='wage');
 assert.equal(w.item,'wage_13_ab');assert.equal(w.from_id,sm.id);
 assert.equal(await be.claim(w.id),'wage_13_ab');await rej(be.claim(w.id),'not_claimable');
 assert.equal((await be.mail()).filter(m=>m.kind==='wage').length,1,'mỗi ngày Sao Mai mượn 1 lần');
});
test('xếp hạng bạn bè: gồm mình, không trùng, bằng điểm cùng hạng, số lạ coi là 0',()=>{
 const c=setup(),me={id:'m',agency:'Tôi',level:2,rep:50,jobs:9,likes:1};
 const fr=[{id:'a',agency:'An',level:3,rep:80,jobs:3,likes:5},{id:'b',agency:'Bình',level:1,rep:50,jobs:20,likes:0},{id:'m',agency:'Tôi (cũ)',rep:1},{id:'c',agency:'Cúc',level:1,rep:'x'}];
 const J=x=>JSON.parse(JSON.stringify(x)),r=J(c.olRankRows(me,fr,'rep'));
 assert.deepEqual(r.map(x=>[x.id,x.rank,x.v]),[['a',1,80],['m',2,50],['b',2,50],['c',4,0]]);
 assert.equal(r.filter(x=>x.me).length,1);
 assert.deepEqual(J(c.olRankRows(me,fr,'jobs').map(x=>x.id).slice(0,2)),['b','m']);
 assert.deepEqual(J(c.olRankRows(me,[],'likes').map(x=>x.rank)),[1]);
});
test('quà hằng ngày: 3 đồ trang trí + 1 gói ruby, cố định trong ngày, đồng bộ với SQL',()=>{
 const c=setup();
 for(const d of ['2026-10-08','2026-10-09','2026-12-31']){const g=c.olGiftsToday(d);assert.equal(g.length,4);assert.equal(new Set(g).size,4);
  assert.ok(g.slice(0,3).every(x=>c.OL_GIFT_DECOR.includes(x)));assert.ok(c.OL_GIFT_RUBY.includes(g[3]));assert.deepEqual(g,c.olGiftsToday(d));}
 assert.notDeepEqual(c.olGiftsToday('2026-10-08'),c.olGiftsToday('2026-10-09'));
 for(const it of [...c.OL_GIFT_DECOR,...c.OL_GIFT_RUBY])assert.ok(sql.includes(`('${it}')`),'gift_pool SQL có '+it);
});
test('văn phòng mẫu: đồ không chồng nhau, nằm trong khu xuất phát, chừa sảnh trước cửa',()=>{
 const c=setup(),html=fs.readFileSync(path.join(__dirname,'../game/index.html'),'utf8');
 const i=html.indexOf('const FURN=')+11;let d=0,j=i;for(;j<html.length;j++){if(html[j]==='[')d++;if(html[j]===']'){d--;if(!d)break;}}
 const F=Object.fromEntries(JSON.parse(html.slice(i,j+1)).map(f=>[f.id,f]));
 for(const b of c.OL_BOTS){const occ=new Map();
  for(const o of b.objs){const f=F[o.id];assert.ok(f,o.id);const [w,dd]=f.views[o.rot].fp;
   for(let y=o.gy;y<o.gy+dd;y++)for(let x=o.gx;x<o.gx+w;x++){
    assert.ok(x>=22&&x<=41&&y>=43&&y<=56,`${b.agency}: ${o.id} ngoài khu (${x},${y})`);
    if(o.id!=='reception_counter')assert.ok(!(x>=29&&x<=33&&y>=53&&y<=56),`${b.agency}: ${o.id} chắn sảnh`);
    const k=(f.layer==='floor'?'F':'O')+x+','+y;assert.ok(!occ.has(k),`${b.agency}: ${o.id} chồng ${occ.get(k)}`);occ.set(k,o.id);}}
 }
});
test('nối vào game: tham quan không ghi bản lưu, phím tắt và bảng bị khóa, lưu đám mây sau mỗi lần lưu',()=>{
 assert.match(src,/const VISIT=\(\(\)=>\{ try\{ const v=JSON\.parse\(sessionStorage\.getItem\(SAVE\+"\.visit"\)/);
 assert.match(src,/if\(vis\)\{saveBlocked=true;/);
 assert.match(src,/localStorage\.setItem\(SAVE,data\);saveErrorNotified=false;try\{onlineAfterSave\(\);\}catch\(e\)\{\}return true;/);
 assert.match(src,/addEventListener\("keydown",e=>\{ if\(VISIT\|\|/);
 assert.match(hub,/const H=HUBS\[key\];if\(!H\|\|VISIT\)return;/);
 assert.match(hub,/friends:\{title:'Bạn bè',icon:'friends',btn:'bFriends'/);
 assert.match(hub,/news:\{title:'Hộp thư',icon:'mail',btn:'bMail',tabs:\[\{id:'mail',label:'Thư',page:'pMail'/);
 for(const id of ['bFriends','friendBadge','mailBadge','cloudSt','pFriends','pRequests','pMail','setAccount','olBox','visitBar'])assert.ok(src.includes(`id="${id}"`),id);
 assert.match(src,/__ONLINE__/);
 // lời nhắn người dùng viết chỉ gán bằng textContent
 assert.match(ol,/s\.textContent=notes\[i\]\?notes\[i\]\.body:''/);assert.ok(!/\$\{m\.body\}/.test(ol));
 // ảnh văn phòng gửi cho bạn bè không có tiền, job, công nợ
 assert.match(ol,/return \{cash:0,ws:WS,ds:DS,fl:FL,unlocked:\[\.\.\.UNLOCKED\],t:0,objs:/);
 assert.ok(!/'receivables'|'pickups'/.test(ol.slice(ol.indexOf('function olOfficeSnapshot'),ol.indexOf('function olProfileData'))));
});

test('OAuth chưa bật hoặc mất mạng không chuyển người chơi khỏi game',async()=>{
 const c=setup();let requested='';
 c.AbortSignal={timeout:()=>undefined};
 c.fetch=async url=>{requested=url;return {ok:true,json:async()=>({external:{google:false,facebook:false}})};};
 const be=c.olSupabaseBackend({url:'https://example.supabase.co',anonKey:'public'});
 await assert.rejects(be.signInOAuth('google'),/Google chưa bật/);
 assert.equal(requested,'https://example.supabase.co/auth/v1/settings');
 await assert.rejects(be.signInOAuth('facebook'),/Facebook chưa bật/);
 c.fetch=async()=>{throw Error('network');};
 await assert.rejects(be.signInOAuth('google'),/network/);
});
