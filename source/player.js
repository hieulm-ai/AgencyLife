// Nhân vật của người chơi (07/10/2026).
// - Màn mở đầu: (1) chọn nhân vật có sẵn, hoặc (2) tự tạo nhân vật (dáng, màu da, tóc, áo, quần); cả hai đều đặt tên agency.
//   Ván mới thêm bước 2: chọn 2 nhân vật đồng hành, bắt buộc đủ 1 Account + 1 nhân sự sản xuất mới khởi đầu được.
//   Vịt Vàng (linh vật của game) luôn có trong đội từ đầu, không tính vào 2 người đồng hành.
// - Tự tạo = đổi màu từng vùng trên ảnh của dáng gốc theo mặt nạ vùng (scripts/creator_masks.py), giữ nguyên bóng sáng tối.
// - Nhân vật của người chơi đứng cố định ở quầy lễ tân, nhận khách rồi mang job tới giao cho Account (office-flow.js).
// - Người chơi đổi được tên agency; tên các nhân sự khác cố định.
const PLAYER_PALETTE={
 skin:[["Sáng",[255,222,190]],["Hồng",[248,200,170]],["Vừa",[230,178,136]],["Ngăm",[194,138,98]],["Nâu",[144,96,66]]],
 hair:[["Đen",[40,34,36]],["Nâu đen",[72,48,40]],["Nâu",[120,76,48]],["Nâu sáng",[170,114,64]],["Vàng",[224,182,96]],["Đỏ",[170,60,50]],["Xanh than",[54,72,116]],["Hồng",[216,124,162]]],
 top:[["Trắng",[246,246,242]],["Đen",[46,44,48]],["Đỏ",[214,60,54]],["Cam",[238,140,54]],["Vàng",[244,204,72]],["Xanh lá",[74,160,94]],["Xanh dương",[62,120,206]],["Tím",[136,94,190]],["Hồng",[236,142,172]]],
 bottom:[["Đen",[42,42,46]],["Jeans",[72,106,160]],["Xanh nhạt",[142,174,214]],["Be",[214,190,150]],["Xám",[130,130,136]],["Nâu",[112,80,58]],["Trắng",[236,234,228]]]};
const PLAYER_PART_VN={skin:"Màu da",hair:"Màu tóc",top:"Màu áo",bottom:"Màu quần"};
const PLAYER_BASES=[["m","Nam · sơ mi"],["f","Nữ · tóc dài"],["m2","Nam · tóc ngắn"],["f2","Nữ · tóc ngắn"]];   // m2, f2: dáng vẽ riêng bằng Higgsfield (07/10/2026)
const PLAYER_REGION={skin:1,hair:2,top:3,bottom:4};
const PLAYER_SHEETS=[["src","walk"],["sit","sit"],["use","use"],["talk","talk"],["cele","cele"],["sad","sad"],["burn","burn"]];
const PLAYER_EXCLUDE=new Set(["09_Vit_Vang","trinh_lac_corrected_v2","P_custom"]);   // linh vật và ảnh 2 người không làm nhân vật chính
const PLAYER_NAME_MAX=20, AGENCY_NAME_MAX=24, AGENCY_DEFAULT="TYCOON AGENCY";
let introOpen=false, introFresh=false;

