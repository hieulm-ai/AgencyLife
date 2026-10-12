// ---------- Online (V16, 08/10/2026): tài khoản, lưu đám mây, bạn bè, tham quan, Hộp thư, quà ----------
// Máy chủ: Supabase (online/supabase-schema.sql). Mọi lệnh gọi máy chủ nằm trong OL_BACKENDS — đổi nhà cung cấp chỉ viết lại phần này.
// Chưa có cấu hình máy chủ (online/config.json) thì game chạy như cũ; Cài đặt có "Máy chủ thử trên máy này" (lưu trong trình duyệt,
// kèm 3 agency mẫu) để chơi thử luồng bạn bè/quà mà không cần Supabase.
// Luật (giống SQL): mỗi bạn 1 quà + 1 like / ngày, 3 lời nhắn / bạn / ngày; tặng được nhiều bạn; người nhận nhận hết; tối đa 50 bạn, 20 lời mời/ngày.
// Ngày tính theo giờ Việt Nam. Tham quan = tải lại trang ở chế độ chỉ xem với ảnh văn phòng của bạn (VISIT), không ghi bản lưu.
const ONLINE_CFG=__ONLINE_CFG__;
const OL_META_KEY='5bit.online', OL_MODE_KEY='5bit.online.mode', OL_DEV_KEY='5bit.device', OL_VISIT_KEY=SAVE+'.visit';
const OL_PUSH_EVERY=120000;   // lưu đám mây tối đa 1 lần / 2 phút (cộng thêm khi ẩn tab, chuyển ngày)
const OL_GIFT_DECOR=['potted_plant','decorative_blue_mark','coffee_table','water_dispenser','rug_blue','bookshelf','softbox'];
const OL_GIFT_RUBY=['ruby_1','ruby_2','ruby_3'];
const OL_ERR={not_logged_in:'Cần đăng nhập trước.',code_not_found:'Không tìm thấy agency có mã này.',self:'Đây là mã của chính bạn.',blocked:'Không thể kết nối với agency này.',
 already_friends:'Hai bên đã là bạn.',friend_limit:'Danh sách bạn đã đủ 50.',request_limit:'Hôm nay đã gửi đủ 20 lời mời.',request_not_found:'Lời mời không còn.',
 not_friends:'Chỉ tương tác được với bạn bè.',bad_gift:'Món quà không hợp lệ.',gift_done_today:'Hôm nay bạn đã tặng quà cho agency này.',bad_note:'Lời nhắn 1–140 ký tự.',
 note_limit:'Hôm nay đã gửi đủ 3 lời nhắn cho agency này.',like_done_today:'Hôm nay bạn đã thích văn phòng này.',not_claimable:'Thư này đã nhận rồi.',
 bad_login:'Email hoặc mật khẩu chưa đúng.',email_taken:'Email này đã có tài khoản.',weak_pw:'Mật khẩu cần ít nhất 6 ký tự.',bad_email:'Email chưa đúng dạng.',
 offline:'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',no_server:'Chưa kết nối máy chủ.'};
const olEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const olToday=()=>new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
function olErrText(e){const m=String(e&&e.message||e||'');const k=Object.keys(OL_ERR).find(k=>m.includes(k));return k?OL_ERR[k]:(/fetch|network|Failed/i.test(m)?OL_ERR.offline:'Có lỗi: '+m.slice(0,80));}
function olLS(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){return null;}}
function olDevice(){let d=olLS(OL_DEV_KEY);if(!d){d='D'+Math.random().toString(36).slice(2,10);olLS(OL_DEV_KEY,d);}return d;}
// Quà hằng ngày: cùng một danh sách cho mọi người trong ngày (3 đồ trang trí + 1 gói ruby), đổi theo ngày Việt Nam.
function olGiftsToday(day=olToday()){
 let h=0;for(const ch of day)h=(h*31+ch.charCodeAt(0))>>>0;
 const pool=[...OL_GIFT_DECOR],pick=[];for(let i=0;i<3;i++){h=(h*1103515245+12345)>>>0;pick.push(pool.splice(h%pool.length,1)[0]);}
 h=(h*1103515245+12345)>>>0;pick.push(OL_GIFT_RUBY[h%OL_GIFT_RUBY.length]);
 return pick;
}
function olGiftName(it){const r=/^ruby_(\d)$/.exec(it||'');if(r)return r[1]+' ruby';return FBY[it]?FBY[it].name:it;}
function olGiftIcon(it,s=28){return /^ruby_/.test(it)?UIIMG('gem',s):(FBY[it]&&FIMG[it]?`<img src="${FBY[it].views[0].src}" width="${s}" height="${s}" alt="" style="object-fit:contain">`:UIIMG('gift',s));}

// ---------- máy chủ thử (trong trình duyệt) — cùng luật với SQL ----------
const OL_MOCK_DB='5bit.mockdb', OL_MOCK_SES='5bit.mock.session';
function olBotOffice(player,agency,staff,objs){
 const cells=Array.from({length:N},()=> '0'.repeat(N));
 return {cash:0,cells,objs:objs.map((o,i)=>({uid:i+1,...o})),ws:{},ds:{},fl:{},unlocked:[0],t:Date.now(),
  gs:{player:{id:player,kind:'preset'},agencyName:agency,staffIds:[player,...staff],day:12,min:600,jobs:[],offers:[],starterApplied:true,tourDone:true,guideSeen:true,uiV15Seen:true,introPending:false,homeSeats:{}}};
}
const OL_BOTS=[
 {id:'bot-saomai',code:'AGN-SAOM',agency:'Sao Mai Agency',level:3,rep:420,jobs:86,likes:12,player:'07_Hao_Hao',staff:['04_Tamny','11_Juice'],objs:[
  {id:'reception_counter',gx:30,gy:52,rot:0,locked:true},{id:'sofa_blue',gx:24,gy:55,rot:0,guest:true},{id:'coffee_table',gx:26,gy:55,rot:0},
  {id:'work_desk',gx:26,gy:49,rot:3},{id:'office_chair_blue',gx:26,gy:48,rot:0},{id:'work_desk',gx:29,gy:49,rot:3},{id:'office_chair_blue',gx:29,gy:48,rot:0},
  {id:'dual_monitor_desk',gx:32,gy:49,rot:3},{id:'office_chair_blue',gx:32,gy:48,rot:0},{id:'water_dispenser',gx:38,gy:50,rot:0},
  {id:'meeting_table',gx:35,gy:44,rot:0},{id:'bookshelf',gx:22,gy:43,rot:0},{id:'potted_plant',gx:41,gy:43,rot:0},{id:'potted_plant',gx:22,gy:52,rot:0},
  {id:'big_tree',gx:41,gy:55,rot:0},{id:'rug_blue',gx:24,gy:45,rot:0},{id:'decorative_blue_mark',gx:38,gy:55,rot:0}]},
 {id:'bot-moc',code:'AGN-MOCX',agency:'Mộc Studio',level:2,rep:260,jobs:41,likes:5,player:'15_CongB',staff:['08_Nganh','13_AB'],objs:[
  {id:'reception_counter',gx:30,gy:52,rot:0,locked:true},{id:'sofa_blue',gx:24,gy:55,rot:0,guest:true},
  {id:'editing_workstation',gx:25,gy:49,rot:3},{id:'office_chair_blue',gx:26,gy:48,rot:0},{id:'editing_workstation',gx:29,gy:49,rot:3},{id:'office_chair_blue',gx:30,gy:48,rot:0},
  {id:'green_screen',gx:35,gy:44,rot:0},{id:'softbox',gx:34,gy:44,rot:0},{id:'softbox',gx:38,gy:44,rot:0},{id:'camera_tripod',gx:36,gy:48,rot:0},
  {id:'pantry_counter',gx:22,gy:46,rot:0},{id:'water_dispenser',gx:38,gy:51,rot:0},{id:'potted_plant',gx:22,gy:43,rot:0},{id:'potted_plant',gx:41,gy:43,rot:0}]},
 {id:'bot-phuong',code:'AGN-HOAP',agency:'Hoa Phượng Media',level:4,rep:610,jobs:132,likes:20,player:'12_ADM',staff:['14_HM','10_Con_LT'],objs:[
  {id:'reception_counter',gx:30,gy:52,rot:0,locked:true},{id:'sofa_blue',gx:24,gy:55,rot:0,guest:true},
  {id:'work_desk',gx:26,gy:49,rot:3},{id:'office_chair_blue',gx:26,gy:48,rot:0},{id:'work_desk',gx:29,gy:49,rot:3},{id:'office_chair_blue',gx:29,gy:48,rot:0},
  {id:'round_table',gx:35,gy:46,rot:0},{id:'whiteboard',gx:34,gy:43,rot:0},{id:'bookshelf',gx:22,gy:43,rot:0},{id:'aquarium',gx:38,gy:55,rot:0},
  {id:'cat_house',gx:38,gy:50,rot:0},{id:'potted_plant',gx:41,gy:43,rot:0},{id:'big_tree',gx:22,gy:52,rot:0},{id:'premium_coffee',gx:40,gy:50,rot:0}]}];
