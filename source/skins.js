// Cosmetic ownership uses character IDs so catalog order may change safely.
const SKINS=__SKIN_DATA__;
const BASE_SKIN_CHARS=CHARS.map(c=>({...c}));
const SKIN_BUSY=new Set();
const SKIN_PRICE=50;
function ensureSkins(){
  if(!Array.isArray(GS.ownedSkins)) GS.ownedSkins=[];
  if(!Array.isArray(GS.equippedSkins)) GS.equippedSkins=[];
  GS.ownedSkins=GS.ownedSkins.filter(id=>SKINS[id]);
  GS.equippedSkins=GS.equippedSkins.filter(id=>GS.ownedSkins.includes(id));
}
function skinImage(src){
  if(!src) return Promise.resolve(null);
  return new Promise((resolve,reject)=>{
    const im=new Image(); im.onload=()=>resolve(im); im.onerror=()=>reject(new Error('Không tải được hình skin')); im.src=src;
  });
}
async function loadSkinImages(data){
  const keys=['src','sit','use','talk','cele','sad','chairBlue','chairErgo','burn'];
  const values=await Promise.all(keys.map(k=>skinImage(data[k])));
  return Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
}
function applySkinImages(ci,data,images){
  CHARS[ci]={...data}; IMGS[ci]=images.src; SIMGS[ci]=images.sit; UIMGS[ci]=images.use;
  for(const k of ['talk','cele','sad']) RIMGS[k][ci]=images[k];
  CIMGS[ci]={office_chair_blue:images.chairBlue,ergo_chair:images.chairErgo};
  BIMGS[ci]=images.burn; SEAT_COMPOSITES.clear();
}
async function changeSkin(id){
  ensureSkins(); const ci=CHARS.findIndex(c=>c.id===id);
  if(ci<0||!SKINS[id]||SKIN_BUSY.has(id)) return;
  const owned=GS.ownedSkins.includes(id), equipped=GS.equippedSkins.includes(id);
  if(!owned&&GS.gems<SKIN_PRICE){ toast('Cần 50 ruby để mua trang phục này','err'); return; }
  SKIN_BUSY.add(id); renderGemShop();
  try{
    const data=equipped?BASE_SKIN_CHARS[ci]:SKINS[id],images=await loadSkinImages(data);
    // Recheck after loading: another purchase may have used the shared balance.
    if(!owned){
      if(GS.gems<SKIN_PRICE){ toast('Không đủ ruby; chưa mua trang phục','err'); return; }
      GS.gems-=SKIN_PRICE; GS.ownedSkins.push(id);
    }
    GS.equippedSkins=GS.equippedSkins.filter(x=>x!==id);
    if(!equipped) GS.equippedSkins.push(id);
    applySkinImages(ci,data,images); save(); hud(); updatePanels();
    toast(equipped?'Đã mặc trang phục gốc':owned?'Đã mặc Streetwear':'Đã mua và mặc Streetwear · −50 ruby','ok');
  }catch(error){ toast('Chưa tải được skin. Ruby chưa bị trừ; hãy thử lại.','err'); }
  finally{ SKIN_BUSY.delete(id); renderGemShop(); }
}
async function restoreSkins(){
  ensureSkins();
  await Promise.all(GS.equippedSkins.map(async id=>{
    const ci=CHARS.findIndex(c=>c.id===id); if(ci<0) return;
    SKIN_BUSY.add(id);
    try{ applySkinImages(ci,SKINS[id],await loadSkinImages(SKINS[id])); }
    catch(error){ toast('Skin chưa tải được; tạm hiển thị trang phục gốc','err'); }
    finally{ SKIN_BUSY.delete(id); }
  }));
}
function renderSkinShop(){
  ensureSkins();
  return '<div class="cg2">Streetwear · 50💎</div><div class="skin-grid">'+
    CHARS.filter(c=>SKINS[c.id]).map(c=>{
      const owned=GS.ownedSkins.includes(c.id),equipped=GS.equippedSkins.includes(c.id),busy=SKIN_BUSY.has(c.id);
      const name=staffName(c.id);   // tên hiển thị chung (staff.js), không dùng mã ID
      return `<div class="pack skin-card">${staffAvatar(c.id)}<span style="display:block;width:48px;height:64px;background-image:url('${SKINS[c.id].src}');background-size:144px 128px;background-position:-48px 0"></span><span><b>${name}</b><br><small>${equipped?'Đang mặc':owned?'Đã có':''}</small></span><button class="btn b" data-skin="${c.id}" ${busy?'disabled':''}>${busy?'Đang tải…':equipped?'Mặc đồ gốc':owned?'Mặc':'Mua 50💎'}</button></div>`;
    }).join('')+'</div>';
}