function sanitizeName(raw,max=PLAYER_NAME_MAX){
 return String(raw??"").normalize("NFC").replace(/[<>&"'`\\\u0000-\u001f\u007f]/g,"").replace(/\s+/g," ").trim().slice(0,max);
}
function validAgency(n){return typeof n==="string"&&!!n&&sanitizeName(n,AGENCY_NAME_MAX)===n;}
function agencyName(){return validAgency(GS.agencyName)?GS.agencyName:AGENCY_DEFAULT;}
function validLook(l){
 return !!l&&typeof l==="object"&&!Array.isArray(l)&&Object.prototype.hasOwnProperty.call(CREATOR.bases,l.base)&&
  Object.keys(PLAYER_REGION).every(k=>Number.isInteger(l[k])&&l[k]>=0&&l[k]<PLAYER_PALETTE[k].length);
}
function validPlayer(p){
 if(!p||typeof p!=="object"||Array.isArray(p))return false;
 if(typeof p.id!=="string"||!/^[A-Za-z0-9_]{1,40}$/.test(p.id))return false;
 if(p.name!==undefined&&(typeof p.name!=="string"||!p.name||sanitizeName(p.name)!==p.name))return false;   // tên nhân vật chỉ còn ở save cũ (trước 07/10 tối)
 if(p.kind==="custom")return p.id==="P_custom"&&validLook(p.look);
 return p.kind==="preset";
}
// Thang màu 3 nấc theo độ sáng của điểm ảnh trong vùng: tối nhất → 45% màu chọn, trung vị → đúng màu chọn, sáng nhất → pha 25% trắng.
const RAMP_LIGHT=.25, EDGE_T_MAX=.72;
function rampColor(c,t){
 if(t<.5){const k=t/.5;return c.map(v=>Math.round(v*.45+(v-v*.45)*k));}
 const k=(t-.5)/.5;return c.map(v=>Math.round(v+(255-v)*RAMP_LIGHT*k));
}
// Điểm ảnh sáng vượt hẳn mức sáng thường gặp của vùng là điểm chuyển tiếp ở mép (ví dụ mép tóc giáp mặt):
// không đẩy lên nấc sáng nhất, tránh viền răng cưa trắng khi đổi sang màu tối.
function lumT(y,[lo,mid,hi]){
 const t=y<mid?.5*Math.max(0,(y-lo)/Math.max(1,mid-lo)):.5+.5*Math.min(1,(y-mid)/Math.max(1,hi-mid));
 return y>hi+8?Math.min(t,EDGE_T_MAX):t;
}
// px: RGBA ảnh gốc (sửa tại chỗ); mask: RGBA ảnh mặt nạ (kênh đỏ = mã vùng × scale); lum: {mã vùng: [sáng thấp, trung vị, sáng cao]}.
function recolorPixels(px,mask,look,lum,scale){
 const col={};for(const k in PLAYER_REGION)col[PLAYER_REGION[k]]=PLAYER_PALETTE[k][look[k]][1];
 for(let i=0;i<px.length;i+=4){
  if(!px[i+3])continue;const r=Math.round(mask[i]/scale),c=col[r];if(!c)continue;
  const o=rampColor(c,lumT(.299*px[i]+.587*px[i+1]+.114*px[i+2],lum[r]||[0,128,255]));
  px[i]=o[0];px[i+1]=o[1];px[i+2]=o[2];
 }
 return px;
}
function loadPlayerImg(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error("Không tải được ảnh"));i.src=src;});}
function baseCharOf(key){const b=CREATOR.bases[key];if(b.sheets)return {id:b.char,...b.sheets,sitScale:b.sitScale};return BASE_SKIN_CHARS.find(c=>c.id===b.char)||CHARS.find(c=>c.id===b.char);}
function baseCell(key){const c=baseCharOf(key);return c?`<span class="ic-spr" aria-hidden="true" style="background-image:url('${c.src}')"></span>`:"";}
async function recolorSheet(baseSrc,maskSrc,look,lum){
 const [b,m]=await Promise.all([loadPlayerImg(baseSrc),loadPlayerImg(maskSrc)]);
 const c=document.createElement("canvas");c.width=b.naturalWidth;c.height=b.naturalHeight;const x=c.getContext("2d",{willReadFrequently:true});
 x.drawImage(m,0,0);const mk=x.getImageData(0,0,c.width,c.height).data;
 x.clearRect(0,0,c.width,c.height);x.drawImage(b,0,0);const d=x.getImageData(0,0,c.width,c.height);
 recolorPixels(d.data,mk,look,lum,CREATOR.scale);x.putImageData(d,0,0);return c;
}
function canvasUrl(c){return new Promise((ok,no)=>c.toBlob(b=>b?ok(URL.createObjectURL(b)):no(Error("blob")),"image/png"));}
async function buildCustomLook(look){
 const base=CREATOR.bases[look.base],ch=baseCharOf(look.base);
 const data={...ch,id:"P_custom",custom:true,chairBlue:null,chairErgo:null},images={chairBlue:null,chairErgo:null};
 await Promise.all(PLAYER_SHEETS.map(async([key,sheet])=>{
  if(!ch[key]||!base.masks[sheet]){data[key]=null;images[key]=null;return;}
  const url=await canvasUrl(await recolorSheet(ch[key],base.masks[sheet],look,base.lum));
  data[key]=url;images[key]=await loadPlayerImg(url);
 }));
 return {data,images};
}
async function applyCustomLook(){
 const ci=CHARS.findIndex(c=>c.id==="P_custom");
 if(ci<0||GS.player?.kind!=="custom"||!validLook(GS.player.look))return;
 try{const {data,images}=await buildCustomLook(GS.player.look);applySkinImages(ci,data,images);updatePlayerAvatar();if(document.getElementById("staff").classList.contains("open"))renderStaff();}
 catch(e){toast("Chưa dựng được màu nhân vật tự tạo; tạm hiện màu của dáng gốc.","err");}
}
function updatePlayerAvatar(){
 const ch=CHARS.find(c=>c.id===FOUNDER_ID),img=document.getElementById("coImg"),av=document.querySelector("#co .av"),nm=document.querySelector("#co .nm");
 if(ch&&img)img.src=ch.custom?ch.src:(typeof CHAR_BASE_SRC!=="undefined"&&CHAR_BASE_SRC[ch.id])||ch.src;   // portrait cố định; nhân vật tự tạo dùng ảnh đã đổi màu
 if(nm){nm.textContent=agencyName();nm.title=agencyName();}
 if(av){const t=`Agency của bạn: ${agencyName()} · bấm để đổi tên agency`;av.title=t;av.setAttribute("aria-label",t);}
 const day=document.querySelector("#dayTransition .day-copy > span");if(day)day.textContent=agencyName().toUpperCase();
}

