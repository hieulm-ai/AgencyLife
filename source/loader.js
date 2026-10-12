// Images are collected first; only the current office blocks entry.
let bootBusy=true,titleOpen=true,bootPhase='collect';
const BOOT_IMAGES=[],BOOT_REQUESTS=new Map();
const BOOT_SRC=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
function bootImage(){
 const image=new Image();let source='';
 Object.defineProperty(image,'src',{get:()=>source,set:value=>{source=String(value);if(bootPhase!=='collect')BOOT_SRC.set.call(image,source);},configurable:true});
 BOOT_IMAGES.push(image);return image;
}
function bootPaths(value,paths=new Set()){
 if(typeof value==='string'&&/^assets\//.test(value))paths.add(value);
 else if(Array.isArray(value))for(const v of value)bootPaths(v,paths);
 else if(value&&typeof value==='object')for(const v of Object.values(value))bootPaths(v,paths);
 return paths;
}
function bootPlan(){
 const paths=bootPaths(window.UIICON);
 for(const a of AG)bootPaths(CHARS[a.ci],paths);
 // All customers are small and may enter immediately after opening the office.
 bootPaths(CUSTS,paths);bootPaths(window.SEATED_CUSTOMERS,paths);
 for(const o of OBJS)if(FBY[o.id])bootPaths(FBY[o.id].views[o.rot],paths);
 paths.add(OUTDOOR_SHEET.src);paths.add(MODERN_OUTDOOR.src);
 for(const img of document.querySelectorAll('img')){const s=img.getAttribute('src');if(s&&s.startsWith('assets/'))paths.add(s);}
 return paths;
}
function bootLoad(path,retries=2){
 if(BOOT_REQUESTS.has(path))return BOOT_REQUESTS.get(path);
 const promise=new Promise((resolve,reject)=>{
  function attempt(left){const img=new Image();let timer;
   const done=()=>{clearTimeout(timer);resolve(path);};
   const fail=()=>{clearTimeout(timer);img.onload=img.onerror=null;if(left)attempt(left-1);else reject(Error(path));};
   img.onload=done;img.onerror=fail;timer=setTimeout(fail,15000);img.src=path;
  }attempt(retries);
 });BOOT_REQUESTS.set(path,promise);promise.catch(()=>BOOT_REQUESTS.delete(path));return promise;
}
async function bootPool(paths,task,limit=6){
 const queue=[...paths];await Promise.all(Array.from({length:Math.min(limit,queue.length)},async()=>{while(queue.length)await task(queue.shift());}));
}
async function bootActivate(paths){
 await Promise.all(BOOT_IMAGES.filter(img=>paths.has(img.src)).map(img=>new Promise((resolve,reject)=>{
  if(img.complete&&img.naturalWidth){resolve();return;}
  let timer;const clean=()=>{clearTimeout(timer);img.removeEventListener('load',done);img.removeEventListener('error',fail);};
  const done=()=>{clean();resolve();},fail=()=>{clean();reject(Error(img.src));};
  img.addEventListener('load',done);img.addEventListener('error',fail);
  timer=setTimeout(fail,15000);BOOT_SRC.set.call(img,img.src);
 })));
}
function bootProgress(value){const n=Math.max(0,Math.min(100,Number(value)||0));document.getElementById("bootProgress").value=n;document.getElementById("bootTrack").style.setProperty("--progress",n+"%");}
async function bootStart(){
 const box=document.getElementById('boot'),status=document.getElementById('bootStatus'),bar=document.getElementById('bootProgress'),retry=document.getElementById('bootRetry');
 retry.hidden=true;const started=performance.now();
 try{
  const response=await fetch('asset-manifest.json');if(!response.ok)throw Error('manifest');const manifest=await response.json();
  if(!Array.isArray(manifest))throw Error('manifest');
  const sizes=new Map(manifest.map(a=>[a.path,Math.max(1,Number(a.bytes)||1)]));
  await appearanceReady;const critical=bootPlan();const total=[...critical].reduce((n,p)=>n+(sizes.get(p)||1),0);let loaded=0;
  bootProgress(0);status.textContent='Đang chuẩn bị văn phòng…';
  await bootPool(critical,async path=>{await bootLoad(path);loaded+=sizes.get(path)||1;bootProgress(Math.floor(loaded/total*100));status.textContent=`Đang tải văn phòng · ${bar.value}%`;});
  await bootActivate(critical);bootProgress(100);status.textContent='Văn phòng đã sẵn sàng';
  bootBusy=false;bootPhase='background';box.hidden=true;document.body.classList.remove('booting');
  document.body.dataset.bootSeconds=((performance.now()-started)/1000).toFixed(2);
  openTitle();
  // Limited concurrency keeps the critical requests ahead of the catalogue.
  const background=new Set(BOOT_IMAGES.map(i=>i.src).filter(p=>p&&!critical.has(p)));
  bootPool(background,async path=>{try{await bootLoad(path);await bootActivate(new Set([path]));}catch(e){/* The catalogue can still load its thumbnail directly. */}},3);
 }catch(error){status.textContent='Chưa tải được đủ dữ liệu. Kiểm tra kết nối rồi thử lại.';retry.hidden=false;retry.onclick=()=>location.reload();}
}

function bootEnsure(value){const paths=bootPaths(value);return bootPool(paths,async path=>{await bootLoad(path);await bootActivate(new Set([path]));},3).catch(()=>toast("Một số hình ảnh chưa tải được. Hãy thử lại khi kết nối ổn định.","err"));}
