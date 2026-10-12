// Stable IDs keep roster, stress and cosmetic ownership independent of list order.
const HIRE_COST=20;
const DEFAULT_FOUNDER='01_Huy';
let FOUNDER_ID=DEFAULT_FOUNDER;   // nhân vật của người chơi: mặc định Huy, đổi ở màn mở đầu (player.js)
// Tên nhân vật cố định theo bản deploy v4 (V1); Huy, Luwon, Pali, Tamny theo danh sách cập nhật sau đó.
// 07/10/2026: thử đổi sang tên chung (V11–V12) rồi trả lại tên cũ theo yêu cầu (V13).
const STAFF_NAME={'01_Huy':'Huy','02_Luwon':'Luwon','03_Pali':'Pali','04_Tamny':'Tamny','06_Vu_a_Vu':'Vũ à Vũ','07_Hao_Hao':'Hảo Hảo','08_Nganh':'Ngánh','09_Vit_Vang':'Vịt Vàng','10_Con_LT':'Con LT','11_Juice':'Juice','12_ADM':'ADM','13_AB':'AB','14_HM':'HM','15_CongB':'CongB','trinh_lac_corrected_v2':'Trinh và Lạc'};
const STAFF_ROLE={'01_Huy':'Design','02_Luwon':'Design','03_Pali':'Account','04_Tamny':'Kế toán','06_Vu_a_Vu':'Sale','07_Hao_Hao':'HR','08_Nganh':'Trợ lý','09_Vit_Vang':'Linh vật','10_Con_LT':'Account','11_Juice':'Design','12_ADM':'Planner','13_AB':'Content','14_HM':'AI Designer','15_CongB':'Editor','trinh_lac_corrected_v2':'Account'};
const MASCOT_ID='09_Vit_Vang', MASCOT_RADIUS=3, MASCOT_RELIEF=6;   // linh vật: không làm job; giảm 6 stress/giờ game cho người trong bán kính 3 ô (thông số thử)
let pendingDismiss=null;
function staffName(id){if(id===FOUNDER_ID&&GS.player?.name)return GS.player.name;if(id==='P_custom')return 'Bạn';return STAFF_NAME[id]||id.replace(/^\d+_/,'').replace(/_corrected_v2/,'').replace(/_/g,' ');}
// Nhân vật của người chơi luôn là lễ tân (đứng quầy, nhận khách, giao việc cho Account).
function roleOf(id){if(id==='P_custom'||(id===FOUNDER_ID&&typeof GS!=='undefined'&&GS.player))return 'Lễ tân';return STAFF_ROLE[id]||'';}
// Gắn chức danh lên từng nhân viên để các vòng mô phỏng không phải tra bảng.
function tagStaff(a){const id=CHARS[a.ci].id;a.role=roleOf(id);a.mascot=id===MASCOT_ID;a.founder=id===FOUNDER_ID;if(a.mascot){a.stress=0;a.autoBreak=false;}return a;}
function restoreRoster(){
 const known=new Set(CHARS.map(c=>c.id));
 FOUNDER_ID=GS.player&&known.has(GS.player.id)?GS.player.id:DEFAULT_FOUNDER;
 let ids=Array.isArray(GS.staffIds)?GS.staffIds:CHARS.slice(0,3).map(c=>c.id);
 // Vịt Vàng là linh vật của game: luôn có trong đội từ đầu (kể cả bản lưu cũ chưa tuyển).
 ids=[...new Set([FOUNDER_ID,...ids.filter(id=>known.has(id)),...(known.has(MASCOT_ID)?[MASCOT_ID]:[])])];
 GS.staffIds=ids;
 for(let i=AG.length-1;i>=0;i--)if(!ids.includes(CHARS[AG[i].ci].id))AG.splice(i,1);
 for(const a of AG){const n=GS.staffStress?.[CHARS[a.ci].id];if(Number.isFinite(n))a.stress=Math.max(0,Math.min(100,n));a.autoBreak=Array.isArray(GS.staffBreakIds)&&GS.staffBreakIds.includes(CHARS[a.ci].id)&&a.stress>55;tagStaff(a);}
}
function commitRoster(){
 assignSeats();
 GS.staffIds=AG.map(a=>CHARS[a.ci].id);
 GS.staffStress=Object.fromEntries(AG.map(a=>[CHARS[a.ci].id,Math.round(a.stress||0)]));
 save();updatePanels();renderStaff();
}
function hireStaff(id){
 if(typeof bootEnsure==='function')bootEnsure(CHARS.find(c=>c.id===id));
 const ci=CHARS.findIndex(c=>c.id===id);
 if(ci<0||id===MASCOT_ID||AG.some(a=>a.ci===ci))return;
 if(cash<HIRE_COST){toast(`Cần ${HIRE_COST} tr để tuyển ${staffName(id)}`,'err');return;}
 // Người mới đi bộ từ đầu vỉa hè vào cửa chính như ngày đầu đi làm.
 cash=Math.round((cash-HIRE_COST)*100)/100;
 if(typeof starCandidate==='function'&&GS.starPick&&GS.starPick.id===id&&GS.starPick.day===GS.day){GS.stars=GS.stars||{};GS.stars[id]=1;}   // ứng viên nổi bật giữ hệ số làm nhanh
 const a=tagStaff({x:ENTRY[0],y:ENTRY[1],ci,path:[],dir:'NE',t:0,wait:.3,seat:null,state:'wander',sitT:0,roam:0,stress:0});
 startArrival(a,.3);   // đi bộ từ đầu vỉa hè vào văn phòng
 AG.push(a);
 pendingDismiss=null;addOfficeNews("staff",`Đã tuyển ${staffName(id)} · ${HIRE_COST} tr`);commitRoster();hud();
 if(!a.mascot&&!a.seat)toast(`Đã tuyển ${staffName(id)} · chưa có bàn trống: đặt thêm bàn hoặc mở khu mới`,'err');
 else toast(`Đã tuyển ${staffName(id)} · −${HIRE_COST} tr`,'ok');
}
function dismissStaff(id){
 if(id===FOUNDER_ID||id===MASCOT_ID)return;   // nhân vật của bạn và linh vật luôn ở lại
 const index=AG.findIndex(a=>CHARS[a.ci].id===id);if(index<0)return;
 const a=AG[index];
 if(a.collection){toast("Nhân viên đang đi thu tiền; chờ họ trở về.","err");return;}
 // A departing host returns the meeting to its queue without losing elapsed time.
 for(const j of GS.jobs)if(j.id===a.meetingJob)releaseMeeting(j);
 if(a.useObj)BUSY.delete(a.useObj);
 AG.splice(index,1);SEAT_COMPOSITES.clear();pendingDismiss=null;
 document.getElementById('agentCard').classList.remove('open');
 addOfficeNews("staff",`${staffName(id)} đã nghỉ việc`);commitRoster();toast(`${staffName(id)} đã nghỉ. Có thể tuyển lại trong danh sách.`,'ok');
}
function renderStaff(){
 renderStaffBase();if(typeof renderPayroll==="function")renderPayroll();const list=document.getElementById('staffList');
 const note=document.createElement('p');note.className='hub-note';note.textContent=`${AG.length}/15 người`;list.prepend(note);
 list.querySelectorAll('[data-ag]').forEach(button=>{
  const a=AG[+button.dataset.ag],id=CHARS[a.ci].id;
  if(id===FOUNDER_ID){   // nhân vật của người chơi: không cho thôi việc; nút đổi tên agency
   const row=document.createElement('div');row.className='staff-card';row.style.cssText='display:grid;gap:0';button.replaceWith(row);row.append(button);
   const ren=document.createElement('button');ren.className='btn b';ren.style.cssText='min-height:30px;font-size:12px';ren.textContent='Đổi tên agency';ren.onclick=()=>openPlayerCard();const more=document.createElement('details');more.className='compact-details';more.innerHTML='<summary>Quản lý ⋯</summary>';more.append(ren);row.append(more);return;
  }
  if(id===MASCOT_ID)return;   // linh vật của game: không có nút thôi việc
  const row=document.createElement('div');row.className='staff-card';row.style.cssText='display:grid;gap:0';button.replaceWith(row);row.append(button);
  const fire=document.createElement('button');fire.className='btn c';fire.style.cssText='min-height:30px;font-size:12px';
  fire.textContent=pendingDismiss===id?'Xác nhận thôi việc — không hoàn phí':'Cho thôi việc';fire.setAttribute('aria-label',`${fire.textContent}: ${staffName(id)}`);
  fire.onclick=()=>{if(pendingDismiss===id)dismissStaff(id);else{pendingDismiss=id;renderStaff();}};const more=document.createElement('details');more.className='compact-details';more.open=pendingDismiss===id;more.innerHTML='<summary>Quản lý ⋯</summary>';more.append(fire);row.append(more);
  if(pendingDismiss===id){const cancel=document.createElement('button');cancel.className='btn c';cancel.textContent='Hủy';cancel.onclick=()=>{pendingDismiss=null;renderStaff();};row.append(cancel);}
 });
 // V15: phần Tuyển dụng là tab riêng trong Đội ngũ — các phần tử data-sec="hire" chỉ hiện ở tab đó (CSS theo #staff[data-tab]).
 const free=CHARS.filter(c=>!AG.some(a=>CHARS[a.ci].id===c.id));
 const hn=document.createElement('p');hn.className='hub-note';hn.dataset.sec='hire';hn.textContent=`${AG.length}/15 người · Cần bàn trống`;list.append(hn);
 const heading=document.createElement('div');heading.className='cg2';heading.dataset.sec='hire';heading.textContent='Ứng viên';list.append(heading);
 const starId=typeof starCandidate==='function'?starCandidate(free):null;
 if(starId){const sn=document.createElement('p');sn.className='hub-note';sn.dataset.sec='hire';sn.innerHTML=`<b>HR giới thiệu</b>: ${staffName(starId)} làm việc rất tốt (nhanh hơn 20%). Mỗi ngày HR giới thiệu 1 người.`;list.append(sn);}
 for(const c of [...free].sort((p,q)=>(q.id===starId)-(p.id===starId))){
  const star=c.id===starId;   // V17: có HR trong đội → 1 ứng viên làm rất tốt được làm nổi bật mỗi ngày
  const card=document.createElement('div');card.className='pack'+(star?' star-cand':'');card.style.gridTemplateColumns='48px minmax(0,1fr) auto';
  const name=document.createElement('span');const title=document.createElement('b');title.textContent=staffName(c.id);const sub=document.createElement('small');sub.style.cssText='display:block;font-size:11px';sub.textContent=c.id===MASCOT_ID?'Linh vật · không làm job, giảm stress người xung quanh':roleOf(c.id)+(typeof salaryRate==='function'?` · Lương ${fmt(salaryRate(c.id,star))}/ngày`:'')+(star?' · ⭐ Ứng viên nổi bật · làm nhanh hơn 20%':'');name.append(title,sub);const b=document.createElement('button');b.className='btn g';b.textContent=`Tuyển · ${HIRE_COST} tr`;b.setAttribute('aria-label',`Tuyển ${staffName(c.id)}: ${HIRE_COST} tr`);b.onclick=()=>hireStaff(c.id);card.dataset.sec='hire';const ava=document.createElement('span');ava.innerHTML=staffAvatar(c.id);card.append(ava,name,b);list.append(card);
 }
}