// ---------- đổi tên agency ----------
function renameAgency(raw){
 const name=sanitizeName(raw,AGENCY_NAME_MAX);
 if(!name){toast("Tên agency không được để trống","err");return false;}
 const prev=GS.agencyName;GS.agencyName=name;
 if(!save()){GS.agencyName=prev;toast("Trình duyệt đang chặn lưu nên chưa đổi được tên agency.","err");return false;}
 updatePlayerAvatar();if(document.getElementById("staff").classList.contains("open"))renderStaff();
 toast(`Đã đổi tên agency thành ${name}`,"ok");return true;
}
function openPlayerCard(){
 const box=document.getElementById("playerCard"),ch=CHARS.find(c=>c.id===FOUNDER_ID);
 box.innerHTML=`<div class="ph">Agency của bạn</div><div class="pc-row"><span class="pc-face" aria-hidden="true"></span><span><b class="pc-name"></b><small>Nhân vật của bạn: <span class="pc-who"></span> · lễ tân</small></span></div>
  <label class="pc-lab">Tên agency<input id="pcName" maxlength="${AGENCY_NAME_MAX}" autocomplete="off"></label>
  <small class="pc-note">Nhân vật của bạn đứng ở quầy lễ tân, nhận khách và mang job tới giao cho Account. Tên các nhân sự khác giữ nguyên.</small>
  <div class="pc-act"><button class="btn c" id="pcNo">Hủy</button><button class="btn g" id="pcOk">Lưu tên</button></div>`;
 if(ch)box.querySelector(".pc-face").style.backgroundImage=`url("${ch.src}")`;
 box.querySelector(".pc-name").textContent=agencyName();
 box.querySelector(".pc-who").textContent=staffName(FOUNDER_ID);
 const inp=box.querySelector("#pcName");inp.value=GS.agencyName||"";inp.placeholder="Ví dụ: Sao Mai Agency";
 box.classList.add("open");inp.focus();inp.select();
 const close=()=>box.classList.remove("open");
 box.querySelector("#pcNo").onclick=close;
 box.querySelector("#pcOk").onclick=()=>{if(renameAgency(inp.value))close();};
 inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();if(renameAgency(inp.value))close();}if(e.key==="Escape")close();};
}

