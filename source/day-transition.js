let dayTransitionLeft=0;
function captureDayReport(award=0){
 const start=GS.dayStartTotals||{done:GS.done||0,failed:GS.failed||0};
 return {day:GS.day,received:GS.revToday+award,debt:(GS.receivables||[]).reduce((n,d)=>n+d.amount,0),done:Math.max(0,(GS.done||0)-start.done),failed:GS.jobs.filter(j=>j.due<=GS.day).length,
 pending:GS.jobs.filter(j=>j.due>GS.day).map(j=>({name:j.name,due:j.due,work:j.work,need:j.need})),stressed:AG.filter(a=>a.stress>75).map(a=>CHARS[a.ci].id)};
}
function dayReportHTML(r){return `<b>Tổng kết ngày ${r.day}</b><div>Tiền nhận: ${fmt(r.received)} · Công nợ: ${fmt(r.debt)}</div>${r.payroll?`<div>Lương + văn phòng: ${fmt(r.payroll.accrued)}${r.payroll.upkeep?` (văn phòng ${fmt(r.payroll.upkeep)})`:''} · Đã trả: ${fmt(r.payroll.paid)} · Nợ lương: ${fmt(r.payroll.debt)}</div><div>Thu trừ lương phát sinh: ${fmt(r.received-r.payroll.accrued)}</div>`:""}<div>Hoàn thành: ${r.done} · Trễ hạn: ${r.failed} · Đang dở: ${r.pending.length}</div><div>Nhân sự stress cao: ${r.stressed.length}</div>`;}
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
 el.innerHTML=ledgerHTML()+'<hr>'+(GS.lastDayReport?dayReportHTML(GS.lastDayReport)+'<hr>':'')+tomorrowHTML();
}

// ---------- 26/10 (A6): sổ quỹ hôm nay: đầu ngày + thu − chi = hiện có ----------
const LEDGER_NAME={hire:'Tuyển người',build:'Nội thất & xây dựng',zone:'Mở khu đất',fee:'Phí khác (đổi công năng, mượn người…)'};
function ledgerDay(){if(!GS.ledger||GS.ledger.day!==GS.day)GS.ledger={day:GS.day,start:Math.round(cash*100)/100,exp:{}};return GS.ledger;}
function ledgerSpend(k,n){if(!Number.isFinite(n)||!n)return;const L=ledgerDay();L.exp[k]=Math.round(((L.exp[k]||0)+n)*100)/100;}
function ledgerHTML(){
 const L=ledgerDay(),r2=v=>Math.round(v*10)/10,inc=r2(GS.revToday||0),spent=Object.values(L.exp).reduce((n,v)=>n+v,0);
 const other=r2(cash-(L.start+inc-spent)),due=typeof payrollDue==='function'?r2(payrollDue()+(typeof officeUpkeep==='function'?officeUpkeep():0)):0;
 const rows=Object.entries(L.exp).filter(([,v])=>Math.abs(v)>=.05).map(([k,v])=>`<div class="row"><span>− ${LEDGER_NAME[k]||k}</span><b>${fmt(r2(v))}</b></div>`).join('');
 return `<b>Sổ quỹ hôm nay (ngày ${GS.day})</b><div class="row"><span>Số dư đầu ngày</span><b>${fmt(r2(L.start))}</b></div><div class="row"><span>+ Thu (job, thụ động, cho thuê)</span><b>${fmt(inc)}</b></div>${rows}${Math.abs(other)>=.05?`<div class="row"><span>${other>0?'+':'−'} Khác (bán đồ, hoàn tác, quà, nạp…)</span><b>${fmt(Math.abs(other))}</b></div>`:''}<div class="row"><span><b>= Số dư hiện có</b></span><b>${fmt(r2(cash))}</b></div><div class="hub-note">Lúc 21:00 sẽ trừ lương + chi phí văn phòng: khoảng ${fmt(due)}.</div>`;
}
