// Hướng dẫn chơi trong game (07/10/2026, V13; cập nhật theo hệ thống bảng V15): 9 trang, mở từ màn mở đầu và biểu tượng Hướng dẫn ở góc trên phải.
// Mọi con số trong trang lấy theo thông số đang chạy trong game (HIRE_COST, MEETING_MINUTES, EN_MAX…), không gõ tay.
let guideOpen=false, guidePage=0, guideReturn=null;
function guidePages(){
 const h=n=>`${n} phút game`;
 return [
  {id:"goal",icon:"star",title:"Mục tiêu",lead:"Bạn mở một agency: đón khách, nhận job, giao cho đội làm, giao sản phẩm và thu tiền.",
   items:["Tiền dùng để <b>tuyển người</b>, <b>mua nội thất</b> và <b>mở rộng khu đất</b>.",
    "Mỗi khu đất mở thêm tăng <b>cấp văn phòng</b>; cấp càng cao, job càng nhiều tiền.",
    "Giao job xong được <b>+10 danh tiếng</b> (VIP thêm +5, xong trước hạn thêm +2); trễ hạn <b>−8</b>. Khách chấm <b>1–5 sao</b> (5★ +5 · 1★ −8): người làm đúng chuyên môn thì sao cao.",
    "Bấm dải <b>★ Danh tiếng</b> dưới ảnh nhân vật để xem cấp, đọc đánh giá và <b>trả lời khách 2 lượt</b>. Xong bước Sản xuất, khách có thể <b>góp ý</b>: chọn Sửa kỹ, Thuyết phục hoặc để Account sửa nhẹ."],
   tip:"Game tự lưu trong trình duyệt. Muốn giữ file: Cài đặt → Tải bản lưu."},
  {id:"reception",icon:"brief",title:"Đón khách ở quầy lễ tân",lead:"HR, Kế toán và Trợ lý luân phiên tiếp khách; người chơi hỗ trợ khi thiếu người.",
   items:["Khách xếp hàng trước quầy; bạn tiếp từng người khoảng <b>2 giây</b> để nhận brief.",
    "Mở <b>Công việc</b> (cặp hồ sơ) → tab <b>Khách chờ</b> để <b>Nhận job</b> hoặc <b>Từ chối job</b>. Từ chối không mất danh tiếng.",
    `Nhận job tốn <b>năng lượng ⚡</b> (bằng nửa số giờ công). Khách chỉ chờ tối đa <b>${h(typeof patienceMin==='function'?patienceMin():PATIENCE_MIN)}</b> trước khi bạn nhận.`,
    "Nhận xong, bạn mang brief tới <b>Account</b> gần nhất rồi về quầy. Job bắt đầu làm ngay, không chờ giao xong.",
    (()=>{const pk=typeof founderPerk==="function"&&founderPerk();return pk?`Thế mạnh của bạn theo nghề gốc <b>${STAFF_ROLE[GS.player.id]}</b>: ${pk.t}.`:"Nhân vật chọn sẵn có thế mạnh theo nghề gốc (Sale, Account, HR…); nhân vật tự tạo thì không.";})()],
   tip:"Khách tới khi bạn đang đi giao việc sẽ đứng chờ ở quầy."},
  {id:"work",icon:"clock",title:"Làm job",lead:"Mỗi job đi qua Account → Planner → Content → Design; xong bước nào, người làm mang hồ sơ sang bàn người làm bước kế.",
   items:["<b>Brief</b> (Account) → <b>Chia việc</b> (Planner – Đốc Giám) → <b>Sáng tạo</b> (Content) → <b>Sản xuất</b> (Design). Chưa có Planner thì Account hoặc Content chia việc thay, chậm hơn.",
    "<b>Job video</b> (TikTok, Reels, TVC, Livestream, review, phim doanh nghiệp, chụp ảnh): thêm bước <b>Quay</b> tại máy quay (hoặc đèn softbox) và bước cuối là <b>Dựng</b> (Editor). <b>Podcast</b>: bước <b>Thu âm</b> tại phòng thu (Âm thanh). <b>Dựng video sự kiện</b>: khách gửi sẵn cảnh quay, Editor làm phần lớn.",
    "<b>Quay phim</b> (Min) vừa quay vừa dựng đúng nghề; <b>Âm thanh</b> (Liu) thu âm; <b>Editor</b> dựng, quay/thu âm ở mức gần nghề. Không có máy quay hay phòng thu thì bước đó làm ở bàn.",
    "Đúng chuyên môn làm nhanh ×1,35; gần chuyên môn ×1; trái nghề ×0,6. Thiếu bộ phận thì người khác làm thay. Vòng trên đầu nhân vật: icon bộ phận + tiến độ bước.",
    `Làm tối đa <b>${jobCapacity()} job</b> cùng lúc; tuyển thêm người làm job sẽ tăng số chỗ nhận việc. Trong <b>Công việc → Đang làm</b>: <b>Ưu tiên làm trước</b>, <b>Phân công nhân sự</b>, <b>Xếp theo hạn giao</b>.`,
    `Job từ <b>60 giờ công</b> hoặc cần bàn họp: khách và 1 nhân viên họp <b>${h(MEETING_MINUTES)}</b> ở bàn họp rồi mới làm.`,
    "<b>Ghế công thái học</b> làm nhanh hơn 20% và tăng stress chậm hơn.",
    "Tạm dừng sản xuất không dừng hạn giao. Qua ngày hạn mà chưa xong là trễ hạn."],
   tip:"Có HR trong đội: mỗi ngày Tuyển dụng có 1 ứng viên nổi bật làm nhanh hơn 20%. Kế toán đi thu công nợ nhanh hơn."},
  {id:"staff",icon:"people",title:"Nhân sự và stress",lead:"Đội làm việc càng lâu càng mệt; giữ stress thấp để làm nhanh.",
   items:[`Tuyển thêm trong <b>Đội ngũ → Tuyển dụng</b>: <b>${typeof hireCost==='function'?hireCost():HIRE_COST} triệu/người</b>, cần có bàn trống.`,
    "Stress trên <b>75</b>: làm chậm còn 60% và tự đi nghỉ; xuống <b>55</b> thì quay lại bàn.",
    "Stress <b>100</b>: nhân viên <b>bốc cháy</b>, nghỉ 90 phút game.",
    "Bấm vào nhân viên → <b>Cho nghỉ</b> (−25 stress, chờ 30 phút game mới cho nghỉ tiếp). Mỗi đêm cả đội giảm 25 stress.",
    `Cà phê, cây nước, mèo, bể cá, cây to và <b>Vịt Vàng</b> (bán kính ${MASCOT_RADIUS} ô) giúp giảm stress.`],
   tip:"Vịt Vàng là linh vật của game: luôn ở văn phòng, không làm job."},
  {id:"money",icon:"coin",title:"Giao sản phẩm và thu tiền",lead:"Job xong, khách tới quầy nhận sản phẩm; tiền về tùy loại job.",
   items:["Khách ngồi sofa chờ thì tới quầy nhận ngay; khách đã về sẽ quay lại xếp hàng.",
    "Job thường trả tiền khi xong. Job VIP <b>thanh toán sau</b> tạo công nợ: vào <b>Công việc → Bàn giao & công nợ</b>, cử nhân viên đi thu <b>trước 20:00</b> (30 phút game ở điểm hẹn, cộng thời gian đi lại).",
    "Xong job trước hạn được <b>+1 ruby</b>; job VIP còn thưởng thêm ruby.",
    `Ruby (kim cương): mọi thứ mua bằng ruby (gói hỗ trợ, đồ mặc, nạp ruby, VIP) nằm ở <b>Cửa hàng → Cửa hàng ruby</b>; 1 ruby quy đổi ${RUBY_COIN} triệu coin khi tính giá nội thất.`],
   tip:"Giữ quầy lễ tân có lối đi hai phía để bàn giao được sản phẩm."},
  {id:"build",icon:"hammer",title:"Xây văn phòng",lead:"Tự xây tường, đặt cửa và bày nội thất cho văn phòng.",
   items:["<b>Xây dựng → Nội thất</b>: chọn món → bấm lên sàn → <b>Đồng ý</b> / <b>Từ chối</b> / <b>Xoay</b> / <b>Vào kho</b> (mua để dành). Món đỏ lên là thiếu tiền hoặc chỗ không đặt được.",
    "<b>Tường & sàn</b>: kéo trên sàn để xây tường hoặc lát nền, bấm tường để đặt cửa; <b>Phá</b> để bỏ.",
    `<b>Di chuyển</b>: kéo món đồ tới chỗ mới rồi Đồng ý; <b>Cất kho</b> để cất đi, đặt lại sau không mất tiền (Cửa hàng → Kho). Bán đồ hoàn ${Math.round(REFUND*100)}% giá.`,
    "Chừa lối đi tới ghế, quầy và tiện ích. Sảnh trước cửa không đặt được đồ.",
    "<b>Mở rộng</b>: mở khu đất kế bên khi đủ tiền, hoặc bấm biểu tượng ổ khóa trên bản đồ."],
   tip:"Đặt nhầm? Bấm Hoàn tác hoặc Ctrl+Z."},
  {id:"day",icon:"trophy",title:"Một ngày ở agency",lead:"Ngày làm việc từ 08:00 tới 21:00; tan làm xong, ngày mới tự bắt đầu.",
   items:["1 phút game trôi trong <b>1 giây thật</b>: một ngày làm việc (13 giờ game) dài khoảng 13 phút.",
    `Năng lượng ⚡ hồi 1 điểm mỗi ${EN_REGEN_S} giây thật, tối đa ${EN_MAX}; mỗi ngày dùng tối đa ${EN_DAY_CAP}.`,
    "<b>Thành tựu</b> (cúp): nhiệm vụ, quà đăng nhập, Pass tuần và thành tựu cho thêm ruby; một số mốc tặng vật phẩm vào <b>Kho</b>.",
    "<b>Hôm nay</b> (biểu đồ, góc trên phải) tổng kết ngày trước và nhắc job sắp đến hạn, công nợ, người stress cao."],
   tip:"Khi bạn ẩn tab, giờ game và kiên nhẫn của khách dừng lại; năng lượng vẫn hồi."},
  {id:"friends",icon:"friends",title:"Bạn bè và Hộp thư",lead:"Đăng nhập để lưu tiến độ lên tài khoản, kết bạn và ghé thăm agency của nhau.",
   items:["<b>Cài đặt → Tài khoản</b>: đăng nhập bằng email, Google hoặc Facebook. Không đăng nhập vẫn chơi bình thường, tiến độ nằm trên máy này.",
    "Nút <b>Bạn bè</b> (góc trên phải): gửi <b>mã bạn</b> dạng AGN-XXXX cho nhau để kết bạn, tối đa 50 bạn.",
    "<b>Tham quan</b>: xem văn phòng của bạn (chỉ xem). Mỗi ngày được <b>thích</b> 1 lần, gửi 3 lời nhắn và <b>tặng 1 quà</b> cho mỗi bạn; tặng được nhiều bạn trong ngày.",
    "<b>Hộp thư</b> (phong bì): quà, lời nhắn, lượt thích của bạn bè và Bảng tin văn phòng. Bấm <b>Nhận</b> hoặc <b>Nhận tất cả</b> để quà vào <b>Kho</b> (ruby cộng thẳng).",
    "<b>Xếp hạng</b> (Bạn bè → Xếp hạng): so Uy tín, Job xong, Lượt thích hoặc Cấp giữa bạn và bạn bè. Số liệu cập nhật khi mỗi agency lưu lên tài khoản.",
    "<b>Mượn nhân viên</b> (Bạn bè → ⋯): mượn 1 người bạn mình chưa có, làm tới hết ngày game rồi về. Bạn trả <b>tiền mượn bằng 2 ngày lương</b> một lần (không trả lương ngày); bạn bè vẫn giữ người và nhận số tiền đó trong Hộp thư. Mỗi ngày game mượn 1 người, không mượn sau 20:00."],
   tip:"Quà do game tặng, không lấy từ Kho của bạn; danh sách quà đổi mỗi ngày."},
  {id:"controls",icon:"hand",title:"Điều khiển",lead:"Chơi bằng chuột, bàn phím hoặc màn hình cảm ứng (xoay ngang điện thoại).",
   items:["Kéo trên bản đồ để xem chỗ khác; lăn chuột hoặc chụm 2 ngón để phóng to, thu nhỏ.",
    "Phím <b>1</b> kéo bản đồ · <b>2</b> tường · <b>3</b> cửa · <b>4</b> tẩy · <b>5</b> nội thất.",
    "<b>R</b> xoay · <b>Enter</b> đồng ý · <b>Esc</b> hủy · <b>Ctrl+Z</b> hoàn tác.",
    "Mỗi lần chỉ mở một bảng bên phải: bấm lại nút đang mở, nút ✕ hoặc <b>Esc</b> để đóng.",
    "Bấm vào nhân viên để xem stress; bấm ảnh đại diện góc trên trái để đổi tên agency."],
   tip:"Mở lại hướng dẫn này bất cứ lúc nào: biểu tượng Hướng dẫn (sách xanh) ở góc trên phải."}];
}
function guideIcon(n,s){const src=window.UIICON&&window.UIICON[n];return src?`<img src="${src}" width="${s}" height="${s}" alt="" style="image-rendering:pixelated">`:"";}
function renderGuide(){
 const pages=guidePages(),p=pages[guidePage],el=document.getElementById("guide");
 el.querySelector(".guide-nav").innerHTML=pages.map((x,i)=>`<button role="tab" data-gp="${i}" aria-selected="${i===guidePage}" aria-controls="guidePage"><span class="gi">${guideIcon(x.icon,22)}</span><span>${x.title}</span></button>`).join("");
 el.querySelector(".guide-page").innerHTML=`<div class="guide-ph"><span class="gi big">${guideIcon(p.icon,40)}</span><div><small>Trang ${guidePage+1}/${pages.length}</small><h3>${p.title}</h3></div></div><p class="guide-lead">${p.lead}</p><ul>${p.items.map(t=>`<li>${t}</li>`).join("")}</ul><p class="guide-tip"><b>Mẹo:</b> ${p.tip}</p>`;
 el.querySelector("[data-g-prev]").disabled=guidePage===0;
 const next=el.querySelector("[data-g-next]");next.textContent=guidePage===pages.length-1?"Xong":"Trang sau";
 el.querySelector(".guide-count").textContent=`${guidePage+1}/${pages.length}`;
 el.querySelectorAll("[data-gp]").forEach(b=>b.onclick=()=>{guidePage=+b.dataset.gp;renderGuide();el.querySelector(`[data-gp="${guidePage}"]`)?.focus();});
}
function openGuide(page=0){
 const el=document.getElementById("guide");if(!el)return;
 guideReturn=document.activeElement;guideOpen=true;guidePage=Math.max(0,Math.min(guidePages().length-1,page|0));
 el.hidden=false;el.removeAttribute("inert");renderGuide();
 el.querySelector("[data-g-prev]").onclick=()=>{if(guidePage>0){guidePage--;renderGuide();}};
 el.querySelector("[data-g-next]").onclick=()=>{if(guidePage<guidePages().length-1){guidePage++;renderGuide();}else closeGuide();};
 el.querySelector("[data-g-close]").onclick=closeGuide;
 const tb=el.querySelector("[data-g-tour]");if(tb){tb.hidden=!GS.player;tb.onclick=()=>{closeGuide();if(typeof titleOpen!=="undefined"&&titleOpen)enterOffice(false);startTour();};}
 el.onkeydown=e=>{if(e.key==="Escape"){e.preventDefault();e.stopPropagation();closeGuide();}else if(e.key==="ArrowRight"&&!e.target.closest("input")){el.querySelector("[data-g-next]").click();}else if(e.key==="ArrowLeft"&&!e.target.closest("input")){el.querySelector("[data-g-prev]").click();}};
 el.querySelector("[data-g-next]").focus();
}
function closeGuide(){
 const el=document.getElementById("guide");if(!el)return;guideOpen=false;el.hidden=true;el.setAttribute("inert","");
 if(!GS.guideSeen){GS.guideSeen=true;if(GS.player)save();}   // đang ở màn mở đầu: lưu cùng lúc bấm Bắt đầu, tránh tạo bản lưu dở
 guideReturn?.focus?.();guideReturn=null;
}
// Ván mới: sau khi vào văn phòng lần đầu, hỏi một lần có muốn xem hướng dẫn không.
function offerGuide(){
 if(GS.guideSeen||!GS.player||introOpen)return;
 const box=document.getElementById("guideOffer");if(!box)return;
 box.hidden=false;
 box.querySelector("[data-go-guide]").onclick=()=>{box.hidden=true;openGuide(0);};
 box.querySelector("[data-skip-guide]").onclick=()=>{box.hidden=true;GS.guideSeen=true;save();toast("Mở lại hướng dẫn bất cứ lúc nào: biểu tượng Hướng dẫn ở góc trên phải","ok");};
}

