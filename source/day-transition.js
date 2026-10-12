let dayTransitionLeft=0;
function captureDayReport(award=0){
 const start=GS.dayStartTotals||{done:GS.done||0,failed:GS.failed||0};
 return {day:GS.day,received:GS.revToday+award,debt:(GS.receivables||[]).reduce((n,d)=>n+d.amount,0),done:Math.max(0,(GS.done||0)-start.done),failed:GS.jobs.filter(j=>j.due<=GS.day).length,
 pending:GS.jobs.filter(j=>j.due>GS.day).map(j=>({name:j.name,due:j.due,work:j.work,need:j.need})),stressed:AG.filter(a=>a.stress>75).map(a=>CHARS[a.ci].id)};
}
function dayReportHTML(r){return `<b>Tổng kết ngày ${r.day}</b><div>Tiền nhận: ${fmt(r.received)} · Công nợ: ${fmt(r.debt)}</div>${r.payroll?`<div>Lương phát sinh: ${fmt(r.payroll.accrued)} · Đã trả: ${fmt(r.payroll.paid)} · Nợ lương: ${fmt(r.payroll.debt)}</div><div>Thu trừ lương phát sinh: ${fmt(r.received-r.payroll.accrued)}</div>`:""}<div>Hoàn thành: ${r.done} · Trễ hạn: ${r.failed} · Đang dở: ${r.pending.length}</div><div>Nhân sự stress cao: ${r.stressed.length}</div>`;}
function dailyJobAlerts(){
 return GS.jobs.filter(j=>j.paused||j.due<=GS.day+1).slice().sort((a,b)=>a.due-b.due||Number(!!b.paused)-Number(!!a.paused));
}
function tomorrowHTML(){
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const alerts=dailyJobAlerts();
 const debt=(GS.receivables||[]).reduce((n,d)=>n+d.amount,0);
 return `<b>Việc cần chú ý ngày ${GS.day}</b>`+
 (alerts.length?alerts.map(j=>`<div class="q"><b>${esc(j.name)}</b><br>${j.due<=GS.day?'Hạn hôm nay':j.due===GS.day+1?'Hạn ngày mai':'Hạn ngày '+j.due} · còn ${Math.ceil(Math.max(0,j.need-j.work))} giờ công${j.paused?'<br><b>Đang tạm dừng · hạn giao vẫn chạy</b>':''}</div>`).join(''):'<div>Không có job sắp đến hạn hoặc đang tạm dừng.</div>')+
 `${debt?`<div>Cần thu ${fmt(debt)} · cử người trước 20:00.</div>`:''}${(GS.pickups||[]).length?`<div>${GS.pickups.length} sản phẩm đang chờ bàn giao tại lễ tân.</div>`:''}${AG.some(a=>a.stress>75)?'<div>Đội có người stress cao · cân nhắc đổi người hoặc cho thư giãn.</div>':''}`+
 '<button class="btn b" data-open-work>Mở bảng công việc</button>';
}
function showDayTransition(){
 dayTransitionLeft=5;
 const el=document.getElementById('dayTransition');
 el.querySelector('[data-day-title]').textContent=`Ngày ${GS.day} · Một ngày mới`;
 el.querySelector('[data-day-report]').innerHTML=dayReportHTML(GS.lastDayReport);
 el.hidden=false;el.inert=false;
}
function stepDayTransition(dt){
 if(dayTransitionLeft<=0)return false;
 dayTransitionLeft=Math.max(0,dayTransitionLeft-dt);
 const el=document.getElementById('dayTransition');el.querySelector('[data-day-progress]').style.width=(1-dayTransitionLeft/5)*100+'%';
 if(!dayTransitionLeft){el.hidden=true;el.inert=true;}
 return true;
}
function updateDayReport(){
 const el=document.getElementById('dayReport');
 if(!el.dataset.actions){el.dataset.actions='1';el.addEventListener('click',event=>{if(!event.target.closest('[data-open-work]'))return;openHub('work','active');});}
 el.innerHTML=(GS.lastDayReport?dayReportHTML(GS.lastDayReport)+'<hr>':'')+tomorrowHTML();
}
