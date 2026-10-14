// ---------- Phản hồi của khách và trả lời đánh giá (V18, 08/10/2026) ----------
// Theo bản game đầu tiên (deploy v4):
//  1) Khách góp ý giữa chừng: xong bước Sản xuất, khách có thể yêu cầu sửa → Sửa kỹ / Thuyết phục khách / Account sửa nhẹ.
//  2) Bàn giao xong: khách để lại đánh giá 1–5 sao; người chơi trả lời 2 lượt (đánh giá thấp: Giảng hoà / Combat; cao: Cảm ơn / Mời dự án tiếp).
// Chất lượng job = trung bình mức hợp nghề của người làm các bước (đúng nghề 1 · gần nghề .75 · trái nghề .45, ứng viên nổi bật +.1, stress >75 −.1).
// Mọi hệ số dưới đây là thông số thử, cần chỉnh sau playtest.
const QUAL_OF={spec:1,near:.75,off:.45};
const REV_ROUND=2, REVIEW_MAX=30, FB_TIMEOUT=120;   // FB_TIMEOUT: phút trong game; quá hạn không trả lời thì Account tự sửa nhẹ
const STAR_REP={1:-8,2:-4,3:0,4:2,5:5};
function trackQuality(j,a,role,pts){ if(!(pts>0)) return; let q=QUAL_OF[roleMatch(a,role)]; if(GS.stars&&GS.stars[CHARS[a.ci].id]) q+=.1; if(a.stress>75) q-=.1;
 j.qs=(j.qs||0)+q*pts; j.qp=(j.qp||0)+pts; }
function jobQuality(j){ return j&&j.qp>0?Math.max(0,Math.min(1,j.qs/j.qp)):.75; }
function jobStars(j){ const early=GS.day<j.due; let s=jobQuality(j)+(early?.05:0)-(j.vip?.05:0)+(j.fbMod||0);
 return s>=.9?5:s>=.78?4:s>=.62?3:s>=.5?2:1; }
const REVIEW_TXT={5:['Concept chuẩn, bàn giao gọn. Hẹn dự án sau.','Team hiểu brand ngay từ đầu, rất hài lòng.'],4:['Sản phẩm ổn, vài chi tiết cần chỉnh nhẹ.','Chất lượng tốt, đúng hẹn.'],
 3:['Đúng brief nhưng chưa có điểm nhấn.','Tạm được, chưa thật sự nổi bật.'],2:['Chất lượng chưa như kỳ vọng.','Làm chưa tới, phải nhắc nhiều lần.'],1:['Chất lượng kém, thất vọng.','Không đúng brief, mất thời gian của bên mình.']};
function custName(ci){ return (typeof CUSTS!=='undefined'&&CUSTS[ci]&&CUSTS[ci].name)||'Khách hàng'; }
function pickTxt(a){ return a[Math.floor(Math.random()*a.length)]; }
function ensureReviews(){ if(!Array.isArray(GS.reviews)) GS.reviews=[]; return GS.reviews; }
function addReview(j,s,t){ const R=ensureReviews(); const r={id:(GS.reviewSeq=(GS.reviewSeq||0)+1),day:GS.day,name:String(j.name),cust:Number.isFinite(j.cust)?j.cust:0,s,s0:s,t,conv:[]};
 R.unshift(r); GS.reviews=R.slice(0,REVIEW_MAX); return r; }
// Gọi khi job xong (template: vòng hoàn thành job). Trả về số sao.
function reviewJob(j){ const s=jobStars(j); const r=addReview(j,s,pickTxt(REVIEW_TXT[s]));
 if(typeof addOfficeNews==='function') addOfficeNews(s>=4?'job':'late',`${custName(r.cust)} đánh giá «${j.name}» ${'★'.repeat(s)} · bấm Danh tiếng để trả lời`);
 renderRepChip(); return s; }
function reviewLate(j){ addReview(j,1,'Trễ hạn, bên mình không nhận được sản phẩm.'); renderRepChip(); }
function repAdd(n){ const rep=ensureReputation(); const before=reputationLevel(rep.points); const v=Math.max(0,rep.points+n)-rep.points; rep.points+=v;
 const after=reputationLevel(rep.points); if(after>before&&typeof toast==='function') toast(`Danh tiếng cấp ${after+1}: ${REP_LEVELS[after].name}`,'ok'); return v; }
function unansweredReviews(){ return ensureReviews().filter(r=>!(r.conv||[]).length).length; }

