// Local procedural ambience: no media download and no paid generation.
let ambientAudio=null,ambientTimer=null,ambientStarted=false,ambientBeat=0;
function ambientPrefs(){
 if(!GS.ambience||typeof GS.ambience!=='object')GS.ambience={rain:false,music:false,volume:.18};
 const slot=Math.floor(((GS.day||1)*1440+(GS.min||480))/180);
 if(GS.ambience.weatherSlot!==slot){GS.ambience.weatherSlot=slot;GS.ambience.rain=Math.random()<.3;}
 GS.ambience.volume=Math.max(0,Math.min(1,Number(GS.ambience.volume)||0));return GS.ambience;
}
function ambientLabel(){const b=document.getElementById('ambientMusic');if(b)b.textContent=ambientStarted?'Tắt nhạc nền':ambientPrefs().music?'Tiếp tục nhạc nền':'Bật nhạc nền';}
function ambientNote(frequency,when,duration,volume){
 const ctx=ambientAudio,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=frequency;
 gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.035);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
 osc.connect(gain);gain.connect(ctx.destination);osc.start(when);osc.stop(when+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}
function ambientTick(){
 if(!ambientStarted||document.hidden||ambientAudio?.state!=='running')return;
 const chords=[[130.81,164.81,196],[110,130.81,164.81],[87.31,110,130.81],[98,123.47,146.83]],notes=[0,1,2,1,0,2,1,2];
 const chord=chords[Math.floor(ambientBeat/8)%4],at=ambientAudio.currentTime+.03,vol=ambientPrefs().volume;
 ambientNote(chord[notes[ambientBeat%8]]*2,at,.85,vol*.12);
 if(ambientBeat%4===0)ambientNote(chord[0],at,1.8,vol*.1);
 ambientBeat++;
}
let ambientBusy=false;
async function toggleAmbientMusic(){
 if(ambientBusy)return;ambientBusy=true;
 try{await toggleAmbientMusic0();}finally{ambientBusy=false;}
}
async function toggleAmbientMusic0(){
 const prefs=ambientPrefs();
 if(ambientStarted){ambientStarted=false;prefs.music=false;clearInterval(ambientTimer);ambientTimer=null;if(ambientAudio)await ambientAudio.suspend();}
 else{
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');ambientAudio??=new Audio();await ambientAudio.resume();ambientStarted=true;prefs.music=true;ambientTick();ambientTimer=setInterval(ambientTick,420);}
  catch(error){ambientStarted=false;prefs.music=false;toast('Trình duyệt chưa phát được âm thanh','err');}
 }
 ambientLabel();save();
}
function setupAmbience(){
 const prefs=ambientPrefs(),box=document.createElement('div');box.style.cssText='display:flex;flex-direction:column;gap:8px';
 box.innerHTML='<button id="ambientMusic" class="btn c">Bật nhạc nền</button><label style="font-size:12px">Âm lượng <input id="ambientVolume" aria-label="Âm lượng nhạc nền" type="range" min="0" max="100" step="5" style="width:100%"></label>';
 (document.getElementById('setSound')||document.getElementById('menu')).append(box);   // V15: mục Âm thanh và hiển thị trong Cài đặt
 const volume=document.getElementById('ambientVolume');volume.value=Math.round(prefs.volume*100);volume.oninput=()=>{prefs.volume=+volume.value/100;save();};
 document.getElementById('ambientMusic').onclick=toggleAmbientMusic;ambientLabel();
 document.addEventListener('visibilitychange',()=>{if(!ambientAudio||!ambientStarted)return;if(document.hidden)ambientAudio.suspend().catch(()=>{});else ambientAudio.resume().catch(()=>{});});
 addEventListener('pagehide',()=>{clearInterval(ambientTimer);ambientTimer=null;ambientAudio?.suspend().catch(()=>{});});
}
addEventListener('pageshow',()=>{if(ambientStarted&&!ambientTimer){ambientAudio?.resume().catch(()=>{});ambientTimer=setInterval(ambientTick,420);}});
function drawRain(now){
 if(!ambientPrefs().rain)return;
 const width=cv.width/dpr,height=cv.height/dpr,time=matchMedia('(prefers-reduced-motion: reduce)').matches?0:now/1000;
 g.save();g.setTransform(dpr,0,0,dpr,0,0);
 // Cut out the office footprint so rain stays outside the roofless room.
 g.beginPath();g.rect(0,0,width,height);
 [[1,1],[63,1],[63,58],[1,58]].forEach(([x,y],i)=>{const [px,py]=iso(x,y);if(i)g.lineTo(px*scale+ox,py*scale+oy);else g.moveTo(px*scale+ox,py*scale+oy);});g.closePath();g.clip('evenodd');
 g.strokeStyle='rgba(175,205,235,.55)';g.lineWidth=1.2;g.beginPath();
 const count=Math.min(260,Math.ceil(width*height/6500));
 for(let i=0;i<count;i++){const x=((i*137.51-time*55)%(width+30)+width+30)%(width+30)-15,y=(i*83.17+time*310)%(height+30)-15;g.moveTo(x,y);g.lineTo(x-4,y+12);}
 g.stroke();g.restore();
}