// ---------- màn mở đầu ----------
function presetIds(){return CHARS.map(c=>c.id).filter(id=>!PLAYER_EXCLUDE.has(id));}
function baseName(id){return STAFF_NAME[id]||id.replace(/^\d+_/,"").replace(/_corrected_v2/,"").replace(/_/g," ");}
const AGENCY_PLACEHOLDER="Ví dụ: Sao Mai Agency";
function spriteCell(id){const c=BASE_SKIN_CHARS.find(x=>x.id===id)||CHARS.find(x=>x.id===id);return `<span class="ic-spr" aria-hidden="true" style="background-image:url('${c.src}')"></span>`;}
const creatorCache={};
async function creatorBase(key){
 if(creatorCache[key])return creatorCache[key];
 const base=CREATOR.bases[key],ch=baseCharOf(key),[b,m]=await Promise.all([loadPlayerImg(ch.src),loadPlayerImg(base.masks.walk)]);
 const c=document.createElement("canvas");c.width=b.naturalWidth;c.height=b.naturalHeight;const x=c.getContext("2d",{willReadFrequently:true});
 x.drawImage(m,0,0);const mask=x.getImageData(0,0,c.width,c.height).data;x.clearRect(0,0,c.width,c.height);x.drawImage(b,0,0);
 return creatorCache[key]={w:c.width,h:c.height,px:x.getImageData(0,0,c.width,c.height).data,mask,lum:base.lum};
}
function openIntro(fresh){
 introFresh=!!fresh;introOpen=true;
 const el=document.getElementById("intro");el.hidden=false;el.removeAttribute("inert");
 const look={base:"m",skin:0,hair:1,top:6,bottom:0},ids=presetIds();
 let sel=ids.includes(FOUNDER_ID)?FOUNDER_ID:ids[0],anim=0,sheet=null,raf=0,agencyDraft=GS.agencyName||"",picks=[];
 const step=n=>introFresh?`<span class="intro-step">Bước ${n}/2</span> `:"";
 const body=el.querySelector(".intro-body");
 const stopAnim=()=>{if(raf)cancelAnimationFrame(raf);raf=0;};
 function choose(){
  stopAnim();
  body.innerHTML=`<p class="intro-lead">Bạn muốn vào game bằng nhân vật nào? Nhân vật của bạn sẽ đứng quầy lễ tân và giao việc cho Account.${introFresh?" Sau đó chọn thêm 2 nhân vật đồng hành.":""}</p><div class="intro-opts">
   <button class="intro-opt" data-go="preset"><span class="intro-trio">${ids.slice(0,3).map(spriteCell).join("")}</span><b>Chọn nhân vật có sẵn</b><small>${ids.length} nhân vật · bạn đặt tên agency</small></button>
   <button class="intro-opt" data-go="custom"><span class="intro-trio">${["m2","f2"].map(baseCell).join("")}<span class="intro-plus" aria-hidden="true">+</span></span><b>Tự tạo nhân vật</b><small>Chọn dáng, màu da, tóc, áo, quần · đặt tên agency</small></button></div>
   <p class="intro-help"><button class="btn c" data-guide>Xem hướng dẫn chơi</button></p>`;
  body.querySelector('[data-go="preset"]').onclick=preset;body.querySelector('[data-go="custom"]').onclick=custom;
  body.querySelector('[data-guide]').onclick=()=>openGuide(0);
  body.querySelector('[data-go="preset"]').focus();
 }
 function nameRow(){return `<label class="intro-name">Tên agency của bạn<input id="introName" maxlength="${AGENCY_NAME_MAX}" autocomplete="off" placeholder="${AGENCY_PLACEHOLDER}" value=""></label>`;}
 function actions(label){return `<div class="intro-act"><button class="btn c" id="introBack">Quay lại</button><button class="btn g" id="introGo">${label||(introFresh?"Tiếp: chọn đồng hành":"Bắt đầu")}</button></div>`;}
 // Ván mới: kiểm tên agency rồi sang bước chọn đồng hành; bản lưu cũ giữ đội hiện có nên bắt đầu luôn.
 function next(choice){
  if(!introFresh)return confirmIntro(choice);
  if(!sanitizeName(choice.agency,AGENCY_NAME_MAX)){toast("Hãy nhập tên agency của bạn","err");body.querySelector("#introName")?.focus();return false;}
  companions(choice);return true;
 }
 function companions(choice){
  stopAnim();
  const pid=choice.kind==="custom"?"P_custom":choice.id,pool=companionPool(pid);
  picks=picks.filter(id=>pool.includes(id));
  body.innerHTML=`<p class="intro-lead">${step(2)}Chọn thêm 2 nhân vật đồng hành</p>
   <div class="intro-rule" role="note"><b>Cần chọn đủ 2 chức vụ dưới đây thì mới khởi đầu được:</b><ul>${COMPANION_SLOTS.map(s=>`<li data-slot="${s.key}"><span class="intro-tick" aria-hidden="true"></span><span><b>1 ${slotText(s)}</b> · ${s.why}</span></li>`).join("")}</ul><small>Vịt Vàng là linh vật của game, luôn có trong đội từ đầu và không tính vào 2 người này. Các chức vụ khác tuyển thêm trong game.</small></div>
   <div class="intro-grid" role="listbox" aria-multiselectable="true" aria-label="Nhân vật đồng hành">${pool.map(id=>`<button class="intro-char" role="option" data-id="${id}" data-fit="${companionSlot(id)?"1":"0"}" aria-selected="${picks.includes(id)}">${spriteCell(id)}<b></b><small>${STAFF_ROLE[id]}</small></button>`).join("")}</div>
   <p class="intro-msg" aria-live="polite" tabindex="-1"></p>${actions("Bắt đầu")}`;
  body.querySelectorAll(".intro-char").forEach(b=>{b.querySelector("b").textContent=baseName(b.dataset.id);});
  const go=body.querySelector("#introGo"),msg=body.querySelector(".intro-msg");
  const refresh=()=>{
   const chk=companionCheck(picks);
   body.querySelectorAll(".intro-rule li").forEach(li=>li.dataset.ok=String(!chk.missing.some(s=>s.key===li.dataset.slot)));
   body.querySelectorAll(".intro-char").forEach(b=>b.setAttribute("aria-selected",String(picks.includes(b.dataset.id))));
   go.setAttribute("aria-disabled",String(!chk.ok));
   msg.dataset.ok=String(chk.ok);msg.textContent=companionMessage(picks);
  };
  body.querySelectorAll(".intro-char").forEach(b=>b.onclick=()=>{const id=b.dataset.id;
   if(picks.includes(id))picks=picks.filter(x=>x!==id);else{if(picks.length>=2)picks.shift();picks.push(id);}   // đủ 2 người: chọn người mới thay người chọn trước
   refresh();});
  body.querySelector("#introBack").onclick=()=>choice.kind==="custom"?custom():preset();
  // Chưa đủ chức vụ: không bắt đầu, rung dòng thông báo và khung yêu cầu (không dùng toast để khỏi che tiêu đề).
  go.onclick=()=>{const chk=companionCheck(picks);if(!chk.ok){refresh();for(const el of [msg,body.querySelector(".intro-rule")]){el.classList.remove("flash");void el.offsetWidth;el.classList.add("flash");}msg.focus?.();return;}confirmIntro({...choice,companions:[...picks]});};
  refresh();
 }
 function preset(){
  stopAnim();
  body.innerHTML=`<p class="intro-lead">${step(1)}Chọn nhân vật của bạn rồi đặt tên agency.</p><div class="intro-grid" role="listbox" aria-label="Nhân vật có sẵn">${ids.map(id=>`<button class="intro-char" role="option" data-id="${id}" aria-selected="${id===sel}">${spriteCell(id)}<b></b><small>${roleOf(id)}</small></button>`).join("")}</div>${nameRow()}${actions()}`;
  body.querySelectorAll(".intro-char").forEach(b=>{b.querySelector("b").textContent=baseName(b.dataset.id);});
  const inp=body.querySelector("#introName");inp.value=agencyDraft;inp.oninput=()=>{agencyDraft=inp.value;};
  body.querySelectorAll(".intro-char").forEach(b=>b.onclick=()=>{sel=b.dataset.id;body.querySelectorAll(".intro-char").forEach(x=>x.setAttribute("aria-selected",String(x===b)));});
  body.querySelector("#introBack").onclick=choose;
  body.querySelector("#introGo").onclick=()=>next({kind:"preset",id:sel,agency:inp.value});
  inp.onkeydown=e=>{if(e.key==="Enter")body.querySelector("#introGo").click();};
  body.querySelector(`.intro-char[data-id="${sel}"]`)?.scrollIntoView({block:"nearest"});
 }
 function custom(){
  stopAnim();
  const sw=(part)=>`<div class="intro-part"><span>${PLAYER_PART_VN[part]}</span><div class="intro-sw" role="radiogroup" aria-label="${PLAYER_PART_VN[part]}">${PLAYER_PALETTE[part].map(([n,c],i)=>`<button role="radio" data-part="${part}" data-i="${i}" title="${n}" aria-label="${n}" aria-checked="${look[part]===i}" style="background:rgb(${c.join(",")})"></button>`).join("")}</div></div>`;
  body.innerHTML=`${introFresh?`<p class="intro-lead">${step(1)}Tự tạo nhân vật của bạn rồi đặt tên agency.</p>`:""}<div class="intro-make"><div class="intro-stage"><canvas id="introPv" width="216" height="150" aria-label="Xem trước nhân vật"></canvas><small>Mặt trước · mặt sau</small></div>
   <div class="intro-ctl"><div class="intro-part"><span>Dáng</span><div class="intro-seg" role="radiogroup" aria-label="Dáng">${PLAYER_BASES.map(([k,n])=>`<button role="radio" data-base="${k}" aria-checked="${look.base===k}">${baseCell(k)}<span>${n}</span></button>`).join("")}</div></div>
   ${Object.keys(PLAYER_REGION).map(sw).join("")}${nameRow()}</div></div>${actions()}`;
  const cv=body.querySelector("#introPv"),cx=cv.getContext("2d"),off=document.createElement("canvas"),ox=off.getContext("2d");
  async function repaint(){
   try{const b=await creatorBase(look.base);off.width=b.w;off.height=b.h;const d=new ImageData(new Uint8ClampedArray(b.px),b.w,b.h);recolorPixels(d.data,b.mask,look,b.lum,CREATOR.scale);ox.putImageData(d,0,0);sheet=off;}
   catch(e){sheet=null;cx.clearRect(0,0,cv.width,cv.height);cx.fillStyle="#7A5A3A";cx.font="12px sans-serif";cx.fillText("Không xem trước được",40,80);}
  }
  function tick(t){
   raf=requestAnimationFrame(tick);if(!sheet)return;const col=[0,1,2,1][Math.floor(t/180)%4];
   cx.clearRect(0,0,cv.width,cv.height);cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality="high";
   cx.fillStyle="rgba(80,40,10,.18)";for(const x0 of [54,162]){cx.beginPath();cx.ellipse(x0,138,26,7,0,0,Math.PI*2);cx.fill();}
   cx.drawImage(sheet,col*96,0,96,128,6,10,96,128);cx.drawImage(sheet,col*96,128,96,128,114,10,96,128);
  }
  body.querySelectorAll("[data-base]").forEach(b=>b.onclick=()=>{look.base=b.dataset.base;body.querySelectorAll("[data-base]").forEach(x=>x.setAttribute("aria-checked",String(x===b)));repaint();});
  body.querySelectorAll("[data-part]").forEach(b=>b.onclick=()=>{look[b.dataset.part]=+b.dataset.i;body.querySelectorAll(`[data-part="${b.dataset.part}"]`).forEach(x=>x.setAttribute("aria-checked",String(x===b)));repaint();});
  const inp=body.querySelector("#introName");inp.value=agencyDraft;inp.oninput=()=>{agencyDraft=inp.value;};
  body.querySelector("#introBack").onclick=choose;
  body.querySelector("#introGo").onclick=()=>next({kind:"custom",agency:inp.value,look:{...look}});
  inp.onkeydown=e=>{if(e.key==="Enter")body.querySelector("#introGo").click();};
  repaint().then(()=>{raf=requestAnimationFrame(tick);});
 }
 choose();
}
// Đội khởi đầu: nhân vật của bạn (lễ tân) + 2 đồng hành bắt buộc gồm 1 Account (nhận job lễ tân giao) và 1 nhân sự sản xuất, + Vịt Vàng.
const COMPANION_SLOTS=[
 {key:"account",label:"Account",roles:["Account"],why:"nhận job từ lễ tân, theo khách"},
 {key:"maker",label:"nhân sự sản xuất",roles:["Design","AI Designer","Content","Editor"],why:"làm ra sản phẩm"}];