// ----- 1) Khách góp ý giữa chừng -----
function revisionChance(j){ return Math.max(.1,Math.min(.6,.15+(.85-jobQuality(j))*1.2)); }
function nowMin(){ return GS.day*1440+GS.min; }
// Gọi khi một bước vừa xong. Chỉ 1 lần mỗi job, sau bước Sản xuất.
function maybeRevision(j,k,rnd){ if(k!=='prod'||j.fb) return false; const r=rnd==null?Math.random():rnd;
 if(r>=revisionChance(j)){ j.fb={done:true,kind:'none'}; return false; }
 j.fb={at:nowMin(),done:false}; if(typeof addOfficeNews==='function') addOfficeNews('late',`${custName(j.cust)} góp ý «${j.name}»: muốn sửa phần Sản xuất`);
 if(typeof toast==='function') toast(`${custName(j.cust)} có góp ý cho «${j.name}»`,'');
 renderRepChip(); setTimeout(()=>{ if(!repOpen()&&!(typeof askOpen==='function'&&askOpen())) openRevision(j.id); },50); return true; }
function fbPending(j){ return !!(j&&j.fb&&!j.fb.done); }
function persuadeChance(){ const acc=AG.some(a=>!a.away&&TRACK_OF[a.role]&&TRACK_OF[a.role].spec.includes('acc'));
 return Math.min(.85,.35+(acc?.15:0)+reputationLevel(ensureReputation().points)*.07); }
function addProdWork(j,f){ const s=j.stg&&j.stg.find(s=>s.k==='prod'); if(!s) return 0; const add=Math.round(s.need*f*100)/100; s.need+=add; j.need+=add; ensureStages(j); return add; }
function resolveRevision(j,m,rnd){ if(!fbPending(j)) return null; const r=rnd==null?Math.random():rnd; let msg;
 if(m==='fix'){ addProdWork(j,.25); j.fbMod=.1; repAdd(1); msg='Team sửa kỹ phần Sản xuất (+25% khối lượng) · khách đánh giá cao thiện chí · +1 danh tiếng'; }
 else if(m==='talk'){ if(r<persuadeChance()){ j.fbMod=0; msg='Account thuyết phục được khách giữ bản hiện tại'; } else { j.fbMod=-.15; repAdd(-2); msg='Khách không đồng ý, vẫn giữ bản cũ nhưng không vui · −2 danh tiếng, đánh giá sẽ thấp hơn'; } }
 else { addProdWork(j,.12); j.fbMod=0; msg='Account nhận góp ý và cho sửa nhẹ (+12% khối lượng)'; }
 j.fb={done:true,kind:m}; if(typeof addOfficeNews==='function') addOfficeNews('job',`«${j.name}»: ${msg}`); renderRepChip(); return msg; }
function tickRevisions(){ for(const j of GS.jobs) if(fbPending(j)&&nowMin()-j.fb.at>=FB_TIMEOUT) resolveRevision(j,'auto'); }

// ----- 2) Trả lời đánh giá: 2 lượt -----
const RV={
 peace:[['Dạ {A} xin lỗi anh/chị vì trải nghiệm chưa tốt. Bên em xin sửa lại miễn phí phần chưa ổn ạ.','Dạ em nhận thiếu sót ạ. Bên em gửi bản chỉnh trong hôm nay, không tính phí.'],['Dạ tụi em sửa xong rồi, tặng thêm 1 bộ ảnh social. Mong được đồng hành tiếp ạ.','Em cảm ơn anh/chị đã góp ý thẳng. Lần sau em cử người kèm sát từ brief ạ.']],
 combat:[['Brief đổi 5 lần trong 2 ngày thì chất lượng thế là may rồi ạ.','Dạ thật ra bên em làm đúng brief, anh/chị duyệt rồi mà giờ lại chê ạ?'],['Deadline hôm qua, feedback 3 giờ sáng, tiền thì tháng sau. 5 sao kiểu gì ạ?','Muốn đẹp như hàng hiệu mà trả giá như chợ đêm thì chịu, anh/chị tìm bên khác nhé.']],
 thanks:[['{A} cảm ơn anh/chị nhiều ạ! Làm với bên mình vui lắm.','Dạ tụi em cảm ơn, cả team đọc đánh giá này là có động lực liền.'],['Hẹn anh/chị ở chiến dịch sau, bên em giữ lịch ưu tiên nhé!','Có gì cần gấp cứ nhắn em, team luôn sẵn sàng ạ.']],
 upsell:[['Cảm ơn anh/chị! Quý sau mình làm thêm gói video không ạ?','Dạ cảm ơn ạ! Bên em đang có gói truyền thông đi kèm, anh/chị tham khảo nhé.'],['Em gửi đề xuất trước để anh/chị duyệt sớm nha.','Em giảm 10% cho dự án kế tiếp ạ.']]};
