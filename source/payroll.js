// Trial daily rates in million coin. Featured staff earn a 20% premium.
// 26/10 (A5): lương ×2 so với 15/10, thêm chi phí văn phòng mỗi khu/ngày — mô phỏng: mở khu 2 từ khoảng ngày game 2–3 lên 5–9 (ước tính).
const SALARY_RATE={'Account':4,'Design':5,'Content':4,'Planner':6,'AI Designer':7,'Editor':6,'Quay phim':6,'Âm thanh':5,'Kế toán':4,'Sale':4,'HR':4,'Trợ lý':3};
const UPKEEP_PER_ZONE=3;   // tr/khu/ngày: điện, nước, mặt bằng — trừ lúc tan ca cùng lương
function officeUpkeep(){return typeof UNLOCKED!=='undefined'?UPKEEP_PER_ZONE*UNLOCKED.size:0;}
function salaryRate(id,featured=!!GS.stars?.[id]){return id===FOUNDER_ID||id===MASCOT_ID||(typeof isBorrowed==='function'&&isBorrowed(id))?0:Math.round((SALARY_RATE[roleOf(id)]||2)*(featured?1.2:1)*100)/100;}
// Người mượn của bạn bè: tên agency do người chơi khác đặt nên thoát HTML.
function salaryLabel(id){const lent=typeof borrowedInfo==='function'&&borrowedInfo(id);if(lent)return `Mượn từ ${String(lent.agency).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')} · về cuối ngày`;return salaryRate(id)?`${GS.stars?.[id]?'★ · ':''}${fmt(salaryRate(id))}/ngày`:'Miễn lương';}
function payrollState(){
 if(!GS.payroll)GS.payroll={day:GS.day,items:{},debt:0,closedDay:0};
 const p=GS.payroll;if(p.day!==GS.day){p.day=GS.day;p.items={};}return p;
}
function accruePayroll(minutes){
 if(!Number.isFinite(minutes)||minutes<=0)return;
 const p=payrollState();if(p.closedDay>=GS.day)return;
 for(const a of AG){const id=CHARS[a.ci].id,rate=salaryRate(id);if(!rate)continue;
  const line=p.items[id]||(p.items[id]={minutes:0,amount:0});const worked=Math.min(minutes,Math.max(0,CLOSE_MIN-480-line.minutes));
  line.minutes+=worked;line.amount+=rate*worked/(CLOSE_MIN-480);
 }
}
function payrollDue(){return Math.round(Object.values(payrollState().items).reduce((n,r)=>n+r.amount,0)*100)/100;}
function settlePayroll(){
 const p=payrollState();if(p.closedDay>=GS.day)return p.last;
 const wages=payrollDue(),upkeep=officeUpkeep(),accrued=Math.round((wages+upkeep)*100)/100,previousDebt=p.debt,total=Math.round((accrued+previousDebt)*100)/100,paid=Math.min(total,Math.max(0,Math.floor(cash*100)/100));
 cash=Math.round((cash-paid)*100)/100;p.debt=Math.round((total-paid)*100)/100;p.closedDay=GS.day;
 p.last={day:GS.day,accrued,wages,upkeep,previousDebt,paid,debt:p.debt,items:JSON.parse(JSON.stringify(p.items))};return p.last;
}
function renderPayroll(){
 const p=payrollState(),box=document.createElement('div');box.className='hub-note';
 const budget=AG.reduce((n,a)=>n+salaryRate(CHARS[a.ci].id),0);
 box.innerHTML=`<b>Lương ${fmt(budget)}/ngày</b><details class="compact-details"><summary>Chi tiết lương ⓘ</summary>Đã phát sinh hôm nay: ${fmt(payrollDue())} · Nợ lương: ${fmt(p.debt)}<br><small>Chốt lúc tan ca 21:00. Tuyển hoặc thôi việc giữa ngày tính theo thời gian thuộc đội; nghỉ giải lao vẫn hưởng lương. Nhân sự nổi bật +20%. Nợ được trả trước cùng kỳ lương kế tiếp. Bản lưu cũ tính từ lúc cập nhật, không truy thu.</small></details>`;
 document.getElementById('staffList').prepend(box);
}
