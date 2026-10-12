// Prototype bundles use earned in-game ruby. Purchase limits persist in the save.
const SUPPORT_PACKS=[
 {id:'welcome',name:'Khởi động agency',cost:8,stress:20,once:true},
 {id:'recharge',name:'Tiếp sức cả đội',cost:16,stress:40,once:false}
];
function ensureSupportPacks(){
 if(!GS.supportPacks||typeof GS.supportPacks!=='object')GS.supportPacks={};
 return GS.supportPacks;
}
function supportPackState(pack){
 const bought=ensureSupportPacks()[pack.id];
 if(pack.once&&bought!=null)return 'Đã mua';
 if(!pack.once&&bought===GS.day)return 'Đã mua hôm nay';
 if(GS.energy>=EN_MAX&&!AG.some(a=>a.stress>0))return 'Chưa cần hồi phục';
 if(GS.gems<pack.cost)return 'Thiếu ruby';
 return '';
}
function buySupportPack(id){
 const pack=SUPPORT_PACKS.find(p=>p.id===id);if(!pack)return false;
 const reason=supportPackState(pack);if(reason){toast(reason,'err');return false;}
 GS.gems-=pack.cost;GS.supportPacks[id]=GS.day;GS.energy=EN_MAX;GS.enT=0;
 for(const a of AG){a.stress=Math.max(0,(a.stress||0)-pack.stress);if(a.state==='burn'&&a.stress<60){a.state='wander';a.path=[];a.wait=.3;}}
 assignSeats();
 addOfficeNews("pack",`Đã dùng ${pack.name} · ${pack.cost} ruby`);
 save();hud();updatePanels();renderGemShop();toast(`Đã dùng ${pack.name} · −${pack.cost} ruby`,'ok');return true;
}
function renderSupportPacks(){
 return '<div class="cg2">Gói hỗ trợ</div><details class="compact-details"><summary>Cách dùng ⓘ</summary>Dùng ngay khi mua · tối đa 120⚡ · giữ hạn mức ngày.</details>'+SUPPORT_PACKS.map(p=>{
  const state=supportPackState(p);
  return `<div class="pack">${UIIMG(p.once?'gift':'people',36)}<span><b>${p.name}</b><br><small>⚡ Đầy · Stress −${p.stress}<br>${p.once?'1 lần/ván':'1 lần/ngày'}</small></span><button class="btn g" data-support="${p.id}" ${state?'disabled':''}>${state||p.cost+'💎'}</button></div>`;
 }).join('');
}