const RC={peace:[['Ừ, thái độ vậy thì được. Sửa nhanh giúp chị nhé.','Ok em, anh nâng lại sao, nhớ sửa kỹ.'],['Tốt, lần sau vẫn làm với {A}.','Ok, coi như xong. Cảm ơn team.']],
 combat:[['Ơ, agency gì mà cãi khách? Hạ thêm sao.','Thái độ này thì hết cứu, trừ sao.'],['Được lắm, để chị đăng lên group ngành cho mọi người cùng xem.','Thôi khỏi, cả hội bạn anh cũng sẽ biết.']],
 back:['Thôi được, nể thái độ này chị nâng lại chút.','Nói vậy còn nghe được, anh bỏ qua.'],sour:['Vừa xin lỗi xong đã cà khịa, bó tay.','Tưởng tử tế, hoá ra vẫn thế. Trừ sao.'],
 thanks:[['Không có gì, team làm tốt mà!','Chị sẽ giới thiệu bạn bè nhé.'],['Ok hẹn gặp lại!','Nhất định rồi!']],
 upsell:[['Để anh xem ngân sách quý sau nhé.','Gửi chị đề xuất đi.'],['Ok, chốt lịch họp tuần sau.','Chị sẽ quay lại sớm.']]};
function fillA(t){ return t.replace(/\{A\}/g,typeof agencyName==='function'?agencyName():'bên em'); }
function replyOptions(r){ const n=(r.conv||[]).filter(m=>m.me).length, bad=r.s0<=3, combats=(r.conv||[]).filter(m=>m.k==='combat').length, hadC=combats>0;
 return bad?[{k:'peace',l:'Giảng hoà, xin lỗi',e:n===0||hadC?'+1★':'+danh tiếng',c:'g'},{k:'combat',l:'Combat',e:`−${n===0?1:combats+1}★`,c:'r'}]
  :[{k:'thanks',l:'Cảm ơn',e:'+danh tiếng',c:'g'},{k:'upsell',l:'Mời dự án tiếp',e:'Khách có thể quay lại',c:'b'}]; }
// Áp dụng 1 lượt trả lời. rnd: số ngẫu nhiên (để kiểm thử). Trả về {dStar, dRep, reply}.
function applyReply(r,m,rnd){ r.conv=r.conv||[]; const round=r.conv.filter(q=>q.me).length; if(round>=REV_ROUND||!RV[m]) return null;
 const roll=rnd==null?Math.random():rnd; const me=fillA(pickTxt(RV[m][round])); r.conv.push({me:1,k:m,t:me}); let reply,dS=0,dR=0;
 if(m==='peace'){ const hadC=r.conv.some(q=>q.k==='combat'); if(round===0||hadC){ dS=1; reply=pickTxt(hadC?RC.back:RC.peace[0]); } else { dR=1; reply=pickTxt(RC.peace[1]); if(roll<.35) addRepeatCust(r.cust); } }
 else if(m==='combat'){ const lv=r.conv.filter(q=>q.k==='combat').length; dS=-lv; dR=-lv; reply=pickTxt(round>0&&r.conv[0].k==='peace'?RC.sour:RC.combat[Math.min(lv,2)-1]); }
 else if(m==='thanks'){ dR=.5; reply=pickTxt(RC.thanks[round]); }
 else { reply=pickTxt(RC.upsell[round]); if(roll<.5){ addRepeatCust(r.cust); r.back=true; } }
 const ns=Math.max(1,Math.min(5,r.s+dS)), real=ns-r.s; r.s=ns;
 const dRep=repAdd(Math.round(real*3+dR*4)); r.conv.push({me:0,t:fillA(reply)}); return {dStar:real,dRep,reply}; }
// Khách quen: 1 khách mới sau đó là khách này, giá +10%.
function addRepeatCust(ci){ const q=GS.repeatCust||(GS.repeatCust=[]); if(Number.isFinite(ci)&&!q.includes(ci)&&q.length<5) q.push(ci); }
function applyRepeat(o){ const q=GS.repeatCust; if(!Array.isArray(q)||!q.length||!o) return o; o.cust=q.shift(); o.reward=Math.round(o.reward*1.1*10)/10; o.repeat=true; return o; }