function olMockBackend(){
 const db=()=>{let d=olLS(OL_MOCK_DB);if(!d||d.v!==1){d={v:1,seq:1,users:{},profiles:{},saves:{},offices:{},requests:[],friends:[],blocks:[],mail:[]};
   for(const b of OL_BOTS){d.users[b.id]={email:b.id+'@mau.local',bot:true};d.profiles[b.id]={id:b.id,code:b.code,agency:b.agency,look:{player:b.player},level:b.level,rep:b.rep,jobs:b.jobs,likes:b.likes};
    d.offices[b.id]={data:olBotOffice(b.player,b.agency,b.staff,b.objs)};}
   olLS(OL_MOCK_DB,d);}return d;};
 const put=d=>olLS(OL_MOCK_DB,d);
 const me=()=>{const u=olLS(OL_MOCK_SES);if(!u)throw Error('not_logged_in');return u;};
 const fail=c=>{throw Error(c);};
 const isFriend=(d,a,b)=>d.friends.some(f=>f[0]===a&&f[1]===b), isBlocked=(d,a,b)=>d.blocks.some(x=>(x[0]===a&&x[1]===b)||(x[0]===b&&x[1]===a));
 const nFriends=(d,a)=>d.friends.filter(f=>f[0]===a).length;
 const addMail=(d,m)=>{const row={id:d.seq++,day:olToday(),claimed:false,created_at:new Date().toISOString(),item:null,body:null,...m};d.mail.push(row);return row;};
 const pair=(d,to)=>{const u=me();if(to===u)fail('self');if(!isFriend(d,u,to))fail('not_friends');if(isBlocked(d,u,to))fail('blocked');return u;};
 const accept=(d,r)=>{r.status='accepted';for(const x of d.requests)if(x.from_id===r.to_id&&x.to_id===r.from_id&&x.status==='pending')x.status='accepted';
  if(!isFriend(d,r.from_id,r.to_id))d.friends.push([r.from_id,r.to_id],[r.to_id,r.from_id]);};
 // agency mẫu: chấp nhận lời mời ngay, mỗi ngày gửi 1 quà + đôi khi 1 lời nhắn cho bạn
 const BOT_NOTES=['Văn phòng bạn đẹp quá! Ghé chỗ mình chơi nhé.','Chúc agency mình nhiều job ngon hôm nay!','Cảm ơn quà hôm qua nha 🎁'];
 const botTick=d=>{let u;try{u=me();}catch(e){return;}
  for(const b of OL_BOTS){if(!isFriend(d,u,b.id))continue;
   if(!d.mail.some(m=>m.kind==='gift'&&m.from_id===b.id&&m.to_id===u&&m.day===olToday())){const g=olGiftsToday();addMail(d,{to_id:u,from_id:b.id,kind:'gift',item:g[(b.code.charCodeAt(4)+olToday().length)%g.length]});
    addMail(d,{to_id:u,from_id:b.id,kind:'note',body:BOT_NOTES[(d.seq+b.level)%BOT_NOTES.length]});}}};
 const prof=(d,id)=>d.profiles[id]?{...d.profiles[id]}:{id,agency:'(đã rời game)',code:'',level:1,likes:0};
 return {
  kind:'mock',
  async init(){db();return olLS(OL_MOCK_SES)?{id:olLS(OL_MOCK_SES),email:(db().users[olLS(OL_MOCK_SES)]||{}).email}:null;},
  async signUp(email,pw){const d=db();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))fail('bad_email');if(String(pw).length<6)fail('weak_pw');
   if(Object.values(d.users).some(u=>u.email===email))fail('email_taken');const id='u-'+Math.random().toString(36).slice(2,10);d.users[id]={email,pw:btoa(unescape(encodeURIComponent(pw)))};
   // lần đầu: Sao Mai gửi lời mời kết bạn để có sẵn việc thử
   d.requests.push({id:d.seq++,from_id:'bot-saomai',to_id:id,status:'pending',day:olToday()});put(d);olLS(OL_MOCK_SES,id);return {id,email};},
  async signIn(email,pw){const d=db();const e=Object.entries(d.users).find(([,u])=>u.email===email&&u.pw===btoa(unescape(encodeURIComponent(pw))));if(!e)fail('bad_login');olLS(OL_MOCK_SES,e[0]);return {id:e[0],email};},
  async signInOAuth(provider){const email=provider+'.thu@mau.local';const d=db();let e=Object.entries(d.users).find(([,u])=>u.email===email);
   if(!e){const id='u-'+provider+Math.random().toString(36).slice(2,7);d.users[id]={email,provider};d.requests.push({id:d.seq++,from_id:'bot-saomai',to_id:id,status:'pending',day:olToday()});put(d);e=[id];}
   olLS(OL_MOCK_SES,e[0]);return {id:e[0],email};},
  async signOut(){olLS(OL_MOCK_SES,null);},
  async getSave(){const d=db(),s=d.saves[me()];return s?{...s}:null;},
  async putSave(data,client_t,device){const d=db();d.saves[me()]={data,client_t,device,updated_at:new Date().toISOString()};put(d);},
  async myProfile(){const d=db();return d.profiles[me()]?{...d.profiles[me()]}:null;},
  async upsertProfile(p){const d=db(),u=me();let r=d.profiles[u];
   if(!r){const abc='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c;do{c='AGN-'+Array.from({length:4},()=>abc[Math.floor(Math.random()*abc.length)]).join('');}while(Object.values(d.profiles).some(x=>x.code===c));
    r=d.profiles[u]={id:u,code:c,likes:0};}
   Object.assign(r,{agency:p.agency,look:p.look,level:p.level,rep:p.rep,jobs:p.jobs});put(d);return {...r};},
  async putOffice(data){const d=db();d.offices[me()]={data};put(d);},
  async getOffice(id){const d=db(),u=me();if(id!==u&&(!isFriend(d,u,id)||isBlocked(d,u,id)))return null;return d.offices[id]?d.offices[id].data:null;},
  async friends(){const d=db(),u=me();botTick(d);put(d);return d.friends.filter(f=>f[0]===u).map(f=>prof(d,f[1]));},
  async requests(){const d=db(),u=me();return {incoming:d.requests.filter(r=>r.to_id===u&&r.status==='pending').map(r=>({id:r.id,from:prof(d,r.from_id)})),
   outgoing:d.requests.filter(r=>r.from_id===u&&r.status==='pending').map(r=>({id:r.id,to:prof(d,r.to_id)}))};},
  async addFriend(code){const d=db(),u=me();const t=Object.values(d.profiles).find(p=>p.code===String(code).trim().toUpperCase());if(!t)fail('code_not_found');
   if(t.id===u)fail('self');if(isBlocked(d,u,t.id))fail('blocked');if(isFriend(d,u,t.id))fail('already_friends');if(nFriends(d,u)>=50)fail('friend_limit');
   if(d.requests.filter(r=>r.from_id===u&&r.day===olToday()).length>=20)fail('request_limit');
   const rev=d.requests.find(r=>r.from_id===t.id&&r.to_id===u&&r.status==='pending');if(rev){accept(d,rev);put(d);return 'accepted';}
   let r=d.requests.find(r=>r.from_id===u&&r.to_id===t.id);if(r){if(r.status!=='pending'){r.status='pending';r.day=olToday();}}else{r={id:d.seq++,from_id:u,to_id:t.id,status:'pending',day:olToday()};d.requests.push(r);}
   if(d.users[t.id]&&d.users[t.id].bot){accept(d,r);put(d);return 'accepted';}
   put(d);return 'sent';},
  async respond(id,ok){const d=db(),u=me();const r=d.requests.find(r=>r.id===id&&r.to_id===u&&r.status==='pending');if(!r)fail('request_not_found');
   if(!ok){r.status='declined';put(d);return 'declined';}if(isBlocked(d,r.from_id,u))fail('blocked');if(nFriends(d,u)>=50||nFriends(d,r.from_id)>=50)fail('friend_limit');accept(d,r);put(d);return 'accepted';},
  async removeFriend(id){const d=db(),u=me();d.friends=d.friends.filter(f=>!((f[0]===u&&f[1]===id)||(f[0]===id&&f[1]===u)));d.requests=d.requests.filter(r=>!((r.from_id===u&&r.to_id===id)||(r.from_id===id&&r.to_id===u)));put(d);},
  async block(id){const d=db(),u=me();if(id===u)fail('self');if(!d.blocks.some(b=>b[0]===u&&b[1]===id))d.blocks.push([u,id]);put(d);await this.removeFriend(id);
   const d2=db();d2.mail=d2.mail.filter(m=>!(m.to_id===u&&m.from_id===id&&!(m.kind==='gift'&&!m.claimed)));put(d2);},
  async mail(){const d=db(),u=me();botTick(d);put(d);return d.mail.filter(m=>m.to_id===u).sort((a,b)=>b.id-a.id).slice(0,100).map(m=>({...m,from:prof(d,m.from_id)}));},
  async sentToday(id){const d=db(),u=me(),t=olToday(),s=d.mail.filter(m=>m.from_id===u&&m.to_id===id&&m.day===t);return {gift:s.some(m=>m.kind==='gift'),like:s.some(m=>m.kind==='like'),notes:s.filter(m=>m.kind==='note').length};},
  async sendGift(to,item){const d=db(),u=pair(d,to);if(![...OL_GIFT_DECOR,...OL_GIFT_RUBY].includes(item))fail('bad_gift');
   if(d.mail.some(m=>m.kind==='gift'&&m.from_id===u&&m.to_id===to&&m.day===olToday()))fail('gift_done_today');addMail(d,{to_id:to,from_id:u,kind:'gift',item});put(d);},
  async sendNote(to,body){const d=db(),u=pair(d,to),b=String(body??'').trim();if(b.length<1||b.length>140)fail('bad_note');
   if(d.mail.filter(m=>m.kind==='note'&&m.from_id===u&&m.to_id===to&&m.day===olToday()).length>=3)fail('note_limit');addMail(d,{to_id:to,from_id:u,kind:'note',body:b});put(d);},
  async sendLike(to){const d=db(),u=pair(d,to);if(d.mail.some(m=>m.kind==='like'&&m.from_id===u&&m.to_id===to&&m.day===olToday()))fail('like_done_today');
   addMail(d,{to_id:to,from_id:u,kind:'like'});if(d.profiles[to])d.profiles[to].likes++;put(d);},
  async claim(id){const d=db(),u=me(),m=d.mail.find(m=>m.id===id&&m.to_id===u&&m.kind==='gift'&&!m.claimed);if(!m)fail('not_claimable');m.claimed=true;put(d);return m.item;},
  async claimAll(){const d=db(),u=me(),out=[];for(const m of d.mail)if(m.to_id===u&&m.kind==='gift'&&!m.claimed){m.claimed=true;out.push({id:m.id,item:m.item});}put(d);return out;},
  async deleteMail(id){const d=db(),u=me();d.mail=d.mail.filter(m=>!(m.id===id&&m.to_id===u));put(d);},
  async deleteMyData(){const d=db(),u=me();d.mail=d.mail.filter(m=>m.to_id!==u&&m.from_id!==u);d.friends=d.friends.filter(f=>f[0]!==u&&f[1]!==u);
   d.requests=d.requests.filter(r=>r.from_id!==u&&r.to_id!==u);d.blocks=d.blocks.filter(b=>b[0]!==u&&b[1]!==u);delete d.offices[u];delete d.saves[u];delete d.profiles[u];put(d);}
 };
}

