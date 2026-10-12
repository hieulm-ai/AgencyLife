const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),src=fs.readFileSync(path.join(root,'source/template.html'),'utf8'),guide=fs.readFileSync(path.join(root,'source/guide.js'),'utf8');
function ctx(gs){
 const el={hidden:true,attrs:{},removeAttribute(k){delete this.attrs[k];},setAttribute(k,v){this.attrs[k]=v;},querySelector(){return {innerHTML:'',set textContent(v){},focus(){},click(){},set onclick(f){},disabled:false};},querySelectorAll(){return [];}};
 const c={jobCapacity:()=>3,GS:gs||{},saves:0,save(){c.saves++;return true;},toast(){},introOpen:false,window:{UIICON:{}},PATIENCE_MIN:240,MEETING_MINUTES:20,HIRE_COST:20,MASCOT_RADIUS:3,RUBY_COIN:10,REFUND:.5,EN_REGEN_S:90,EN_MAX:120,EN_DAY_CAP:200,
  document:{activeElement:null,getElementById:id=>id==='guide'?el:null}};
 vm.createContext(c);vm.runInContext(guide,c);c.el=el;return c;
}
test('hướng dẫn chơi: 9 trang, mỗi trang có tiêu đề, ý chính, mẹo; số liệu lấy từ thông số game',()=>{
 const c=ctx(),pages=c.guidePages();
 assert.equal(pages.length,9);
 assert.deepEqual(Array.from(pages,p=>p.title),['Mục tiêu','Đón khách ở quầy lễ tân','Làm job','Nhân sự và stress','Giao sản phẩm và thu tiền','Xây văn phòng','Một ngày ở agency','Bạn bè và Hộp thư','Điều khiển']);
 for(const p of pages){assert.ok(p.lead&&p.tip&&p.items.length>=3,p.id);assert.ok(!/undefined|NaN/.test(JSON.stringify(p)),p.id);}
 const all=JSON.stringify(pages);
 for(const s of ['240 phút game','20 phút game','20 triệu/người','bán kính 3 ô','10 triệu coin','hoàn 50%','90 giây thật','tối đa 120','tối đa 200'])assert.ok(all.includes(s),s);
 assert.ok(all.includes('Account')&&all.includes('lễ tân'),'nói rõ vai trò lễ tân giao việc cho Account');
});
test('đóng hướng dẫn: đánh dấu đã xem; chỉ lưu khi đã có nhân vật (ở màn mở đầu không tạo bản lưu dở)',()=>{
 let c=ctx({});c.openGuide(3);assert.equal(vm.runInContext('guidePage',c),3);assert.equal(vm.runInContext('guideOpen',c),true);
 c.closeGuide();assert.equal(c.GS.guideSeen,true);assert.equal(c.saves,0);assert.equal(vm.runInContext('guideOpen',c),false);
 c=ctx({player:{kind:'preset',id:'01_Huy'}});c.openGuide(99);assert.equal(vm.runInContext('guidePage',c),8,'trang vượt giới hạn về trang cuối');c.closeGuide();assert.equal(c.saves,1);
});
test('biểu tượng Hướng dẫn riêng mở bảng hướng dẫn; giờ game dừng khi đang đọc; bản lưu kiểm tra cờ đã xem',()=>{
 const g=fs.readFileSync(path.join(root,'source/guide.js'),'utf8');
 assert.match(g,/b\.id="bGuide"[\s\S]*b\.onclick=\(\)=>openGuide\(0\);/);assert.match(src,/initGuideButton\(\);/);
 assert.ok(!src.includes('id="bHelp"'),'V15: Hướng dẫn không còn nằm trong Cài đặt');
 assert.match(src,/if\(titleOpen\|\|introOpen\|\|guideOpen\|\|portraitBlocked\)\{\s*try\{\s*if\(cv\.width&&cv\.height\)\s*frame\(\);\s*\}catch\(err\)\{\}\s*return;\s*\}/);
 assert.match(src,/for\(const key of \['guideSeen','introPending','tourDone','uiV15Seen'\]\)if\(o\.gs\[key\]!==undefined&&typeof o\.gs\[key\]!=='boolean'\)/);
 assert.ok(!src.includes('id="hint"'),'bỏ bảng chữ hướng dẫn cũ');
 assert.match(fs.readFileSync(path.join(root,'source/player.js'),'utf8'),/data-guide[\s\S]*openGuide\(0\)/);
});
test('hướng dẫn chạm: 10 bước, mỗi bước có câu ngắn và điểm chạm; chỉ tự chạy ở ván mới chưa chơi',()=>{
 const c=ctx({player:{kind:'preset',id:'01_Huy'}});const T=vm.runInContext('TOUR',c);
 assert.equal(T.length,10);
 assert.deepEqual(Array.from(T,s=>s.id),['me','wait','jobs','accept','handover','staff','build','shop','ach','guide']);   // V15: lần lượt 5 trung tâm ở thanh dưới
 for(const s of T){assert.ok(s.text.length<=110,s.id+' câu quá dài');assert.equal(typeof s.rect,'function',s.id);assert.ok(s.tap||s.done,s.id+' cần cách sang bước');}
 assert.ok(T.find(s=>s.id==='wait').passive&&T.find(s=>s.id==='handover').limit,'bước chờ có giới hạn thời gian');
 c.startTour=()=>{c.started=true;};vm.runInContext('startTour=()=>{started=true;}',c);
 for(const gs of [{tourDone:true},{done:2},{day:3},{}]){c.GS=Object.assign({player:gs===c?null:{kind:'preset',id:'01_Huy'}},gs);if(!Object.keys(gs).length)c.GS.player=null;c.started=false;assert.equal(c.maybeStartTour(),false,JSON.stringify(gs));}
 c.GS={player:{kind:'preset',id:'01_Huy'},day:1,done:0};assert.equal(c.maybeStartTour(),true);assert.equal(c.started,true);
});