// ----- giao diện -----
const escH=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function starsH(s){ return `<span class="rv-st" aria-label="${s} sao">${'★'.repeat(s)}<i>${'★'.repeat(5-s)}</i></span>`; }
function custFace(ci){ const c=typeof CUSTS!=='undefined'&&CUSTS[ci]; return `<span class="rv-av">${c?`<i style="background-image:url('${c.src}')"></i>`:''}</span>`; }
function renderRepChip(){ const el=typeof document!=='undefined'&&document.getElementById('repChip'); if(!el) return;
 const rep=ensureReputation(), i=reputationLevel(rep.points), lv=REP_LEVELS[i], nx=REP_LEVELS[i+1];
 const pending=GS.jobs.filter(fbPending).length, n=unansweredReviews()+pending;
 el.querySelector('.rc-n').textContent=lv.name; el.querySelector('.rc-p').textContent=rep.points+(nx?'/'+nx.min:'');
 el.querySelector('.rc-bar i').style.width=(nx?Math.min(100,(rep.points-lv.min)/(nx.min-lv.min)*100):100)+'%';
 const b=el.querySelector('.rc-badge'); b.textContent=n>9?'9+':n; b.hidden=!n; el.classList.toggle('warn',pending>0);
 el.setAttribute('aria-label',`Danh tiếng: ${lv.name}, ${rep.points} điểm${n?`, ${n} phản hồi chờ xử lý`:''}`); }
function repOpen(){ const b=typeof document!=='undefined'&&document.getElementById('repBox'); return !!b&&!b.hidden; }
function closeRep(){ const b=document.getElementById('repBox'); b.hidden=true; renderRepChip(); try{save();}catch(e){} }
function repShell(html){ const box=document.getElementById('repBox'); box.querySelector('.rep-body').innerHTML=html; box.hidden=false; return box; }
function openRep(tab){ const R=ensureReviews(), pend=GS.jobs.filter(fbPending);
 const rep=ensureReputation(), i=reputationLevel(rep.points), lv=REP_LEVELS[i], nx=REP_LEVELS[i+1];
 const pct=nx?Math.min(100,(rep.points-lv.min)/(nx.min-lv.min)*100):100;
 const box=repShell(`<h2>Danh tiếng</h2>
  <div class="rep-top"><b>${lv.name}</b><small>Cấp ${i+1}/${REP_LEVELS.length}</small><div class="pbar"><i style="width:${pct}%"></i><span>${rep.points}${nx?' / '+nx.min:''} điểm</span></div>
  <div class="rep-tiers">${REP_LEVELS.map((x,k)=>`<span class="${k===i?'on':k<i?'past':''}">${x.name}</span>`).join('')}</div></div>
  ${pend.length?`<div class="cg2">Khách đang góp ý (${pend.length})</div>`+pend.map(j=>`<div class="ol-row rv-fb">${custFace(j.cust)}<div class="ol-who"><b>${escH(custName(j.cust))}</b><small>«${escH(j.name)}» · muốn sửa phần Sản xuất</small></div><button class="btn g" data-fb="${j.id}">Xử lý</button></div>`).join(''):''}
  <div class="cg2">Đánh giá của khách (${R.length})</div>
  ${R.length?R.map(r=>{ const n=(r.conv||[]).filter(m=>m.me).length; return `<div class="ol-row rv-row">${custFace(r.cust)}<div class="ol-who"><b>${escH(custName(r.cust))} ${starsH(r.s)}${r.s!==r.s0?` <em class="${r.s>r.s0?'up':'dn'}">${r.s>r.s0?'+':''}${r.s-r.s0}★</em>`:''}</b><small>N${r.day} · ${escH(r.name)}</small><span class="ol-note">${escH(r.t)}</span></div><button class="btn ${n?'c':'g'}" data-rv="${r.id}">${n>=REV_ROUND?'Xem':n?'Trả lời tiếp':'Trả lời'}</button></div>`; }).join('')
   :'<p class="ask-text">Chưa có đánh giá. Hoàn thành job để khách để lại đánh giá.</p>'}
  <p class="rep-rule">Hoàn thành job +10 · VIP +5 · trước hạn +2 · trễ hạn −8. Sao của khách: 5★ +5 · 4★ +2 · 2★ −4 · 1★ −8. Chất lượng cao khi người làm đúng chuyên môn.</p>
  <div class="ask-act"><button class="btn c" data-x>Đóng</button></div>`);
 box.querySelector('[data-x]').onclick=closeRep;
 box.querySelectorAll('[data-rv]').forEach(b=>b.onclick=()=>openReply(+b.dataset.rv));
 box.querySelectorAll('[data-fb]').forEach(b=>b.onclick=()=>openRevision(+b.dataset.fb)); }
