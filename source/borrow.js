// ---------- Mượn nhân viên của bạn bè (14/10/2026, phương án A đã chốt) ----------
// Bản sao nhân viên của bạn tới làm hết ngày game hiện tại rồi về; bạn bè không mất người.
// Bên mượn: không trả lương, không cho nghỉ việc được, mỗi ngày game mượn 1 người, cần 1 chỗ làm trống, chỉ mượn người mình chưa có.
// Bên cho mượn: nhận thư "tiền công" = 2 × lương ngày của nhân viên đó (★ ứng viên nổi bật tính lương ★), bấm Nhận trong Hộp thư.
// Giới hạn chống lạm dụng nằm ở máy chủ (online/supabase-schema.sql: borrow_staff): mỗi bạn 1 lần/ngày thật, tối đa 3 lần/ngày thật.
const BORROW_WAGE_X=2;
function borrowList(){if(!Array.isArray(GS.borrowed))GS.borrowed=[];return GS.borrowed;}
function borrowedInfo(id){return (Array.isArray(GS.borrowed)?GS.borrowed:[]).find(b=>b.id===id&&b.day===GS.day)||null;}
function isBorrowed(id){return !!borrowedInfo(id);}
// Tiền công cho người cho mượn, tính ở máy người nhận theo lương hiện hành.
function borrowWage(id,featured=!!GS.stars?.[id]){return Math.round(BORROW_WAGE_X*(SALARY_RATE[STAFF_ROLE[id]]||2)*(featured?1.2:1)*100)/100;}
function borrowIdFromItem(item){const m=/^wage_([a-z0-9_]{1,34})$/.exec(item||'');return m?Object.keys(STAFF_ROLE).find(id=>id.toLowerCase()===m[1])||null:null;}
// Số chỗ làm việc còn trống (ghế/bàn làm việc trừ người cần ngồi; nhân vật chính đứng quầy, linh vật không ngồi).
function freeWorkSeats(){
 const uidOk=new Set(OBJS.filter(o=>WORKSEAT.has(o.id)&&!o.guest).map(o=>o.uid));
 const seats=(Array.isArray(SEATS)?SEATS:[]).filter(z=>uidOk.has(z.uid)).length;
 return seats-AG.filter(a=>!a.mascot&&!(a.founder&&GS.player)).length;
}
// Lý do không mượn được (chuỗi rỗng = mượn được). Kiểm tra trước khi gọi máy chủ để không phát tiền công oan.
function borrowBlock(id){
 if(typeof VISIT!=='undefined'&&VISIT)return 'Đang tham quan văn phòng bạn bè.';
 const ci=CHARS.findIndex(c=>c.id===id);
 if(ci<0||!STAFF_ROLE[id]||id===MASCOT_ID)return 'Không mượn được người này.';
 if(AG.some(a=>a.ci===ci))return 'Agency của bạn đã có người này.';
 if(borrowList().some(b=>b.day===GS.day))return 'Mỗi ngày game chỉ mượn được 1 người.';
 if(closingOffice||GS.min>=CLOSE_MIN-60)return 'Sắp hết giờ làm (sau 20:00). Mượn vào ngày mai.';
 if(AG.length>=15)return 'Văn phòng đã đủ 15 người.';
 if(freeWorkSeats()<1)return 'Cần 1 chỗ làm việc trống (đặt thêm bàn ghế).';
 return '';
}
function borrowAgent(ci,arrive){
 const a=tagStaff({x:ENTRY[0],y:ENTRY[1],ci,path:[],dir:'NE',t:0,wait:.3,seat:null,state:'wander',sitT:0,roam:0,stress:0});
 a.borrowed=true;if(arrive)startArrival(a,.3);return a;
}
// Gọi sau khi máy chủ đã ghi nhận lượt mượn.
function startBorrow(id,from){
 const ci=CHARS.findIndex(c=>c.id===id);if(ci<0)return false;
 if(typeof bootEnsure==='function')bootEnsure(CHARS[ci]);
 borrowList().push({id,day:GS.day,fromId:String(from.id||''),agency:String(from.agency||'Bạn bè').slice(0,40)});
 AG.push(borrowAgent(ci,true));
 addOfficeNews('staff',`${staffName(id)} từ ${from.agency} tới làm giúp tới hết hôm nay`);
 commitRoster();hud();return true;
}
// Tải lại giữa ngày: giữ người đang mượn; người mượn từ hôm trước đã về.
function restoreBorrowed(){
 GS.borrowed=borrowList().filter(b=>b.day===GS.day&&CHARS.some(c=>c.id===b.id));
 for(const a of AG)if(isBorrowed(CHARS[a.ci].id))a.borrowed=true;
}
// Sang ngày mới (gọi ngay sau GS.day++): người mượn về agency của bạn.
function endBorrowDay(){
 const gone=borrowList().filter(b=>b.day<GS.day);if(!gone.length)return;
 GS.borrowed=borrowList().filter(b=>b.day>=GS.day);
 for(const b of gone){const i=AG.findIndex(a=>CHARS[a.ci].id===b.id&&a.borrowed);if(i<0)continue;const a=AG[i];
  for(const j of GS.jobs){if(j.id===a.meetingJob&&typeof releaseMeeting==='function')releaseMeeting(j);if(j.who===b.id)j.who=null;}
  if(a.useObj)BUSY.delete(a.useObj);AG.splice(i,1);
  addOfficeNews('staff',`${staffName(b.id)} đã về ${b.agency}`);}
 if(typeof SEAT_COMPOSITES!=='undefined')SEAT_COMPOSITES.clear();
 GS.staffIds=AG.filter(a=>!a.borrowed).map(a=>CHARS[a.ci].id);
}