// ---------- Supabase ----------
function olSupabaseBackend(cfg){
 let sb=null,uid=null;
 const chk=r=>{if(r.error)throw Error(r.error.message||String(r.error));return r.data;};
 const me=()=>{if(!uid)throw Error('not_logged_in');return uid;};
 const profs=async ids=>{ids=[...new Set(ids)];if(!ids.length)return {};const rows=chk(await sb.from('profiles').select('id,code,agency,look,level,rep,jobs,likes').in('id',ids));
  const m=Object.fromEntries(rows.map(r=>[r.id,r]));for(const id of ids)if(!m[id])m[id]={id,agency:'(đã rời game)',code:'',level:1,likes:0};return m;};
 return {
  kind:'supabase',
  async init(){const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm');
   sb=mod.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   const {data}=await sb.auth.getSession();uid=data.session?.user?.id||null;
   sb.auth.onAuthStateChange((_e,s)=>{const n=s?.user?.id||null;if(n!==uid){uid=n;olOnAuth(n?{id:n,email:s.user.email}:null);}});
   return uid?{id:uid,email:data.session.user.email}:null;},
  async signUp(email,pw){const d=chk(await sb.auth.signUp({email,password:pw,options:{emailRedirectTo:location.href.split('#')[0]}}));uid=d.user&&d.session?d.user.id:null;
   if(!d.session)return {pending:true};return {id:d.user.id,email};},
  async signIn(email,pw){const r=await sb.auth.signInWithPassword({email,password:pw});if(r.error)throw Error(/Invalid login/i.test(r.error.message)?'bad_login':r.error.message);uid=r.data.user.id;return {id:uid,email};},
  async signInOAuth(provider){
   const response=await fetch(cfg.url+'/auth/v1/settings',{headers:{apikey:cfg.anonKey},signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Chưa kiểm tra được đăng nhập. Thử lại sau.');
   const settings=await response.json();
   if(settings.external?.[provider]!==true)throw Error((provider==='google'?'Google':'Facebook')+' chưa bật. Hãy tạo tài khoản bằng email.');
   chk(await sb.auth.signInWithOAuth({provider,options:{redirectTo:location.href.split('#')[0]}}));return {redirect:true};},
  async signOut(){chk(await sb.auth.signOut());uid=null;},
  async getSave(){return chk(await sb.from('saves').select('data,client_t,device,updated_at').eq('id',me()).maybeSingle());},
  async putSave(data,client_t,device){chk(await sb.from('saves').upsert({id:me(),data,client_t,device,updated_at:new Date().toISOString()}));},
  async myProfile(){return chk(await sb.from('profiles').select('*').eq('id',me()).maybeSingle());},
  async upsertProfile(p){const u=me(),row={agency:p.agency,look:p.look,level:p.level,rep:p.rep,jobs:p.jobs};
   const have=chk(await sb.from('profiles').select('id').eq('id',u).maybeSingle());
   if(have)chk(await sb.from('profiles').update({...row,updated_at:new Date().toISOString()}).eq('id',u));else chk(await sb.from('profiles').insert({id:u,...row}));
   return this.myProfile();},
  async putOffice(data){chk(await sb.from('offices').upsert({id:me(),data,updated_at:new Date().toISOString()}));},
  async getOffice(id){const r=chk(await sb.from('offices').select('data').eq('id',id).maybeSingle());return r?r.data:null;},
  async friends(){const rows=chk(await sb.from('friendships').select('b').eq('a',me()));const m=await profs(rows.map(r=>r.b));return rows.map(r=>m[r.b]);},
  async requests(){const u=me(),rows=chk(await sb.from('friend_requests').select('id,from_id,to_id').eq('status','pending').or(`from_id.eq.${u},to_id.eq.${u}`));
   const m=await profs(rows.flatMap(r=>[r.from_id,r.to_id]));
   return {incoming:rows.filter(r=>r.to_id===u).map(r=>({id:r.id,from:m[r.from_id]})),outgoing:rows.filter(r=>r.from_id===u).map(r=>({id:r.id,to:m[r.to_id]}))};},
  async addFriend(code){return chk(await sb.rpc('send_friend_request',{p_code:code}));},
  async respond(id,ok){return chk(await sb.rpc('respond_friend_request',{p_id:id,p_accept:ok}));},
  async removeFriend(id){chk(await sb.rpc('remove_friend',{p_other:id}));},
  async block(id){chk(await sb.rpc('block_user',{p_other:id}));},
  async mail(){const rows=chk(await sb.from('mail').select('*').eq('to_id',me()).order('created_at',{ascending:false}).limit(100));const m=await profs(rows.map(r=>r.from_id));return rows.map(r=>({...r,from:m[r.from_id]}));},
  async sentToday(id){const s=chk(await sb.from('mail').select('kind').eq('from_id',me()).eq('to_id',id).eq('day',olToday()));return {gift:s.some(m=>m.kind==='gift'),like:s.some(m=>m.kind==='like'),notes:s.filter(m=>m.kind==='note').length};},
  async sendGift(to,item){chk(await sb.rpc('send_gift',{p_to:to,p_item:item}));},
  async sendNote(to,body){chk(await sb.rpc('send_note',{p_to:to,p_body:body}));},
  async sendLike(to){chk(await sb.rpc('send_like',{p_to:to}));},
  async claim(id){return chk(await sb.rpc('claim_mail',{p_id:id}));},
  async claimAll(){return chk(await sb.rpc('claim_all_mail'));},
  async deleteMail(id){chk(await sb.from('mail').delete().eq('id',id));},
  async deleteMyData(){chk(await sb.rpc('delete_my_data'));}
 };
}

// ---------- trạng thái ----------
const OL={be:null,user:null,profile:null,status:'off',dirty:false,lastPush:0,pushing:false,timer:0,friends:[],req:{incoming:[],outgoing:[]},mail:[],lastDay:0,officeSig:''};
function olMode(){if(VISIT&&VISIT.mode)return VISIT.mode;const m=olLS(OL_MODE_KEY);if(m==='mock')return 'mock';return ONLINE_CFG&&ONLINE_CFG.url?'supabase':'off';}
async function olInit(){
 const mode=olMode();OL.be=mode==='mock'?olMockBackend():mode==='supabase'?olSupabaseBackend(ONLINE_CFG):null;
 olRenderAccount();updateOnlineBadges();
 if(!OL.be)return;
 try{OL.user=await OL.be.init();}catch(e){OL.status='offline';olRenderAccount();return;}
 if(OL.user)await olOnAuth(OL.user,true);else olRenderAccount();
}
async function olOnAuth(user,boot){
 OL.user=user;OL.profile=null;if(user)olLS(GUEST_SESSION,null);
 if(!user){OL.status='off';OL.friends=[];OL.mail=[];OL.req={incoming:[],outgoing:[]};olRenderAccount();updateOnlineBadges();olSetCloud();return;}
 if(VISIT){olRefreshSocial();return;}
 const meta=olLS(OL_META_KEY)||{};
 try{
  const cloud=await OL.be.getSave();
  let raw=null;try{raw=localStorage.getItem(SAVE);}catch(e){}
  const local=raw?JSON.parse(raw):null,localT=local&&local.t||0;
  const sameAcct=meta.uid===user.id;
  if(cloud&&cloud.data&&(!sameAcct||(cloud.device!==olDevice()&&cloud.client_t>localT+5000))&&!(sameAcct&&cloud.client_t<=localT)){
   const c=cloud.data,cg=c.gs||{},lg=local&&local.gs||{};
   const line=(g,o)=>`Ngày ${g.day||1} · cấp ${(o.unlocked||[]).length+1} · ${fmt(Math.round((o.cash||0)*10)/10)} · ${g.done||0} job`;
   const useCloud=await askConfirm({title:'Chọn tiến độ',icon:'mail',ok:'Dùng bản trên tài khoản',cancel:local?'Giữ bản trên máy này':null,
    html:`<p>Tài khoản này đã có tiến độ khác với máy này.</p><ul class="ask-list"><li><b>Trên tài khoản:</b> ${olEsc(line(cg,c))}</li>${local?`<li><b>Trên máy này:</b> ${olEsc(line(lg,local))}</li>`:''}</ul><p class="hub-note">Bản không chọn sẽ bị thay thế. Muốn giữ cả hai, hãy vào Cài đặt → Tải bản lưu trước.</p>`});
   if(useCloud||!local){olLS(OL_META_KEY,{...meta,uid:user.id});importGameSave(JSON.stringify(c));toast('Đang tải tiến độ từ tài khoản…','ok');setTimeout(()=>location.reload(),600);return;}
  }
  olLS(OL_META_KEY,{...meta,uid:user.id});
  await olPush(true);
  if(!boot)toast('Đã đăng nhập · tiến độ được lưu lên tài khoản','ok');
 }catch(e){OL.status='offline';toast(olErrText(e),'err');}
 olRenderAccount();olRefreshSocial();
}
// Ảnh văn phòng để bạn bè tham quan: chỉ bố cục, đồ, nhân sự, trang phục — không có tiền, job, công nợ.
function olOfficeSnapshot(){
 const keep=['player','agencyName','staffIds','homeSeats','equippedSkins','ownedSkins','day'];
 const gs={jobs:[],offers:[],min:600,starterApplied:true,tourDone:true,guideSeen:true,uiV15Seen:true,introPending:false};
 for(const k of keep)if(GS[k]!==undefined)gs[k]=JSON.parse(JSON.stringify(GS[k]));
 return {cash:0,ws:WS,ds:DS,fl:FL,unlocked:[...UNLOCKED],t:0,objs:OBJS.map(o=>({...o})),cells:G.map(r=>r.map(v=>v===1?1:v===2?2:0).join('')),gs};
}
function olProfileData(){return {agency:agencyName().slice(0,40),look:{player:GS.player&&GS.player.id,custom:GS.player&&GS.player.kind==='custom'?GS.player.look:undefined},level:lvl(),rep:Math.round(GS.reputation&&GS.reputation.points||0),jobs:GS.done||0};}
async function olPush(force){
 if(!OL.be||!OL.user||VISIT||OL.pushing)return;
 if(!force&&Date.now()-OL.lastPush<OL_PUSH_EVERY){OL.dirty=true;clearTimeout(OL.timer);OL.timer=setTimeout(()=>olPush(true),OL_PUSH_EVERY-(Date.now()-OL.lastPush));return;}
 let raw=null;try{raw=localStorage.getItem(SAVE);}catch(e){}
 if(!raw)return;
 OL.pushing=true;olSetCloud('saving');
 try{
  const data=JSON.parse(raw);
  await OL.be.putSave(data,data.t||Date.now(),olDevice());
  OL.profile=await OL.be.upsertProfile(olProfileData());
  const snap=olOfficeSnapshot(),sig=JSON.stringify(snap);
  if(sig!==OL.officeSig){await OL.be.putOffice(snap);OL.officeSig=sig;}
  OL.lastPush=Date.now();OL.dirty=false;olSetCloud('saved');OL.status='on';
 }catch(e){olSetCloud('offline');OL.status='offline';}
 OL.pushing=false;olRenderAccount();
}
// gọi sau mỗi lần save() thành công
function onlineAfterSave(){
 const guest=olLS(GUEST_SESSION);if(guest&&!OL.user){const users=olLS(GUEST_USERS)||{};if(users[guest]){users[guest].save=localStorage.getItem(SAVE);olLS(GUEST_USERS,users);}}
 if(!OL.user||VISIT)return;
 const dayChanged=OL.lastDay&&GS.day!==OL.lastDay;OL.lastDay=GS.day;
 olPush(document.hidden||dayChanged);
}
function olSetCloud(st){
 const el=document.getElementById('cloudSt');if(!el)return;
 if(st)OL.cloud=st;const s=OL.user?OL.cloud||'saved':'';
 el.hidden=!s;el.dataset.st=s;
 const t={saving:'Đang lưu lên tài khoản…',saved:'Đã lưu trên tài khoản',offline:'Chưa lưu được lên tài khoản (ngoại tuyến) · vẫn lưu trên máy này'}[s]||'';
 el.title=t;el.setAttribute('aria-label',t);
}
async function olRefreshSocial(){
 if(!OL.be||!OL.user)return;
 try{
  const [f,r,m]=await Promise.all([OL.be.friends(),OL.be.requests(),OL.be.mail()]);
  OL.friends=f;OL.req=r;OL.mail=m;OL.status=VISIT?OL.status:'on';
 }catch(e){OL.status='offline';}
 updateOnlineBadges();
 if(hubKey==='friends'||hubKey==='news'){const p=hubPage();if(p==='pFriends')renderFriends();else if(p==='pRequests')renderRequests();else if(p==='pMail')renderMail();updateHubTabs();}
}
function olUnclaimed(){return OL.mail.filter(m=>m.kind==='gift'&&!m.claimed).length;}
function olUnseenMail(){const seen=(olLS(OL_META_KEY)||{}).mailSeen||0;return OL.mail.filter(m=>m.id>seen&&!(m.kind==='gift'&&!m.claimed)).length+olUnclaimed();}
function updateOnlineBadges(){
 const show=(id,v)=>{const b=document.getElementById(id);if(!b)return;b.textContent=v||'';b.style.display=v?'flex':'none';};
 show('friendBadge',OL.user?OL.req.incoming.length:0);
 show('mailBadge',OL.user?olUnseenMail():0);
}

// ---------- giao diện: hộp thoại chung ----------
function olBox(html,onMount){
 const box=document.getElementById('olBox');box.querySelector('.ol-body').innerHTML=html;box.hidden=false;
 const close=()=>{box.hidden=true;box.onkeydown=null;};
 box.onclick=e=>{if(e.target===box||e.target.closest('[data-ol-close]'))close();};
 box.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};
 onMount&&onMount(box.querySelector('.ol-body'),close);
 setTimeout(()=>box.querySelector('input,button.g,button')?.focus(),30);
 return close;
}
function olServerLabel(){const m=olMode();return m==='supabase'?'Máy chủ Supabase':m==='mock'?'Máy chủ thử trên máy này (chỉ để chơi thử)':'Chưa kết nối máy chủ';}
const GUEST_USERS='agency.guest.users',GUEST_SESSION='agency.guest.session';
async function guestDigest(password,salt){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return Array.from(new Uint8Array(bits),v=>v.toString(16).padStart(2,'0')).join('');
}
async function guestLogin(name,password,create){
 name=name.trim().toLowerCase();if(!/^[a-z0-9_-]{3,32}$/.test(name))throw Error('Tên gồm 3–32 chữ không dấu, số hoặc gạch dưới.');
 if(['__proto__','constructor','prototype'].includes(name))throw Error('Tên này không dùng được.');
 if(password.length<6)throw Error('weak_pw');
 const users=olLS(GUEST_USERS)||{};let row=Object.hasOwn(users,name)?users[name]:null;
 if(create){if(row)throw Error('Tên này đã được dùng.');const salt=crypto.randomUUID();row={salt,hash:await guestDigest(password,salt),save:null};}
 else if(!row||row.hash!==await guestDigest(password,row.salt))throw Error('Tên hoặc mật khẩu chưa đúng.');
 if(OL.user){await olPush(true);await OL.be.signOut();await olOnAuth(null);}
 const previous=olLS(GUEST_SESSION),raw=localStorage.getItem(SAVE);
 if(previous&&users[previous])users[previous].save=raw;
 if(!previous&&raw)localStorage.setItem(SAVE+'.before-guest',raw);
 if(create)row.save=raw;
 users[name]=row;localStorage.setItem(GUEST_USERS,JSON.stringify(users));
 if(row.save)localStorage.setItem(SAVE,row.save);
 localStorage.setItem(GUEST_SESSION,JSON.stringify(name));location.reload();
}
function openLogin(){
 olBox(`<h2>Vào agency</h2><div class="cg2">Chơi khách · lưu trên máy này</div><label class="ol-f">Tên đăng nhập<input id="guestName" autocomplete="username" maxlength="32"></label><label class="ol-f">Mật khẩu<input id="guestPassword" type="password" autocomplete="current-password"></label><p class="ol-err" id="guestError" role="alert"></p><div class="ask-act"><button class="btn y" id="guestCreate">Tạo khách</button><button class="btn g" id="guestLogin">Vào chơi</button></div><div class="cg2">Tài khoản online</div><div class="ol-oauth"><button class="btn b" id="loginFacebook">Facebook</button><button class="btn b" id="loginEmail">Email</button></div>`,el=>{
 const run=async create=>{const buttons=el.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{await guestLogin(el.querySelector('#guestName').value,el.querySelector('#guestPassword').value,create);}catch(e){el.querySelector('#guestError').textContent=olErrText(e);}finally{buttons.forEach(b=>b.disabled=false);}};
 el.querySelector('#guestCreate').onclick=()=>run(true);el.querySelector('#guestLogin').onclick=()=>run(false);
 el.querySelector('#loginEmail').onclick=openEmailLogin;
 el.querySelector('#loginFacebook').onclick=async()=>{try{if(!OL.be)throw Error('no_server');await OL.be.signInOAuth('facebook');}catch(e){el.querySelector('#guestError').textContent=olErrText(e);}};
 });
}
function openEmailLogin(){
 if(!OL.be){toast(OL_ERR.no_server,'err');return;}
 const mock=OL.be.kind==='mock';
 olBox(`<h2>Đăng nhập</h2><p class="hub-note">${olEsc(olServerLabel())}. Đăng nhập để lưu tiến độ lên tài khoản, kết bạn, tham quan và tặng quà. Không đăng nhập vẫn chơi bình thường.</p>
  <div class="cg2">Đăng nhập bằng email</div>
  <label class="ol-f">Email<input id="olEmail" type="email" autocomplete="email" maxlength="120"></label>
  <label class="ol-f">Mật khẩu<input id="olPw" type="password" autocomplete="current-password" maxlength="72"></label>
  <p class="ol-err" id="olErr" role="alert"></p>
  <div class="ask-act"><button class="btn c" data-ol-close>Để sau</button><button class="btn y" id="olUp">Tạo tài khoản</button><button class="btn g" id="olIn">Đăng nhập</button></div>
  ${mock?'<p class="hub-note">Máy chủ thử: tài khoản chỉ nằm trong trình duyệt này; Google/Facebook ở đây là tài khoản mẫu.</p>':'<p class="hub-note">Phiên đăng nhập được giữ trên trình duyệt này.</p>'}`,
 (el,close)=>{
  const err=m=>{el.querySelector('#olErr').textContent=m;};
  const run=async fn=>{err('');el.querySelectorAll('button').forEach(b=>b.disabled=true);
   try{const u=await fn();if(u&&u.redirect)return;if(u&&u.pending){err('Đã gửi email xác nhận. Mở email, bấm liên kết rồi đăng nhập lại.');return;}close();await olOnAuth(u);}
   catch(e){err(olErrText(e));}finally{el.querySelectorAll('button').forEach(b=>b.disabled=false);}};
  const email=()=>el.querySelector('#olEmail').value.trim(),pw=()=>el.querySelector('#olPw').value;
  el.querySelector('#olIn').onclick=()=>run(()=>OL.be.signIn(email(),pw()));
  el.querySelector('#olUp').onclick=()=>run(()=>OL.be.signUp(email(),pw()));
  el.querySelector('#olPw').onkeydown=e=>{if(e.key==='Enter')el.querySelector('#olIn').click();};
  el.querySelectorAll('[data-oauth]').forEach(b=>b.onclick=()=>run(()=>OL.be.signInOAuth(b.dataset.oauth)));
 });
}
async function olLogout(){
 if(!await askConfirm({title:'Đăng xuất?',text:'Tiến độ vẫn giữ trên máy này và trên tài khoản. Đăng nhập lại để tiếp tục lưu lên tài khoản.',ok:'Đăng xuất',icon:'people'}))return;
 await olPush(true);try{await OL.be.signOut();}catch(e){toast(olErrText(e),'err');return;}
 await olOnAuth(null);closeHub();if(guideOpen)closeGuide();
 try{sessionStorage.removeItem(SAVE+'.enter');sessionStorage.removeItem(OL_VISIT_KEY);}catch(e){}
 if(VISIT){location.reload();return;}
 openTitle();toast('Đã đăng xuất','ok');
}
// Cài đặt → Tài khoản
function olRenderAccount(){
 const exportButton=document.getElementById('bExportSave');if(exportButton)exportButton.hidden=!!OL.user;
 const note=document.getElementById('saveModeNote');if(note)note.textContent=OL.user?'Tiến độ tự động lưu lên tài khoản. Khi mất mạng, game giữ bản lưu trên máy và thử đồng bộ lại.':'Chơi khách: lưu bản chơi ra file để giữ dự phòng hoặc chuyển máy.';
 const el=document.getElementById('setAccount');if(!el)return;
 const m=olMode(),u=OL.user,p=OL.profile;
 let h=`<div class="cg2">Tài khoản</div><div class="row"><span>Máy chủ</span><b>${olEsc(olServerLabel())}</b></div>`;
 if(u){h+=`<div class="row"><span>Đăng nhập</span><b>${olEsc(u.email||'')}</b></div>`+(p?`<div class="row"><span>Mã bạn</span><b class="ol-code">${olEsc(p.code)}</b></div>`:'')
  +`<div class="row"><span>Tự động lưu</span><b>${OL.cloud==='saving'?'Đang đồng bộ…':OL.cloud==='offline'?'Chờ kết nối lại':OL.lastPush?'Đã lưu lúc '+new Date(OL.lastPush).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'Đang chờ'}</b></div>`
  +`<button class="btn c" id="olOut">Đăng xuất</button>`;}
 else if(olLS(GUEST_SESSION))h+=`<div class="row"><span>Khách</span><b>${olEsc(olLS(GUEST_SESSION))}</b></div><button class="btn c" id="guestOut">Đăng xuất khách</button>`;
 if(!u&&OL.be)h+=`<button class="btn g" id="olLogin">Đăng nhập / tạo tài khoản</button>`;
 if(m!=='supabase'||olLS(OL_MODE_KEY)==='mock')h+=`<label class="tg"><input type="checkbox" id="olMock"${m==='mock'?' checked':''}> Dùng máy chủ thử trên máy này (chơi thử bạn bè, quà)</label>`;
 if(u)h+=`<button class="btn rd" id="olWipe">Xóa dữ liệu online của tôi</button>`;
 el.innerHTML=h;
 const on=(id,f)=>{const b=el.querySelector('#'+id);if(b)b.onclick=f;};
 on('guestOut',()=>{save();olLS(GUEST_SESSION,null);closeHub();openTitle();olRenderAccount();});on('olLogin',openLogin);on('olOut',olLogout);
 on('olWipe',async()=>{if(!await askConfirm({title:'Xóa dữ liệu online?',text:'Xóa bản lưu trên tài khoản, hồ sơ, bạn bè và thư. Tiến độ trên máy này vẫn giữ.',ok:'Xóa',danger:true,icon:'lock'}))return;
  try{await OL.be.deleteMyData();await OL.be.signOut();}catch(e){toast(olErrText(e),'err');return;}olLS(OL_META_KEY,null);await olOnAuth(null);toast('Đã xóa dữ liệu online','ok');});
 const mk=el.querySelector('#olMock');if(mk)mk.onchange=async()=>{if(OL.user){try{await OL.be.signOut();}catch(e){}}olLS(OL_MODE_KEY,mk.checked?'mock':null);OL.user=null;await olInit();if(mk.checked)openLogin();};
}

// ---------- Bạn bè (nút góc trên phải) ----------
function olNeedLogin(el){el.innerHTML=`<p class="hub-note">${OL.be?'Đăng nhập để kết bạn, tham quan văn phòng của bạn bè và tặng quà.':'Bản này chưa kết nối máy chủ. Vào Cài đặt → Tài khoản để bật máy chủ thử.'}</p>${OL.be?'<button class="btn g" data-ol-login>Đăng nhập</button>':'<button class="btn b" data-ol-set>Mở Cài đặt</button>'}`;
 el.querySelector('[data-ol-login]')?.addEventListener('click',openLogin);el.querySelector('[data-ol-set]')?.addEventListener('click',()=>openHub('settings'));}
function olFriendRow(p,acts){return `<div class="ol-row"><span class="ol-av">${olAvatar(p)}</span><span class="ol-who"><b>${olEsc(p.agency)}</b><small>LV ${p.level||1} · ❤ ${p.likes||0}${p.code?' · '+olEsc(p.code):''}</small></span><span class="ol-act">${acts}</span></div>`;}
function olAvatar(p){const id=p&&p.look&&p.look.player,c=CHARS.find(c=>c.id===id&&!c.custom);return c?`<i style="background-image:url('${CHAR_BASE_SRC[c.id]||c.src}')"></i>`:UIIMG('people',28);}
function renderFriends(){
 const el=document.getElementById('friendsBody');if(!el)return;
 if(!OL.user)return olNeedLogin(el);
 const my=OL.profile;
 el.innerHTML=`<div class="ol-me"><span>Mã bạn của bạn</span><b class="ol-code">${olEsc(my?my.code:'…')}</b><button class="btn c" id="olCopy">Sao chép</button></div>
  <div class="ol-add"><input id="olCode" maxlength="8" placeholder="Nhập mã bạn, ví dụ AGN-7K2Q" aria-label="Mã bạn"><button class="btn g" id="olAdd">Kết bạn</button></div><p class="ol-err" id="olAddErr" role="alert"></p>
  <div class="cg2">Bạn bè (${OL.friends.length}/50)</div>
  ${OL.friends.length?OL.friends.map(p=>olFriendRow(p,`<button class="btn y" data-visit="${olEsc(p.id)}">Tham quan</button><button class="btn c ol-more" data-more="${olEsc(p.id)}" aria-label="Tùy chọn">⋯</button>`)).join(''):'<p class="hub-note">Chưa có bạn. Gửi mã bạn của bạn cho đồng nghiệp, hoặc nhập mã của họ ở trên.</p>'}
  ${olMode()==='mock'?'<p class="hub-note">Máy chủ thử có 3 agency mẫu: AGN-SAOM, AGN-MOCX, AGN-HOAP.</p>':''}`;
 el.querySelector('#olCopy').onclick=()=>{try{navigator.clipboard.writeText(my.code);toast('Đã sao chép mã bạn','ok');}catch(e){toast('Mã bạn: '+(my&&my.code),'ok');}};
 const add=async()=>{const code=el.querySelector('#olCode').value.trim().toUpperCase(),er=el.querySelector('#olAddErr');er.textContent='';
  if(!/^AGN-[A-Z0-9]{4}$/.test(code)){er.textContent='Mã bạn có dạng AGN-XXXX.';return;}
  try{const r=await OL.be.addFriend(code);toast(r==='accepted'?'Đã thành bạn!':'Đã gửi lời mời kết bạn','ok');el.querySelector('#olCode').value='';await olRefreshSocial();}catch(e){er.textContent=olErrText(e);}};
 el.querySelector('#olAdd').onclick=add;el.querySelector('#olCode').onkeydown=e=>{if(e.key==='Enter')add();};
 el.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>olVisit(b.dataset.visit));
 el.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>olFriendMenu(OL.friends.find(f=>f.id===b.dataset.more)));
}
function olFriendMenu(p){if(!p)return;
 olBox(`<h2>${olEsc(p.agency)}</h2><p class="hub-note">LV ${p.level||1} · ${p.jobs||0} job đã xong · ❤ ${p.likes||0}</p><div class="ol-menu"><button class="btn y" data-a="visit">Tham quan</button><button class="btn c" data-a="remove">Xóa bạn</button><button class="btn rd" data-a="block">Chặn</button></div><div class="ask-act"><button class="btn c" data-ol-close>Đóng</button></div>`,(el,close)=>{
  el.querySelector('[data-a="visit"]').onclick=()=>{close();olVisit(p.id);};
  el.querySelector('[data-a="remove"]').onclick=async()=>{close();if(!await askConfirm({title:'Xóa bạn?',text:`Xóa ${p.agency} khỏi danh sách bạn. Hai bên không xem văn phòng và gửi quà cho nhau được nữa.`,ok:'Xóa bạn',danger:true}))return;try{await OL.be.removeFriend(p.id);toast('Đã xóa bạn','ok');olRefreshSocial();}catch(e){toast(olErrText(e),'err');}};
  el.querySelector('[data-a="block"]').onclick=async()=>{close();if(!await askConfirm({title:'Chặn agency này?',text:`${p.agency} sẽ không kết bạn, nhắn tin hay tặng quà cho bạn được. Lời nhắn cũ của họ bị xóa.`,ok:'Chặn',danger:true}))return;try{await OL.be.block(p.id);toast('Đã chặn','ok');olRefreshSocial();}catch(e){toast(olErrText(e),'err');}};
 });
}
function renderRequests(){
 const el=document.getElementById('requestsBody');if(!el)return;
 if(!OL.user)return olNeedLogin(el);
 const inc=OL.req.incoming,out=OL.req.outgoing;
 el.innerHTML=`<div class="cg2">Lời mời đến (${inc.length})</div>${inc.length?inc.map(r=>olFriendRow(r.from,`<button class="btn g" data-acc="${r.id}">Đồng ý</button><button class="btn c" data-dec="${r.id}">Từ chối</button>`)).join(''):'<p class="hub-note">Không có lời mời mới.</p>'}
  <div class="cg2">Đã gửi, đang chờ (${out.length})</div>${out.length?out.map(r=>olFriendRow(r.to,'<small>Đang chờ</small>')).join(''):'<p class="hub-note">Không có.</p>'}`;
 const act=async(id,ok)=>{try{const r=await OL.be.respond(id,ok);toast(r==='accepted'?'Đã thành bạn!':'Đã từ chối','ok');await olRefreshSocial();}catch(e){toast(olErrText(e),'err');}};
 el.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>act(+b.dataset.acc,true));
 el.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>act(+b.dataset.dec,false));
}