// ---------- Hướng dẫn chạm cho người mới (V14) ----------
// Không bắt đọc: mỗi bước làm sáng một điểm trên màn hình, người chơi chạm đúng điểm đó (hoặc làm đúng việc) thì sang bước sau.
// Chỗ khác bị chặn bấm trong lúc chạy; luôn có nút Bỏ qua. Bản 9 trang vẫn mở được bằng biểu tượng Hướng dẫn riêng.
let tourOn=false, tourStep=0, tourRaf=0, tourT0=0, tourSpeed=null, tourState={};
function tourFounder(){return AG.find(a=>a.founder&&!a.away)||null;}
function worldRect(x0,y0,x1,y1){   // khung trên bản đồ (toạ độ iso) → toạ độ màn hình
 const r=wrap.getBoundingClientRect();return {left:r.left+ox+x0*scale,top:r.top+oy+y0*scale,width:(x1-x0)*scale,height:(y1-y0)*scale};
}
function founderRect(){const a=tourFounder();if(!a)return null;const [x,y]=iso(a.x+.5,a.y+.5);return worldRect(x-16,y-36,x+16,y+6);}
function counterRect(){const o=OBJS.find(o=>o.id==="reception_counter");if(!o)return null;const R=objRect(o);return worldRect(R.X-24,R.Y-28,R.X+R.W+24,R.Y+R.H+30);}
function domRect(sel){const el=typeof sel==="function"?sel():document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return r.width&&r.height?{left:r.left,top:r.top,width:r.width,height:r.height,el}:null;}
function closeAllPanels(){   // V15: mọi bảng nằm trong 1 ngăn #hub
 for(const id of ["agentCard","unlockBox","playerCard"])document.getElementById(id)?.classList.remove("open");
 if(typeof closeHub==="function")closeHub();
 if(typeof setTool==="function"&&tool!=="pan")setTool("pan",{hub:true});
}
function acceptButton(){return [...document.querySelectorAll("#jOff [data-acc]")].find(b=>b.getAttribute("aria-disabled")!=="true"&&/Nhận job/.test(b.textContent))||null;}
const TOUR=[
 {id:"me",rect:founderRect,text:"Đây là bạn, chủ agency. Chạm vào nhân vật của bạn.",tap:true,after:closeAllPanels},
 {id:"wait",rect:counterRect,text:"Khách sẽ xếp hàng trước quầy để giao yêu cầu. Đang tua nhanh tới khi khách đầu tiên giao xong…",
  start(){tourSpeed=GS.speed;GS.speed=3;},done:()=>GS.offers.some(o=>o.received),end(){if(tourSpeed!=null){GS.speed=tourSpeed;tourSpeed=null;}},passive:true},
 {id:"jobs",rect:()=>domRect("#bJobs"),text:"Khách đã giao yêu cầu. Chạm Công việc.",tap:true,keepOpen:true},
 {id:"accept",rect:()=>domRect(acceptButton),text:"Chạm Nhận job để nhận việc của khách.",
  start(){tourState.jobs=GS.jobs.length;openHub("work","offers",{keep:true});acceptButton()?.scrollIntoView({block:"center"});},
  done:()=>GS.jobs.length>tourState.jobs,fallback:"Chưa có job nhận được ngay (thiếu đồ hoặc năng lượng). Bấm Tiếp để xem phần sau.",after:closeAllPanels},
 {id:"handover",rect:founderRect,text:"Bạn mang brief tới nhân viên Account. Đội sẽ bắt đầu làm job.",
  start(){tourState.t=performance.now();},done:()=>{const a=tourFounder();return performance.now()-tourState.t>2500&&!(a&&a.handover);},passive:true,limit:14000},
 // V15: các bước sau mở lần lượt từng trung tâm ở thanh dưới; bảng vừa mở để nguyên cho người chơi nhìn tới khi chạm nút tiếp theo.
 {id:"staff",rect:()=>domRect("#bStaff"),text:"Chạm Đội ngũ: xem stress từng người, tuyển thêm, đổi trang phục.",tap:true,keepOpen:true},
 {id:"build",rect:()=>domRect("#bBuild"),text:"Chạm Xây dựng: mua nội thất, xây tường, di chuyển đồ, mở rộng khu đất.",tap:true,keepOpen:true},
 {id:"shop",rect:()=>domRect("#bShop"),text:"Chạm Cửa hàng: Cửa hàng ruby (gói, đồ mặc, nạp ruby), nạp coin và Kho cất đồ chưa dùng.",tap:true,keepOpen:true},
 {id:"ach",rect:()=>domRect("#bAch"),text:"Chạm Thành tựu: nhiệm vụ, quà Pass tuần và thành tựu để nhận ruby.",tap:true,keepOpen:true},
 {id:"guide",rect:()=>domRect("#bGuide"),text:"Quên cách chơi? Biểu tượng Hướng dẫn luôn ở đây. Chạm để hoàn tất.",tap:true,swallow:true}];   // bảng đang mở được đóng khi kết thúc (endTour)