const ROLE_ORDER=["Account","Design","AI Designer","Content","Editor"];
function slotText(s){return s.roles.length===1&&s.roles[0]===s.label?s.label:`${s.label} (${s.roles.join(", ")})`;}
function companionSlot(id){return COMPANION_SLOTS.find(s=>s.roles.includes(STAFF_ROLE[id]))||null;}
function companionPool(playerId){
 const rank=id=>{const i=ROLE_ORDER.indexOf(STAFF_ROLE[id]);return i<0?99:i;};
 return CHARS.map(c=>c.id).filter(id=>id!==playerId&&id!==MASCOT_ID&&id!=="P_custom"&&STAFF_ROLE[id]).sort((a,b)=>rank(a)-rank(b));
}
function companionCheck(ids){
 const list=Array.isArray(ids)?ids:[],missing=COMPANION_SLOTS.filter(s=>!list.some(id=>s.roles.includes(STAFF_ROLE[id])));
 return {ok:list.length===2&&new Set(list).size===2&&!missing.length,missing};
}
function companionMessage(ids){
 const chk=companionCheck(ids);if(chk.ok)return "Đủ chức vụ · bấm Bắt đầu để mở văn phòng.";
 const need=chk.missing.map(s=>"1 "+slotText(s));
 return `Đã chọn ${ids.length}/2 · `+(need.length?`Cần chọn ${need.join(" và ")} thì mới khởi đầu được.`:"Cần chọn đủ 2 người.");
}
function starterTeam(playerId,companions){return [...new Set([playerId,...companions,MASCOT_ID])];}
function confirmIntro(choice){
 const agency=sanitizeName(choice.agency,AGENCY_NAME_MAX);
 if(!agency){toast("Hãy nhập tên agency của bạn","err");document.getElementById("introName")?.focus();return false;}
 const prev=FOUNDER_ID,prevAgency=GS.agencyName,prevPlayer=GS.player,prevStaff=GS.staffIds;
 const player=choice.kind==="custom"?{kind:"custom",id:"P_custom",look:{...choice.look}}:{kind:"preset",id:choice.id};
 if(!validPlayer(player)){toast("Lựa chọn nhân vật chưa hợp lệ","err");return false;}
 if(introFresh&&(!companionCheck(choice.companions).ok||choice.companions.includes(player.id))){toast(companionMessage(choice.companions||[]),"err");return false;}
 GS.player=player;GS.agencyName=agency;GS.homeSeats=GS.homeSeats||{};delete GS.introPending;
 if(introFresh){   // ván mới: bạn + 2 đồng hành + Vịt Vàng; bàn của người sáng lập cũ để trống cho người khác
  GS.staffIds=starterTeam(player.id,choice.companions);
  if(GS.homeSeats[prev]!=null&&!GS.staffIds.includes(prev))delete GS.homeSeats[prev];
 }else if(Array.isArray(GS.staffIds)&&!GS.staffIds.includes(player.id))GS.staffIds.push(player.id);
 if(!save()){GS.player=prevPlayer;GS.agencyName=prevAgency;GS.staffIds=prevStaff;if(introFresh)GS.introPending=true;toast("Trình duyệt đang chặn lưu nên chưa mở được agency mới.","err");closeIntro();return false;}
 const el=document.getElementById("intro"),lead=document.createElement("p");lead.className="intro-lead";lead.textContent=`Đang mở văn phòng ${agency}…`;
 el.querySelector(".intro-body").replaceChildren(lead);
 try{if(typeof sessionStorage!=='undefined')sessionStorage.setItem(SAVE+'.enter','1');}catch(e){}
 location.reload();return true;
}
function closeIntro(){introOpen=false;const el=document.getElementById("intro");el.hidden=true;el.setAttribute("inert","");}
