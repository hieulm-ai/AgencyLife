// Cấp agency theo XP + khu có công năng (15/10/2026).
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'../source',f),'utf8');
function setup(gs={}){
 const c={GS:Object.assign({gems:0,done:0},gs),UNLOCKED:new Set([0]),cash:100,
  PLOTS:[[0,'Văn phòng',20,20,39,39],[1,'Khu 1',0,0,19,19],[2,'Khu 2',40,0,59,19]],ITEM_NAME:{sound_booth:'phòng thu',camera_tripod:'máy quay'},
  news:[],gems:[],addOfficeNews(k,m){c.news.push(m);},addGems(n,w){c.GS.gems+=n;c.gems.push(w);},toast(m){c.last=m;},save(){},hud(){},fmt:v=>v+' tr',UIIMG:()=>'',
  document:{getElementById:()=>null},tourOn:false};
 vm.createContext(c);vm.runInContext(read('agency-level.js'),c);return c;
}
test('ngưỡng XP 20 × n^1,5 và lên nhiều cấp một lúc, thưởng ruby mỗi cấp',()=>{
 const c=setup();assert.equal(c.agencyLevel(),1);assert.equal(c.xpNeed(1),20);assert.equal(c.xpNeed(4),160);
 c.addXP(20+57);   // cấp 1→2 cần 20, 2→3 cần 57
 assert.equal(c.agencyLevel(),3);assert.equal(c.GS.xp,0);assert.equal(c.GS.gems,4);
 assert.ok(c.news.some(m=>/cấp 3/.test(m)&&/Tuyển Sale/.test(m)));
});
test('cấp 15 mở Phòng thu: Âm thanh, phòng thu, Podcast; video từ cấp 9',()=>{
 const c=setup();const u=c.unlocksAt(15).join('|');
 for(const s of ['Tuyển Âm thanh','Đồ: phòng thu','Job: Podcast thương hiệu','Công năng khu: Phòng thu','Mở được khu thứ 8'])assert.ok(u.includes(s),s);
 assert.equal(c.roleMinLv('Âm thanh'),15);assert.equal(c.roleMinLv('Quay phim'),9);assert.equal(c.jobMinLv('⭐ Quay video TikTok'),9);
 assert.equal(c.jobMinLv('Thiết kế logo'),1);assert.equal(c.itemMinLv('sound_booth'),15);assert.equal(c.itemMinLv('desk'),1);
});
test('khu thứ k cần cấp theo ZONE_LV; cấp tối đa 30 không cộng XP thừa',()=>{
 const c=setup();assert.equal(c.nextZoneLv(),3);c.UNLOCKED.add(1);assert.equal(c.nextZoneLv(),5);
 c.GS.agLv=29;c.GS.xp=0;c.addXP(1e6);assert.equal(c.agencyLevel(),30);assert.equal(c.GS.xp,0);
});
test('XP job = 0,75 × giờ công, +20% khi khách chấm ≥ 4★; bản lưu cũ quy đổi từ số job đã xong',()=>{
 const c=setup();assert.equal(c.jobXP({need:40},3),30);assert.equal(c.jobXP({need:40},5),36);
 const old=setup({done:10});old.migrateAgencyLevel();assert.equal(old.agencyLevel(),4);assert.equal(old.GS.gems,0,'quy đổi không phát ruby');
 old.migrateAgencyLevel();assert.equal(old.agencyLevel(),4,'chỉ quy đổi một lần');
});
test('công năng khu: cần đủ cấp, tăng tốc đúng bước, pantry giảm stress mạnh hơn, đổi có phí',()=>{
 const c=setup();c.UNLOCKED.add(1);
 assert.equal(c.setZoneFn(1,'sound',false),false);assert.match(c.last,/cấp 15/);
 assert.ok(c.setZoneFn(1,'creative',false));assert.equal(c.plotName(c.PLOTS[1]),'Phòng Sáng tạo');
 assert.equal(c.zoneRoleF({x:5,y:5},'des'),1.1);assert.equal(c.zoneRoleF({x:5,y:5},'cam'),1);assert.equal(c.zoneRoleF({x:25,y:25},'des'),1);
 c.GS.agLv=7;assert.ok(c.setZoneFn(1,'pantry',true));assert.equal(c.cash,50);assert.equal(c.zoneReliefF({gx:3,gy:3}),1.3);
 assert.equal(c.setZoneFn(0,'creative',false),false,'văn phòng gốc không đổi công năng');
});
