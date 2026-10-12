// Compose occupied furniture as one sprite, using the same hip anchor at every rotation.
const GROUP_SEATS=new Set(["meeting_table","round_table","sofa_blue"]);
const SEATED_ATLASES=(window.SEATED_CUSTOMERS||[]).map(a=>Object.assign(new Image(),{src:a.src}));
const SEAT_COMPOSITES=new Map();
function seatImage(a){ return a.kind!=null?SEATED_ATLASES[Math.floor(a.ci/4)]:SIMGS[a.ci]; }
function meetingChairImage(a){return a.kind!=null?null:CIMGS[a.ci]?.office_chair_blue;}
function drawAnchoredPerson(c,a){
  const im=seatImage(a);if(!im?.complete||!im.naturalWidth) return;
  const z=a.seat,guest=a.kind!=null,back=!isFront(z.face),flip=z.face==="SE"||z.face==="NE";
  const furniture=OBJS.find(o=>o.uid===z.uid);
  // Rear sofa cushions sit behind a high backrest: retain the visible head/shoulders.
  const sx=z.sx,sy=z.sy-(furniture?.id==="sofa_blue"&&back&&!FBY.sofa_blue.views[furniture.rot].sofaLayers?15:0);
  c.save();c.translate(sx,sy);if(flip)c.scale(-1,1);
  if(guest){
    const pose=window.SEATED_CUSTOMERS[Math.floor(a.ci/4)].frames[a.ci%4][back?1:0];
    const [rx,ry,rw,rh]=pose.rect,h=pose.height||25,w=h*rw/rh;
    c.drawImage(im,rx,ry,rw,rh,-w*pose.hip[0],-h*pose.hip[1],w,h);
  }else{
    const col=Math.floor(a.t*3)%2;
    c.scale(CHARS[a.ci].sitScale||1,CHARS[a.ci].sitScale||1);
    c.drawImage(im,col*96,(back?1:0)*128,96,128,-12,-23.5,24,32);
  }
  c.restore();
}
function drawSeatComposite(c,o,seated){
  const view=FBY[o.id].views[o.rot],layers=FLAY[o.id]?.[o.rot],base=FIMG[o.id][o.rot];
  if(!base.complete||!base.naturalWidth) return;
  const ready=(!layers||Object.values(layers).every(im=>im.complete&&im.naturalWidth))
    &&(!view.separateChairs||FIMG.office_chair_blue.every(im=>im.complete&&im.naturalWidth))
    &&(!view.separateChairs||seated.every(a=>{const im=meetingChairImage(a);return !im||(im.complete&&im.naturalWidth);}))
    &&seated.every(a=>seatImage(a)?.complete&&seatImage(a).naturalWidth);
  if(!ready){drawObj(c,o);return;}
  const [w,d]=view.fp,[bx,by]=iso(o.gx+w,o.gy+d),X=Math.round(bx-view.anchor[0]),Y=Math.round(by-view.anchor[1]);
  const signature=[o.id,o.rot,X,Y,...seated.map(a=>`${a.kind||"staff"}:${a.ci}:${a.seat.key}:${a.kind?0:Math.floor(a.t*3)%2}`)].join("|");
  let cached=SEAT_COMPOSITES.get(o.uid);
  if(cached?.signature!==signature){
    const margin=40,ratio=3,canvas=document.createElement("canvas");
    canvas.width=Math.ceil((view.size[0]+2*margin)*ratio);canvas.height=Math.ceil((view.size[1]+2*margin)*ratio);
    const cc=canvas.getContext("2d");cc.scale(ratio,ratio);cc.translate(margin-X,margin-Y);cc.imageSmoothingEnabled=true;
    const image=im=>cc.drawImage(im,X,Y,...view.size);
    const people=side=>seated.filter(a=>(a.seat.z==="before")===side).forEach(a=>drawAnchoredPerson(cc,a));
    if(view.separateChairs){
      // Each of the six chairs owns its occupant; only far-side legs go behind the table.
      const seats=seatsOf(o);
      const row=side=>seats.filter(s=>s.z===side).sort((a,b)=>a.sy-b.sy).forEach(s=>{
        const rot=ROT_FACE.indexOf(s.face),cv=FBY.office_chair_blue.views[rot],hip=cv.seatsPx[0];
        const occupant=seated.find(a=>Math.abs(a.seat.sx-s.sx)<.1&&Math.abs(a.seat.sy-s.sy)<.1);
        const combo=occupant&&meetingChairImage(occupant);
        if(combo){
          // The occupied chair shares the empty chair's floor anchor. The atlas
          // already aligns this character's hips, hands and feet with the chair.
          const bx=s.sx+cv.anchor[0]-hip.cx,by=s.sy+cv.anchor[1]-hip.cy;
          cc.drawImage(combo,rot*144,0,144,224,bx-18,by-55,36,56);
        }else{
          cc.drawImage(FIMG.office_chair_blue[rot],s.sx-hip.cx,s.sy-hip.cy,...cv.size);
          if(occupant)drawAnchoredPerson(cc,occupant);
        }
      });
      row('before');image(layers.table);row('after');
    }
    else if(view.sofaLayers){
      if(o.rot<2)image(layers.base);
      [...seated].sort((a,b)=>a.seat.sy-b.seat.sy).forEach(a=>drawAnchoredPerson(cc,a));
      image(layers.near);
    }
    else if(layers){image(layers.far);people(true);image(layers.base);people(false);image(layers.near);}
    else{people(true);image(base);people(false);}
    cached={signature,canvas,x:X-margin,y:Y-margin};SEAT_COMPOSITES.set(o.uid,cached);
  }
  c.drawImage(cached.canvas,cached.x,cached.y,cached.canvas.width/3,cached.canvas.height/3);
}
function drawMeetingBubble(c,v){
  const j=GS.jobs.find(j=>j.id===v.jobId);if(!j||!v.seat) return;
  const x=v.seat.sx,y=v.seat.sy-30,remaining=j.meeting.remaining;
  c.fillStyle="#3A2414";c.fillRect(x-11,y-3,22,6);c.fillStyle="#71BD75";
  c.fillRect(x-10,y-2,20*(1-remaining/MEETING_MINUTES),4);
}
