// Ảnh 4 góc của bàn làm việc / bàn dựng phim phải khớp lưới sàn: kích thước ảnh hd3x = size × 3,
// đỉnh dưới footprint (anchor) nằm ở đáy ảnh, góc 02/03 là ảnh lật của 01/04.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const M=JSON.parse(fs.readFileSync(path.join(root,'source/asset_manifest_build.json'),'utf8')).manifest;
const ROT=['01_front_left','02_front_right','03_back_right','04_back_left'];
const zlib=require('node:zlib');
// Giải mã PNG RGBA 8-bit tối giản (đủ cho ảnh hd3x của dự án) để đo mép đáy thật của bàn.
function readPng(f){const b=fs.readFileSync(f);assert.equal(b.toString('ascii',1,4),'PNG');
 let o=8,w,h,ct,bd,idat=[];while(o<b.length){const len=b.readUInt32BE(o),type=b.toString('ascii',o+4,o+8),d=b.subarray(o+8,o+8+len);
  if(type==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);bd=d[8];ct=d[9];}else if(type==='IDAT')idat.push(d);o+=12+len;}
 assert.equal(bd,8);assert.equal(ct,6,'cần ảnh RGBA');const raw=zlib.inflateSync(Buffer.concat(idat)),bpp=4,st=w*bpp,px=Buffer.alloc(h*st);
 for(let y=0;y<h;y++){const ft=raw[y*(st+1)],src=raw.subarray(y*(st+1)+1,(y+1)*(st+1));
  for(let x=0;x<st;x++){const a=x>=bpp?px[y*st+x-bpp]:0,up=y?px[(y-1)*st+x]:0,c=(x>=bpp&&y)?px[(y-1)*st+x-bpp]:0;let v=src[x];
   if(ft===1)v+=a;else if(ft===2)v+=up;else if(ft===3)v+=(a+up)>>1;else if(ft===4){const p=a+up-c,pa=Math.abs(p-a),pb=Math.abs(p-up),pc=Math.abs(p-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:c);}
   px[y*st+x]=v&255;}}
 return {w,h,alpha:(x,y)=>px[(y*w+x)*4+3]};}
// Ba góc chân bàn trên ảnh: trái = xa nhất theo (−1,1), phải = theo (1,1), dưới = hàng thấp nhất (giống scripts/prepare_desks_v2.py).
function floorCorners(img){let L=null,R=null,ymax=-1;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++)if(img.alpha(x,y)>=128){
  if(!L||y-x>L[1]-1-L[0])L=[x,y+1];if(!R||y+x>R[1]-1+R[0]-1)R=[x+1,y+1];ymax=Math.max(ymax,y);}
 let bx=[];for(let x=0;x<img.w;x++)if(img.alpha(x,ymax)>=128)bx.push(x);
 return {L,B:[(bx[0]+bx[bx.length-1]+1)/2,ymax+1],R};}

const DESKS_V2=[['work_desk',2,1],['editing_workstation',3,1]];
if(fs.existsSync(path.join(root,'assets/desks_v2/dual_monitor_desk-sheet.png')))DESKS_V2.push(['dual_monitor_desk',2,1]);
for(const [id,w,d] of DESKS_V2){
 test(`${id}: 4 góc khớp lưới sàn (footprint, anchor, kích thước ảnh)`,()=>{
  const item=M.items['furniture/'+id];
  assert.deepEqual(item.footprint_rot0,[w,d]);
  const fps=[[w,d],[d,w],[d,w],[w,d]];
  ROT.forEach((v,i)=>{
   const view=item.views[v];
   assert.deepEqual(view.footprint,fps[i],v+' footprint');
   const img=readPng(path.join(root,'assets/items_hd3x/furniture',id,v+'.png'));
   assert.deepEqual([img.w,img.h],[view.size[0]*3,view.size[1]*3],v+' ảnh hd3x phải đúng 3 lần size');
   // Mép đáy thật của bàn (px hd3x) so với hình thoi footprint (ô 96x48 ở hd3x) đặt tại anchor.
   const [ax,ay]=view.anchor.map(n=>n*3),[fw,fd]=view.footprint,c=floorCorners(img);
   const near=(p,q,tol,what)=>assert.ok(Math.abs(p[0]-q[0])<=tol&&Math.abs(p[1]-q[1])<=tol,`${v} ${what}: ảnh (${p}) lệch hình thoi (${q}) quá ${tol}px hd3x`);
   near(c.B,[ax,ay],4,'đỉnh dưới');
   // Trái/phải: đúng độ cao cạnh hình thoi; theo chiều ngang cho phép bàn hụt vào trong tối đa 3 px thế giới.
   const Lq=[ax-fw*48,ay-fw*24],Rq=[ax+fd*48,ay-fd*24];
   assert.ok(Math.abs(c.L[1]-Lq[1])<=5&&c.L[0]-Lq[0]>=-4&&c.L[0]-Lq[0]<=9,`${v} đỉnh trái (${c.L}) lệch (${Lq})`);
   assert.ok(Math.abs(c.R[1]-Rq[1])<=5&&Rq[0]-c.R[0]>=-4&&Rq[0]-c.R[0]<=9,`${v} đỉnh phải (${c.R}) lệch (${Rq})`);
  });
  for(const [a,b] of [['01_front_left','02_front_right'],['04_back_left','03_back_right']]){
   const A=item.views[a],B=item.views[b];
   assert.deepEqual(A.size,B.size);assert.equal(A.anchor[1],B.anchor[1]);
   assert.equal(A.anchor[0]+B.anchor[0],A.size[0],a+'/'+b+' là ảnh lật ngang');
  }
 });
}