function feedbackIcon(index){return `<span class="feedback-icon" aria-hidden="true" style="background-position:${index%2*100}% ${Math.floor(index/2)*100}%"></span>`;}
function openRevision(id){ const j=GS.jobs.find(x=>x.id===id); if(!fbPending(j)){ if(repOpen()) openRep(); return; }
 const pc=Math.round(persuadeChance()*100), left=Math.max(0,Math.round(FB_TIMEOUT-(nowMin()-j.fb.at)));
 const box=repShell(`<div class="rv-dlg">${custFace(j.cust)}<div class="rv-say"><small>Góp ý · ${escH(custName(j.cust))}</small>"Bản Sản xuất của «${escH(j.name)}» chưa ưng lắm, team sửa lại giúp anh/chị nhé?"</div></div>
  <div class="rv-opts">
   <button class="rv-opt rv-icon-option" data-m="fix">${feedbackIcon(0)}<span class="feedback-copy"><b>Sửa kỹ</b><small>+25% khối lượng bước Sản xuất · khách hài lòng hơn (+sao) · +1 danh tiếng</small></span></button>
   <button class="rv-opt rv-icon-option" data-m="talk">${feedbackIcon(1)}<span class="feedback-copy"><b>Thuyết phục khách</b><small>${pc}% thành công: không phải sửa · thất bại: −2 danh tiếng, đánh giá thấp hơn</small></span></button>
   <button class="rv-opt rv-icon-option" data-m="auto">${feedbackIcon(2)}<span class="feedback-copy"><b>Để Account sửa nhẹ</b><small>+12% khối lượng · không đổi đánh giá</small></span></button></div>
  <p class="rep-rule">Job tạm dừng cho tới khi bạn chọn. Sau ${left} phút trong game, Account tự sửa nhẹ.</p>
  <div class="ask-act"><button class="btn c feedback-later" data-later>${feedbackIcon(3)}<span>Để sau</span></button></div>`);
 box.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ const msg=resolveRevision(j,b.dataset.m); if(msg&&typeof toast==='function') toast(msg,b.dataset.m==='talk'&&j.fbMod<0?'err':'ok'); try{save();}catch(e){} if(typeof renderJobs==='function') renderJobs(); openRep(); });
 box.querySelector('[data-later]').onclick=closeRep; }
function openReply(id){ const r=ensureReviews().find(x=>x.id===id); if(!r) return; r.conv=r.conv||[];
 const n=r.conv.filter(m=>m.me).length, done=n>=REV_ROUND, me=typeof agencyName==='function'?agencyName():'Bạn';
 const box=repShell(`<div class="rv-dlg">${custFace(r.cust)}<div class="rv-say"><small>Đánh giá · ${escH(custName(r.cust))} · ${escH(r.name)}</small>${starsH(r.s)}${r.s!==r.s0?` <em class="${r.s>r.s0?'up':'dn'}">${r.s>r.s0?'+':''}${r.s-r.s0}★</em>`:''}</div></div>
  <div class="rv-chat"><div class="rv-msg cl"><p>${escH(r.t)}</p></div>${r.conv.map(m=>`<div class="rv-msg ${m.me?'me':'cl'}${m.k==='combat'?' hot':''}">${m.me?`<small>${escH(me)}</small>`:''}<p>${escH(m.t)}</p></div>`).join('')}</div>
  ${done?'<p class="rep-rule">Đã trả lời đủ 2 lượt.</p>':`<div class="cg2">Lượt ${n+1}/${REV_ROUND} · chọn cách trả lời</div><div class="rv-two">${replyOptions(r).map(o=>`<button class="btn ${o.c}" data-m="${o.k}">${o.l}<small>${o.e}</small></button>`).join('')}</div>`}
  <div class="ask-act"><button class="btn c" data-back>Quay lại</button></div>`);
 box.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{ const res=applyReply(r,b.dataset.m); if(res&&res.dStar&&typeof toast==='function') toast(`${custName(r.cust)} ${res.dStar>0?'nâng':'hạ'} ${Math.abs(res.dStar)} sao`,res.dStar>0?'ok':'err');
  if(r.back&&r.conv.filter(m=>m.me).length===REV_ROUND&&typeof toast==='function') toast(`${custName(r.cust)} hẹn quay lại với job mới`,'ok'); try{save();}catch(e){} openReply(r.id); });
 const ch=box.querySelector('.rv-chat'); ch.scrollTop=ch.scrollHeight;
 box.querySelector('[data-back]').onclick=()=>openRep(); }
