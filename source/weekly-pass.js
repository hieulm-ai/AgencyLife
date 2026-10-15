// A free pass follows seven played game days, not wall-clock time.
// V15: mốc cuối có thêm 1 vật phẩm vào Kho (Cửa hàng → Kho).
const PASS_MILESTONES=[{jobs:3,coin:10,gems:0},{jobs:7,coin:0,gems:2},{jobs:12,coin:25,gems:4,item:'potted_plant'}];
function ensureWeeklyPass(){
 const week=Math.floor((Math.max(1,GS.day)-1)/7)+1;
 if(!GS.weeklyPass||!Array.isArray(GS.weeklyPass.weeks))GS.weeklyPass={weeks:[]};
 const pass=GS.weeklyPass;
 // Keep earned, unclaimed rewards from old weeks; remove settled history only.
 pass.weeks=pass.weeks.filter(w=>w.week===week||PASS_MILESTONES.some((m,i)=>w.jobs>=m.jobs&&!w.claimed.includes(i)));
 let current=pass.weeks.find(w=>w.week===week);
 if(!current){current={week,jobs:0,claimed:[]};pass.weeks.push(current);}
 return current;
}
function advanceWeeklyPass(){ensureWeeklyPass().jobs++;}
function claimPassReward(week,index){
 ensureWeeklyPass();const row=GS.weeklyPass.weeks.find(w=>w.week===week),reward=PASS_MILESTONES[index];
 if(!row||!reward||row.jobs<reward.jobs||row.claimed.includes(index))return false;
 row.claimed.push(index);cash=Math.round((cash+reward.coin)*100)/100;
 const gems=typeof grantGems==='function'?grantGems(reward.gems):(GS.gems+=reward.gems,GS.gemEarned=(GS.gemEarned||0)+reward.gems,reward.gems);
 addOfficeNews("reward",`Nhận Pass tuần ${week}, mốc ${reward.jobs} job: ${reward.coin} tr + ${gems} ruby`);
 if(reward.item&&typeof grantStoreItem==='function')grantStoreItem(reward.item,`Pass tuần ${week}`);
 save();hud();updatePanels();renderGemShop();toast('Đã nhận thưởng Pass tuần','ok');return true;
}
function renderWeeklyPass(){
 const current=ensureWeeklyPass(),day=(GS.day-1)%7+1;
 function cards(row){return PASS_MILESTONES.map((m,i)=>{
  const claimed=row.claimed.includes(i),ready=row.jobs>=m.jobs;
  if(row.week!==current.week&&(!ready||claimed))return '';
  return `<div class="pack" style="grid-template-columns:1fr auto"><span><b>${m.jobs} job</b><br><small>${m.coin?m.coin+' tr':''}${m.coin&&m.gems?' + ':''}${m.gems?m.gems+'💎':''}${m.item?' + '+(typeof FBY!=='undefined'&&FBY[m.item]?FBY[m.item].name:'vật phẩm')+' vào Kho':''} · ${Math.min(row.jobs,m.jobs)}/${m.jobs}</small></span><button class="btn ${ready&&!claimed?'g':'c'}" data-pass-week="${row.week}" data-pass-index="${i}" ${claimed||!ready?'disabled':''}>${claimed?'Đã nhận':ready?'Nhận thưởng':'Chưa đạt'}</button></div>`;
 }).join('');}
 return `<div class="cg2">Pass miễn phí · Tuần ${current.week}</div><p style="font-size:12px;margin:4px 0">Ngày ${day}/7 trong game · Đã hoàn thành ${current.jobs} job.<br>Tiến độ tính từ khi cập nhật tính năng. Thưởng đã đạt được giữ lại nếu chưa nhận khi sang tuần.</p>`+cards(current)+GS.weeklyPass.weeks.filter(w=>w.week!==current.week).map(w=>`<div class="cg2">Thưởng còn lại · Tuần ${w.week}</div>`+cards(w)).join('');
}