function restStaff(a){
 if(!AG.includes(a)||a.away)return false;
 if(closingOffice||a.collection||a.meetingJob!=null||a.receptionUid!=null){toast('Nhân viên đang có nhiệm vụ; hãy cho nghỉ sau khi hoàn tất.','err');return false;}
 if(a.stress<=0)return false;
 const id=CHARS[a.ci].id,now=GS.day*1440+GS.min;
 const remaining=restCooldown(a);if(remaining){toast(`Cần chờ ${remaining} phút game trước lần nghỉ tiếp theo.`, 'err');return false;}
 if(!GS.staffRestUntil)GS.staffRestUntil={};GS.staffRestUntil[id]=now+30;
 a.stress=Math.max(0,a.stress-25);
 if(a.state==='sit'&&a.acc)[a.x,a.y]=a.acc;
 if(a.useObj){BUSY.delete(a.useObj);a.useObj=null;}
 a.react=null;a.path=[];
 if(a.state!=='burn'||a.stress<60){a.state='wander';a.roam=2;a.wait=.5;}
 dq('rest');save();hud();toast(staffName(CHARS[a.ci].id)+' được nghỉ ngơi','ok');return true;
}

function restCooldown(a){return Math.max(0,Math.ceil((GS.staffRestUntil?.[CHARS[a.ci].id]||0)-(GS.day*1440+GS.min)));}
