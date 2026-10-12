// Chỉnh UI 07/10/2026 (13:39): nút từ chối job màu đỏ, icon thanh dưới to và cân giữa, nút mở đất vuông,
// chấm thông báo to hơn nằm trên góc khung, hàng ô dưới tường vỏ cũng lát gạch.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../source');
const tpl=fs.readFileSync(path.join(root,'template.html'),'utf8'),css=fs.readFileSync(path.join(root,'hud-layout.css'),'utf8');
const last=(re)=>{let m,r=null;const g=new RegExp(re.source,'g');while((m=g.exec(css)))r=m;return r;};

test('nút "Từ chối job" dùng khung đỏ riêng (.btn.rd) và ảnh khung có thật',()=>{
 assert.match(tpl,/class="btn rd" data-decline="\$\{j\.id\}"[^>]*>Từ chối job</);
 const m=last(/\.btn\.rd\{border-image:url\(assets\/static\/([0-9a-f]{24}\.png)\)/);
 assert.ok(m,'có luật .btn.rd');assert.ok(fs.existsSync(path.join(root,'static',m[1])),'ảnh khung đỏ nằm trong source/static');
});

test('thanh dưới V15: 5 trung tâm + ô Gói VIP rộng; icon có chữ; chấm thông báo 30px nằm trên góc khung',()=>{
 assert.match(css,/#nav\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\) 1\.7fr!important/,'5 ô vuông + nút VIP rộng');
 assert.match(css,/#nav \.nb:not\(\.crown-wide\) \.ic img\{width:58px!important;height:58px!important\}/);
 assert.match(css,/#nav \.nl\{/,'mỗi trung tâm có chữ dưới icon');
 const b=last(/#nav \.bdg,#topR \.bdg,#expand \.bdg\{min-width:(\d+)px!important;height:(\d+)px/);assert.ok(+b[1]>=30&&+b[2]>=30);
 const p=last(/#nav \.nb:not\(\.crown-wide\) \.bdg\{top:(-\d+)px!important;right:(-\d+)px/);assert.ok(+p[1]<=-12&&+p[2]<=-12,'chấm lệch ra ngoài góc khung, không đè icon');
});

test('đất khu chưa mở lát họa tiết xám; ô dưới tường vỏ lát sàn gỗ văn phòng (08/10)',()=>{
 assert.match(tpl,/if\(vv!==3&&\(vv===-2\|\|plotAt\(x,y\)\)\)\{ const r=hash\(x,y\);/);
});
test('tường bao quanh đổi được kiểu (08/10): không hỏi mở khu, giữ là tường vỏ, phá thì về tường kem, không thành lan can',()=>{
 assert.match(tpl,/if\(plotAt\(x,y\)&&!shell\)\{ bad\.push\(\[x,y\]\); continue; \}/);
 assert.match(tpl,/else if\(\(v===1\|\|shell\)&&wallStyleOf\(x,y\)!==selWall&&!\(shell&&selWall==="lancan"\)\) ok\.push\(\[x,y\]\);/);
 assert.match(tpl,/if\(tool==="wall"\)\{ if\(G\[y\]\[x\]!==3\) G\[y\]\[x\]=1; WS\[k\]=selWall; \}/);
 assert.match(tpl,/else \{ if\(G\[y\]\[x\]!==3\) G\[y\]\[x\]=0; delete WS\[k\]; delete DS\[k\]; \}/);
 assert.match(tpl,/plotAt\(\.\.\.toTile\(e\.clientX,e\.clientY\)\)&&at\(\.\.\.toTile\(e\.clientX,e\.clientY\)\)!==3\)\{ askUnlock/);
 assert.match(tpl,/const WALL_H=44;/);
});
test('vòng tiến trình (V17): theo bước được giao, có icon bộ phận; xanh lá khi đang làm, xám khi chờ; buổi họp xanh dương',()=>{
 assert.match(tpl,/const t=agentTask\(a\); if\(!t\) return null; const on=jobReady\(t\.j\)&&workerRate\(a\)>0;/);
 assert.match(tpl,/col:on\?"#4DB33D":"#A89C82",ic:ROLE_IC\[t\.s\.role\]/);assert.match(tpl,/col:"#3E7FD9",ic:"people"/);
 assert.match(tpl,/const im=r\.ic&&ringIcon\(r\.ic\); if\(im\) c\.drawImage\(im,x-4\.5,y-4\.5,9,9\);/);
 assert.match(tpl,/if\(!closingOffice\) for\(const a of AG\) if\(!a\.emo&&!\(a\.state==="use"&&a\.useObj\)\) drawProgressRing\(g,a\);/);
});