// ---------- Hộp thư → Thư ----------
function olGiveGift(item,from){
 const r=/^ruby_(\d)$/.exec(item);
 if(r){GS.gems+=+r[1];return `${r[1]} ruby`;}
 if(FBY[item]&&addToStore(item,1,'reward',`Quà từ ${from}`))return `${FBY[item].name} (vào Kho)`;
 if(FBY[item]){const v=storeValue(item);cash=Math.round((cash+v)*100)/100;return `${fmt(v)} (Kho đã đầy món này)`;}
 return null;
}
function renderMail(){
 const el=document.getElementById('mailBody');if(!el)return;
 if(!OL.user)return olNeedLogin(el);
 const meta=olLS(OL_META_KEY)||{},maxId=OL.mail.reduce((m,x)=>Math.max(m,x.id),0);
 if(maxId>(meta.mailSeen||0)){olLS(OL_META_KEY,{...meta,mailSeen:maxId});}
 const n=olUnclaimed();
 const row=m=>{const who=olEsc(m.from.agency),when=olEsc(m.day||'');
  if(m.kind==='gift')return `<div class="ol-row ol-mail${m.claimed?' done':''}"><span class="ol-av">${olGiftIcon(m.item,30)}</span><span class="ol-who"><b>${who} tặng bạn ${olEsc(olGiftName(m.item))}</b><small>${when}${m.claimed?' · đã nhận':''}</small></span><span class="ol-act">${m.claimed?'':`<button class="btn g" data-claim="${m.id}">Nhận</button>`}</span></div>`;
  if(m.kind==='like')return `<div class="ol-row ol-mail"><span class="ol-av">${UIIMG('heart',28)}</span><span class="ol-who"><b>${who} đã thích văn phòng của bạn</b><small>${when}</small></span><span class="ol-act"><button class="btn c" data-del="${m.id}" aria-label="Xóa thư">✕</button></span></div>`;
  return `<div class="ol-row ol-mail"><span class="ol-av">${UIIMG('mail',28)}</span><span class="ol-who"><b>${who}</b><small>${when}</small><span class="ol-note"></span></span><span class="ol-act"><button class="btn c" data-del="${m.id}" aria-label="Xóa thư">✕</button></span></div>`;};
 el.innerHTML=`${n?`<div class="ol-claimall"><span>${n} quà chưa nhận</span><button class="btn g" id="olClaimAll">Nhận tất cả</button></div>`:''}
  ${OL.mail.length?OL.mail.map(row).join(''):'<p class="hub-note">Chưa có thư. Quà, lời nhắn và lượt thích của bạn bè sẽ đến đây.</p>'}`;
 // lời nhắn là nội dung người dùng viết: gán bằng textContent
 el.querySelectorAll('.ol-note').forEach((s,i)=>{const notes=OL.mail.filter(m=>m.kind==='note');s.textContent=notes[i]?notes[i].body:'';});
 el.querySelectorAll('[data-claim]').forEach(b=>b.onclick=async()=>{b.disabled=true;const id=+b.dataset.claim,m=OL.mail.find(x=>x.id===id);
  try{const it=await OL.be.claim(id);const got=olGiveGift(it,m.from.agency);m.claimed=true;hud();save();renderStore?.();updateHubBadges();toast(`Đã nhận: ${got}`,'ok');}catch(e){toast(olErrText(e),'err');}
  renderMail();updateOnlineBadges();updateHubTabs();});
 el.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{try{await OL.be.deleteMail(+b.dataset.del);OL.mail=OL.mail.filter(x=>x.id!==+b.dataset.del);renderMail();updateOnlineBadges();}catch(e){toast(olErrText(e),'err');}});
 const ca=el.querySelector('#olClaimAll');if(ca)ca.onclick=async()=>{ca.disabled=true;
  try{const rows=await OL.be.claimAll();const got=[];for(const r of rows){const m=OL.mail.find(x=>x.id===r.id);if(m)m.claimed=true;const g=olGiveGift(r.item,m?m.from.agency:'bạn bè');if(g)got.push(g);}
   hud();save();updateHubBadges();toast(got.length?`Đã nhận ${got.length} quà: ${got.join(', ')}`:'Không còn quà chưa nhận','ok');}catch(e){toast(olErrText(e),'err');}
  renderMail();updateOnlineBadges();updateHubTabs();};
 updateOnlineBadges();
}

