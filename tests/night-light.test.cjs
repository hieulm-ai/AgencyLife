// 08/10/2026: buổi tối, chân tường mặt tiền và cửa chính bị tối như ngoài đường (vùng đèn trong nhà chỉ phủ sàn của khu).
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../source/daylight.js'),'utf8');
test('vùng đèn trong nhà phủ cả hàng tường vỏ quanh khu đã mở và hết chiều cao tường vỏ',()=>{
 const H=+src.match(/const OFFICE_LIGHT_H=(\d+)/)[1];assert.ok(H>=44,'tường vỏ cao 44 px');
 // Vẽ thử vào canvas giả: ghi lại các điểm của đường bao và số lần tô.
 const pts=[],fills=[];const ctx={setTransform(){},fillRect(){},beginPath(){},closePath(){},moveTo(x,y){pts.push([x,y]);},lineTo(x,y){pts.push([x,y]);},fill(r){fills.push(r);},save(){},restore(){},translate(){},scale(){},arc(){},createRadialGradient:()=>({addColorStop(){}}),drawImage(){}};
 const c={GS:{min:1170},PLOTS:[[0,'',22,43,41,56],[10,'',2,43,21,56],[5,'',22,15,41,28]],UNLOCKED:new Set([0,10]),LAMPS:[],VEH:[],scale:1,dpr:1,ox:0,oy:0,cv:{width:10,height:10},g:ctx,
  iso:(x,y)=>[(x-y)*16,(x+y)*8],document:{createElement:()=>({getContext:()=>ctx,width:0,height:0})}};
 vm.createContext(c);vm.runInContext(src,c);vm.runInContext('drawDaylight()',c);
 assert.equal(fills.filter(f=>f==='nonzero').length,1,'các khu gộp 1 lần tô, chỗ chồng không sáng gấp đôi');
 const iso=c.iso,has=p=>pts.some(q=>Math.abs(q[0]-p[0])<1e-9&&Math.abs(q[1]-p[1])<1e-9);
 assert.ok(has(iso(41+2,56+2)),'góc trước của khu 0 nới qua hàng tường vỏ (x1+2, y1+2)');
 const top=iso(22-1,43-1);assert.ok(has([top[0],top[1]-H]),'góc sau nâng hết chiều cao tường');
 assert.ok(!has(iso(41+2,28+2)),'khu chưa mở không sáng');
});