function tourEls(){
 let el=document.getElementById("tour");
 if(!el){el=document.createElement("div");el.id="tour";el.innerHTML='<div class="tb" data-b="t"></div><div class="tb" data-b="r"></div><div class="tb" data-b="b"></div><div class="tb" data-b="l"></div><div class="tring"></div><div class="thand" aria-hidden="true"></div><div class="tbub" role="dialog" aria-live="polite"><div class="tduck" aria-hidden="true"></div><div class="tpanel"><div class="tsay"><small class="tcount"></small><p class="ttext"></p></div><div class="tact"><button class="btn c" data-tour-skip>Bỏ qua</button><button class="btn g" data-tour-next hidden>Tiếp</button></div></div></div>';document.body.append(el);
  el.querySelector("[data-tour-skip]").onclick=()=>endTour(true);el.querySelector("[data-tour-next]").onclick=()=>nextTour();
}
 return el;
}
function startTour(){
 if(tourOn)return;closeAllPanels();document.getElementById("guideOffer")&&(document.getElementById("guideOffer").hidden=true);
 tourOn=true;tourStep=0;tourState={};const el=tourEls();el.hidden=false;enterTourStep();
 document.addEventListener("click",tourClick,true);document.addEventListener("pointerup",tourPointer,true);
 tourRaf=requestAnimationFrame(tourLoop);
}
function enterTourStep(){
 const s=TOUR[tourStep];tourT0=performance.now();tourState.tapped=false;s.start?.();
 const el=tourEls();el.querySelector(".tcount").textContent=`Bước ${tourStep+1}/${TOUR.length}`;el.querySelector(".ttext").textContent=s.text;
 el.querySelector("[data-tour-next]").hidden=true;
}
function nextTour(){
 const s=TOUR[tourStep];s.end?.();s.after?.();
 if(tourStep>=TOUR.length-1){endTour(false);return;}
 tourStep++;enterTourStep();
}
function endTour(skipped){
 const s=TOUR[tourStep];if(tourOn)s?.end?.();
 tourOn=false;cancelAnimationFrame(tourRaf);document.removeEventListener("click",tourClick,true);document.removeEventListener("pointerup",tourPointer,true);
 const el=document.getElementById("tour");if(el)el.hidden=true;
 GS.tourDone=true;GS.guideSeen=true;GS.uiV15Seen=true;save();closeAllPanels();
 toast(skipped?"Đã bỏ qua hướng dẫn. Chạm biểu tượng Hướng dẫn để xem lại.":"Xong hướng dẫn! Chúc agency của bạn phát đạt.","ok");
}
function holeHit(x,y){const r=tourState.rect;return r&&x>=r.left&&x<=r.left+r.width&&y>=r.top&&y<=r.top+r.height;}
function tourClick(e){
 if(!tourOn||e.target.closest("#tour"))return;
 const s=TOUR[tourStep];if(!s.tap||tourState.tapped)return;
 const r=tourState.rect;const inEl=r?.el?r.el.contains(e.target):holeHit(e.clientX,e.clientY);
 if(!inEl)return;
 tourState.tapped=true;if(s.swallow){e.preventDefault();e.stopPropagation();}
 setTimeout(()=>{if(tourOn&&TOUR[tourStep]===s)nextTour();},s.keepOpen?150:450);
}
function tourPointer(e){   // nhân vật trên bản đồ: chạm vào khung sáng là đủ
 if(!tourOn)return;const s=TOUR[tourStep];if(!s.tap||tourState.tapped||tourState.rect?.el)return;
 if(holeHit(e.clientX,e.clientY)){tourState.tapped=true;setTimeout(()=>{if(tourOn&&TOUR[tourStep]===s)nextTour();},450);}
}
function tourLoop(){
 if(!tourOn)return;tourRaf=requestAnimationFrame(tourLoop);
 const s=TOUR[tourStep],el=tourEls(),pad=8;
 let r=s.rect?.()||null;tourState.rect=r;
 if(s.done&&s.done()){nextTour();return;}
 const age=performance.now()-tourT0;
 if(s.limit&&age>s.limit){nextTour();return;}
 const next=el.querySelector("[data-tour-next]");
 if(!r&&s.fallback){el.querySelector(".ttext").textContent=s.fallback;next.hidden=false;}
 else if(s.passive&&age>20000)next.hidden=false;   // chờ quá lâu thì cho bấm Tiếp
 const W=innerWidth,H=innerHeight;
 const hole=r?{l:Math.max(0,r.left-pad),t:Math.max(0,r.top-pad),r:Math.min(W,r.left+r.width+pad),b:Math.min(H,r.top+r.height+pad)}:{l:W/2,t:H/2,r:W/2,b:H/2};
 const set=(k,x,y,w,h)=>{const d=el.querySelector(`[data-b="${k}"]`);d.style.cssText=`left:${x}px;top:${y}px;width:${Math.max(0,w)}px;height:${Math.max(0,h)}px`;};
 set("t",0,0,W,hole.t);set("b",0,hole.b,W,H-hole.b);set("l",0,hole.t,hole.l,hole.b-hole.t);set("r",hole.r,hole.t,W-hole.r,hole.b-hole.t);
 const ring=el.querySelector(".tring"),hand=el.querySelector(".thand"),bub=el.querySelector(".tbub");
 ring.hidden=hand.hidden=!r;
 if(r){ring.style.cssText=`left:${hole.l}px;top:${hole.t}px;width:${hole.r-hole.l}px;height:${hole.b-hole.t}px`;
  const cx=(hole.l+hole.r)/2,cy=(hole.t+hole.b)/2,bob=Math.sin(performance.now()/220)*5;
  // Ảnh bàn tay chỉ sang phải: xoay 90° để chỉ xuống (đứng trên điểm chạm), −90° để chỉ lên (đứng dưới).
  const below=cy<H*.45,img=window.UIICON?.hand?`background-image:url("${window.UIICON.hand}");`:"";
  hand.style.cssText=`${img}left:${cx-22}px;top:${below?hole.b-4+bob:hole.t-40-bob}px;transform:rotate(${below?25:205}deg)`;}
 // 15/10/2026: khung trò chuyện của vịt nằm ở góc dưới màn hình, không che các nút (thanh dưới trên máy tính / cột trái trên điện thoại).
 // Nếu đè lên ô đang chỉ thì chuyển sang góc dưới phải, rồi lên giữa phía trên.
 const nav=document.getElementById("nav")?.getBoundingClientRect(),rail=nav&&nav.width&&nav.height>nav.width;
 const left0=rail?nav.right+10:12,bottom0=rail||!nav||!nav.height?H-8:Math.min(H-10,nav.top-26);
 const bw=Math.min(rail?400:440,W-left0-12),bh=bub.offsetHeight||96;
 const hit=(x,y)=>r&&x<hole.r+6&&x+bw>hole.l-6&&y<hole.b+6&&y+bh>hole.t-6;
 const spots=[[left0,bottom0-bh],[W-bw-12,bottom0-bh],[(W-bw)/2,Math.max(64,Math.min(H-bh-10,72))]];
 let [bx,by]=spots.find(([x,y])=>!hit(x,y))||spots[0];
 bub.style.cssText=`left:${Math.max(6,bx)}px;top:${Math.max(6,by)}px;width:${bw}px`;
}
function maybeStartTour(){   // ván mới: chạy hướng dẫn chạm thay cho gợi ý đọc
 if(GS.tourDone||!GS.player||introOpen||guideOpen||tourOn)return false;
 if((GS.done||0)>0||(GS.day||1)>1)return false;   // bản lưu đã chơi rồi: không tự chạy, mở từ biểu tượng Hướng dẫn
 startTour();return true;
}
// Biểu tượng Hướng dẫn riêng ở góc trên phải (V14): mở bảng hướng dẫn 9 trang; trong bảng có nút chạy lại hướng dẫn chạm.
function initGuideButton(){
 const top=document.getElementById("topR"),gear=document.getElementById("bMenu");if(!top||document.getElementById("bGuide"))return;
 const b=document.createElement("button");b.id="bGuide";b.className="pf sq";b.title="Hướng dẫn chơi";b.setAttribute("aria-label","Hướng dẫn chơi");b.setAttribute("aria-controls","guide");
 {const src=window.UIICON&&window.UIICON.guide;b.innerHTML=`<span class="ic">${src?`<img src="${src}" alt="" width="30" height="30" style="object-fit:contain">`:guideIcon("book",28)}</span>`;}   // V15.1: icon sách + dấu ? cùng phong cách các nút khác (phong bì, cúp)b.onclick=()=>openGuide(0);
 top.insertBefore(b,gear);
}