// ---------- Tham quan ----------
async function olVisit(id){
 if(!OL.user)return openLogin();
 const p=OL.friends.find(f=>f.id===id);
 try{const data=await OL.be.getOffice(id);if(!data){toast('Bạn này chưa có văn phòng để tham quan (chưa lưu lên tài khoản).','err');return;}
  const raw=JSON.stringify({...data,t:Date.now(),cash:0});parseGameSave(raw);   // kiểm tra trước khi tải
  save();await olPush(true);
  sessionStorage.setItem(OL_VISIT_KEY,JSON.stringify({id,player:p&&p.look&&p.look.player,agency:p?p.agency:'Bạn bè',level:p?p.level:1,likes:p?p.likes:0,mode:olMode(),raw}));
  location.reload();
 }catch(e){toast(e&&/Invalid/.test(e.message)?'Văn phòng của bạn này chưa đọc được.':olErrText(e),'err');}
}
function olLeaveVisit(){try{sessionStorage.removeItem(OL_VISIT_KEY);}catch(e){}location.reload();}
function olSetupVisit(){
 if(!VISIT)return;
 document.body.classList.add('visiting');
 const bar=document.getElementById('visitBar');bar.hidden=false;
 bar.querySelector('.vb-name').textContent=VISIT.agency;bar.querySelector('.vb-ic').innerHTML=olAvatar({look:{player:VISIT.player}});bar.querySelector('.vb-sub').textContent=`LV ${VISIT.level||1} · ❤ ${VISIT.likes||0} · chỉ xem`;
 bar.querySelector('[data-vb="home"]').onclick=olLeaveVisit;
 bar.querySelector('[data-vb="like"]').onclick=async()=>{try{await OL.be.sendLike(VISIT.id);VISIT.likes=(VISIT.likes||0)+1;bar.querySelector('.vb-sub').textContent=`LV ${VISIT.level||1} · ❤ ${VISIT.likes} · chỉ xem`;toast('Đã thích văn phòng này ❤','ok');olVisitButtons();}catch(e){toast(olErrText(e),'err');}};
 bar.querySelector('[data-vb="note"]').onclick=()=>olBox(`<h2>Lời nhắn cho ${olEsc(VISIT.agency)}</h2><textarea id="olNote" maxlength="140" rows="3" placeholder="Tối đa 140 ký tự"></textarea><p class="hub-note"><span id="olNoteN">0</span>/140 · tối đa 3 lời nhắn mỗi ngày cho mỗi bạn</p><p class="ol-err" id="olErr" role="alert"></p><div class="ask-act"><button class="btn c" data-ol-close>Hủy</button><button class="btn g" id="olSend">Gửi</button></div>`,(el,close)=>{
  const ta=el.querySelector('#olNote');ta.oninput=()=>{el.querySelector('#olNoteN').textContent=ta.value.length;};
  el.querySelector('#olSend').onclick=async()=>{try{await OL.be.sendNote(VISIT.id,ta.value);close();toast('Đã gửi lời nhắn','ok');}catch(e){el.querySelector('#olErr').textContent=olErrText(e);}};});
 bar.querySelector('[data-vb="gift"]').onclick=()=>{const g=olGiftsToday();
  olBox(`<h2>Tặng quà cho ${olEsc(VISIT.agency)}</h2><p class="hub-note">Quà hôm nay (đổi mỗi ngày). Mỗi ngày tặng mỗi bạn 1 món; quà do game tặng, không lấy từ Kho của bạn.</p><div class="ol-gifts">${g.map(it=>`<button class="ol-gift" data-gift="${it}">${olGiftIcon(it,48)}<span>${olEsc(olGiftName(it))}</span></button>`).join('')}</div><p class="ol-err" id="olErr" role="alert"></p><div class="ask-act"><button class="btn c" data-ol-close>Đóng</button></div>`,(el,close)=>{
   el.querySelectorAll('[data-gift]').forEach(b=>b.onclick=async()=>{try{await OL.be.sendGift(VISIT.id,b.dataset.gift);close();toast(`Đã tặng ${olGiftName(b.dataset.gift)} 🎁`,'ok');olVisitButtons();}catch(e){el.querySelector('#olErr').textContent=olErrText(e);}});});};
 setTimeout(()=>{if(!OL.user){toast('Phiên đăng nhập đã hết, quay về văn phòng.','err');setTimeout(olLeaveVisit,1500);}else olVisitButtons();},2500);
}
async function olVisitButtons(){
 if(!VISIT||!OL.user)return;const bar=document.getElementById('visitBar');
 try{const s=await OL.be.sentToday(VISIT.id);
  const set=(k,done,txt)=>{const b=bar.querySelector(`[data-vb="${k}"]`);b.disabled=done;b.querySelector('small').textContent=txt;};
  set('like',s.like,s.like?'Đã thích':'Thích');set('gift',s.gift,s.gift?'Đã tặng':'Tặng quà');set('note',s.notes>=3,s.notes>=3?'Đủ 3 lời':'Lời nhắn');
 }catch(e){}
}
// ---------- nối nút ----------
{
 if(VISIT){try{if(typeof closeHub==='function')closeHub();}catch(e){}}
 setInterval(()=>{if(OL.user&&!document.hidden)olRefreshSocial();},60000);
 olSetupVisit();
 olInit();
}
