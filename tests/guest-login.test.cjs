const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
test('guest password is hashed, wrong password rejected, sessions and separate saves restored',async()=>{
 const src=fs.readFileSync(path.join(__dirname,'../source/online.js'),'utf8');
 const data=new Map([['save','first']]);const c={crypto:webcrypto,TextEncoder,OL:{user:null},SAVE:'save',localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},location:{reload(){}},olLS:k=>JSON.parse(data.get(k)||'null')};
 vm.createContext(c);vm.runInContext(src.slice(src.indexOf("const GUEST_USERS="),src.indexOf('function openLogin(){')),c);
 await c.guestLogin('alice','password1',true);assert.ok(!data.get('agency.guest.users').includes('password1'));
 await assert.rejects(c.guestLogin('alice','wrongpw',false));
 data.set('save','alice-progress');await c.guestLogin('bob','password2',true);data.set('save','bob-progress');await c.guestLogin('alice','password1',false);
 assert.equal(data.get('save'),'alice-progress');assert.equal(JSON.parse(data.get('agency.guest.session')),'alice');
 await assert.rejects(c.guestLogin('__proto__','password1',true));
});
