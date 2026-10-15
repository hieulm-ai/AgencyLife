// ---------- Theo dõi lượt truy cập + lỗi (15/10/2026, chủ dự án yêu cầu cho open beta) ----------
// Ẩn danh: không gửi email, tên, tài khoản hay nội dung bản lưu. Mỗi thiết bị có 1 mã ngẫu nhiên (để đếm lượt người, không gắn với tài khoản).
// Gửi: 1 dòng 'visit' mỗi phiên mở game + tối đa 5 dòng 'error' mỗi phiên (trùng nội dung thì chỉ gửi 1 lần).
// Ghi vào bảng public.telemetry (online/supabase-schema.sql); người chơi chỉ được ghi, không đọc được.
(function(){
 const cfg=__TM_CFG__;
 if(!cfg||!cfg.url||!cfg.anonKey||/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname))return;
 const VER='__BUILD_VER__';
 const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
 const ss=(k,v)=>{try{if(v===undefined)return sessionStorage.getItem(k);sessionStorage.setItem(k,v);}catch(e){return null;}};
 let dev=ls('5bit.tm.dev');if(!dev){dev=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)).slice(0,36);ls('5bit.tm.dev',dev);}
 const ua=navigator.userAgent||'';
 const platform=/iPhone|iPod/.test(ua)?'ios':/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'ipados':/Android/.test(ua)?'android':/Windows/.test(ua)?'windows':/Macintosh/.test(ua)?'mac':/Linux|CrOS/.test(ua)?'linux':'other';
 const browser=/FBAN|FBAV|FB_IAB|Messenger/.test(ua)?'facebook-app':/Zalo/i.test(ua)?'zalo-app':/Instagram/.test(ua)?'instagram-app':/SamsungBrowser/.test(ua)?'samsung':/EdgA?\//.test(ua)?'edge':/OPR\//.test(ua)?'opera':/CriOS|Chrome\//.test(ua)?'chrome':/FxiOS|Firefox\//.test(ua)?'firefox':/Safari\//.test(ua)?'safari':'other';
 const host=/github\.io$/.test(location.hostname)?'github':/netlify\.app$/.test(location.hostname)?'netlify':location.hostname.slice(0,60);
 const standalone=!!(navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches);
 const base={host,platform,browser,standalone,device:dev,ver:VER,screen:`${screen.width}x${screen.height}`.slice(0,20)};
 function send(row){
  try{fetch(cfg.url+'/rest/v1/telemetry',{method:'POST',keepalive:true,headers:{apikey:cfg.anonKey,Authorization:'Bearer '+cfg.anonKey,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(Object.assign({},base,row))}).catch(()=>{});}catch(e){}
 }
 if(!ss('5bit.tm.visit')){ss('5bit.tm.visit','1');send({kind:'visit'});}
 const seen=new Set();let sent=0;
 function report(msg,src){
  msg=String(msg||'').slice(0,300);src=String(src||'').slice(0,200);
  const k=msg+'|'+src;if(!msg||seen.has(k)||sent>=5)return;seen.add(k);sent++;
  send({kind:'error',msg,src});
 }
 addEventListener('error',e=>{
  if(e.target&&e.target!==window&&e.target.tagName){const u=e.target.src||e.target.href||'';if(u&&u.startsWith(location.origin))report('Không tải được tài nguyên',u.replace(location.origin,''));return;}
  const f=e.filename||'';if(f&&!f.startsWith(location.origin))return;   // bỏ lỗi từ tiện ích trình duyệt/trang khác
  report(e.message,(f.replace(location.origin,'')||'inline')+':'+(e.lineno||0)+':'+(e.colno||0));
 },true);
 addEventListener('unhandledrejection',e=>{const r=e.reason;const m=r&&(r.message||String(r))||'';if(/AbortError|NetworkError|Failed to fetch|Load failed/i.test(m))return;report('Promise: '+m,(r&&r.stack||'').split('\n')[1]||'');});
})();
