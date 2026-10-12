// Ánh sáng theo giờ game: sáng → trưa → chiều vàng → hoàng hôn → tối.
// Từ ~18:00 đèn đường, đèn văn phòng (các khu đã mở) và đèn xe bật dần; tối hẳn lúc 19:00.
// Màu "tint" được nhân (multiply) lên cả cảnh; 255,255,255 = giữ nguyên.
const DAY_KEYS=[ // [phút trong ngày, màu nhân r,g,b, mức đèn 0..1]
 [480,[255,238,218],0],    // 08:00 nắng sớm hơi ấm
 [630,[255,255,255],0],    // 10:30 ban ngày
 [900,[255,255,255],0],    // 15:00
 [1005,[255,222,182],0],   // 16:45 chiều vàng
 [1065,[232,168,150],.15], // 17:45 hoàng hôn
 [1095,[132,122,172],.85], // 18:15 chạng vạng, đèn bật
 [1140,[82,92,152],1],     // 19:00 tối
 [1260,[70,80,142],1]];    // 21:00
function dayLight(min){
 let i=0; while(i<DAY_KEYS.length-1&&DAY_KEYS[i+1][0]<=min) i++;
 const a=DAY_KEYS[i], b=DAY_KEYS[Math.min(i+1,DAY_KEYS.length-1)], t=b[0]>a[0]?Math.max(0,Math.min(1,(min-a[0])/(b[0]-a[0]))):0;
 return {tint:[0,1,2].map(k=>Math.round(a[1][k]+(b[1][k]-a[1][k])*t)), lamps:Math.max(0,Math.min(1,a[2]+(b[2]-a[2])*t)),
  phase:min<720?'Sáng':min<1080?'Chiều':'Tối'};
}
// Vị trí đầu đèn đường (toạ độ thế giới) theo sprite: cột bên trái, cần đèn vươn sang phải; lật thì ngược lại.
function lampHead(x,y,flip){ const [sx,sy]=iso(x+0.5,y+0.5), dx=flip?-8.2:8.2; return {head:[sx+dx,sy-43.6], pool:[sx+dx,sy+1]}; }
// Đầu xe và hướng chạy (để vẽ đèn pha), theo làn đường.
function vehicleLights(v){ const [gx,gy]=vehPos(v), d=v.L.dir, ax=v.L.axis, len=v.bike?0.35:0.75;
 const at=u=>ax==='x'?iso(gx+d*u,gy):iso(gx,gy+d*u);
 return {front:at(len), beam:at(len+1.6), back:at(-len)};
}
const OFFICE_LIGHT_H=48;   // chiều cao vùng sáng trong nhà: tường vỏ cao 44 px + 4 px lề
const lightCv=document.createElement('canvas'), lctx=lightCv.getContext('2d');
function addGlow(c,x,y,r,col,a,squash){ c.save(); c.translate(x,y); if(squash) c.scale(1,squash);
 const gr=c.createRadialGradient(0,0,0,0,0,r); gr.addColorStop(0,`rgba(${col},${a})`); gr.addColorStop(1,`rgba(${col},0)`);
 c.fillStyle=gr; c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.fill(); c.restore(); }
function drawDaylight(){
 const D=dayLight(GS.min), [r,gn,b]=D.tint, on=D.lamps;
 if(r>=255&&gn>=255&&b>=255&&on<=0) return;
 if(lightCv.width!==cv.width||lightCv.height!==cv.height){ lightCv.width=cv.width; lightCv.height=cv.height; }
 const c=lctx, s=scale*dpr, T=[s,0,0,s,Math.round(ox*dpr),Math.round(oy*dpr)];
 c.setTransform(1,0,0,1,0,0); c.globalCompositeOperation='source-over'; c.globalAlpha=1;
 c.fillStyle=`rgb(${r},${gn},${b})`; c.fillRect(0,0,lightCv.width,lightCv.height);
 if(on>0){
  c.setTransform(...T); c.globalCompositeOperation='lighter';
  // Văn phòng sáng đèn: khối sàn + chiều cao tường của các khu đã mở, ánh vàng ấm.
  // 08/10/2026: nới thêm 1 ô quanh mỗi khu (hàng tường vỏ) và nâng tới hết chiều cao tường vỏ (44 px),
  // để chân tường mặt tiền, cửa chính và đầu tường xây sát mặt tiền không bị tối như ngoài đường.
  // Các khu liền nhau gộp vào 1 đường vẽ và tô 1 lần (nonzero) nên phần chồng lên nhau không sáng gấp đôi.
  c.fillStyle=`rgba(178,150,72,${on})`; c.beginPath();
  for(const [id,,x0,y0,x1,y1] of PLOTS){ if(!UNLOCKED.has(id)) continue; const H=OFFICE_LIGHT_H, ax=x0-1, ay=y0-1, bx=x1+2, by=y1+2;
   const Tp=iso(ax,ay), R=iso(bx,ay), B=iso(bx,by), Lp=iso(ax,by);
   c.moveTo(Lp[0],Lp[1]-H); c.lineTo(Tp[0],Tp[1]-H); c.lineTo(R[0],R[1]-H); c.lineTo(R[0],R[1]); c.lineTo(B[0],B[1]); c.lineTo(Lp[0],Lp[1]); c.closePath(); }
  c.fill('nonzero');
  // Đèn đường: vũng sáng trên vỉa hè/lòng đường + quầng ở đầu đèn.
  for(const [x,y,fl] of LAMPS){ const L=lampHead(x,y,fl); addGlow(c,L.pool[0],L.pool[1],46,'205,175,95',on,.5); addGlow(c,L.head[0],L.head[1],12,'230,200,120',on); }
  // Đèn pha xe: vệt sáng phía trước đầu xe.
  for(const v of VEH){ const V=vehicleLights(v); addGlow(c,V.beam[0],V.beam[1],v.bike?14:22,'215,200,150',on*.9,.55); }
 }
 g.save(); g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='multiply'; g.drawImage(lightCv,0,0); g.restore();
 if(on>0){ // Quầng sáng (bloom) cộng thêm trên cảnh đã tối: bóng đèn, đèn pha, đèn hậu.
  g.save(); g.globalCompositeOperation='lighter';
  for(const [x,y,fl] of LAMPS){ const L=lampHead(x,y,fl); addGlow(g,L.head[0],L.head[1]+1,7,'255,214,130',.75*on); }
  for(const v of VEH){ const V=vehicleLights(v); addGlow(g,V.front[0],V.front[1]-4,v.bike?4:5,'255,240,190',.9*on); addGlow(g,V.back[0],V.back[1]-4,3.5,'255,60,50',.7*on); }
  g.restore();
 }
}
