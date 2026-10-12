// Persistent office bulletin; this is a new isometric implementation.
function addOfficeNews(kind,message){
 if(!Array.isArray(GS.officeNews))GS.officeNews=[];
 GS.officeNews.unshift({day:GS.day,minute:Math.floor(GS.min),kind,message:String(message)});
 GS.officeNews=GS.officeNews.slice(0,30);
}
function duckComment(){
 if(!AG.some(a=>CHARS[a.ci].id==='09_Vit_Vang'))return 'Tuyển Vịt Vàng để nghe bình luận văn phòng.';
 if(AG.some(a=>a.state==='burn'))return 'Có người bốc cháy rồi kìa. Deadline không phải lý do để biến đồng nghiệp thành bếp nướng!';
 if(GS.energy<20)return 'Pin agency còn thấp hơn động lực sáng thứ Hai. Nghỉ chút rồi hãy nhận thêm job nhé.';
 if(GS.jobs.some(j=>GS.day>=j.due))return 'Deadline hôm nay đang nhìn chúng ta. Tôi nhìn lại rồi, nó không chịu tự lùi đâu.';
 if(!GS.jobs.length)return 'Văn phòng yên bình quá. Bình yên này chưa xuất được hóa đơn đâu nha.';
 return ['Khách bảo sửa nhẹ. Tôi đã chuẩn bị tinh thần cho phiên bản cuối_cùng_v7.','Bàn đẹp rồi đó. Giờ đến phần khó: làm việc trên cái bàn ấy.','Tôi không lười, tôi đang nghiên cứu chiến lược nghỉ ngơi.'][Math.floor((GS.day-1)%3)];
}
function renderOfficeNews(){
 const el=document.getElementById('officeNews');if(!el)return;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const list=Array.isArray(GS.officeNews)?GS.officeNews:[];
 el.innerHTML=`<div class="cg2">Vịt Vàng lên tiếng</div><p style="font-size:13px;line-height:1.6;margin:4px 0 12px">${esc(duckComment())}</p><div class="cg2">Bảng tin agency · 30 tin gần nhất</div>`+
 (list.length?list.map(n=>`<article class="job"><small>N${n.day} · ${String(Math.floor(n.minute/60)).padStart(2,'0')}:${String(n.minute%60).padStart(2,'0')}</small><span style="font-size:13px">${esc(n.message)}</span></article>`).join(''):'<p style="font-size:12px">Chưa có tin mới. Kết quả job, nhân sự và phần thưởng sẽ xuất hiện ở đây.</p>');
}
