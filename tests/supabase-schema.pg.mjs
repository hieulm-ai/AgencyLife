// Kiểm thử online/supabase-schema.sql trên Postgres chạy trong máy (PGlite), giả lập phần auth của Supabase.
// Chạy: node tests/supabase-schema.pg.mjs <thư mục có node_modules/@electric-sql/pglite>
// Không nằm trong `node --test tests/*.test.cjs` vì cần gói PGlite cài riêng.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const dir = process.argv[2]; if (!dir) { console.error('Cần đường dẫn thư mục có PGlite'); process.exit(2); }
const { PGlite } = await import(createRequire(dir + '/x.js').resolve('@electric-sql/pglite'));
const db = new PGlite();
const sql = readFileSync(fileURLToPath(new URL('../online/supabase-schema.sql', import.meta.url)), 'utf8');
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth; grant usage on schema auth to authenticated, anon;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to authenticated, anon;
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
`);
await db.exec(sql);
await db.exec(sql);   // chạy lại lần 2 không lỗi
const U = { a: '00000000-0000-0000-0000-00000000000a', b: '00000000-0000-0000-0000-00000000000b', c: '00000000-0000-0000-0000-00000000000c', d: '00000000-0000-0000-0000-00000000000d' };
for (const [k, id] of Object.entries(U)) await db.query('insert into auth.users values ($1,$2)', [id, k + '@x.vn']);
let pass = 0;
async function as(user, q, params = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${user || ''}'; set role ${user ? 'authenticated' : 'anon'};`);
  try { return (await db.query(q, params)).rows; } finally { await db.exec('reset role;'); }
}
async function fails(user, q, params, code) {
  try { await as(user, q, params); } catch (e) { if (code) assert.match(e.message, new RegExp(code)); pass++; return; }
  assert.fail('Phải bị từ chối: ' + q);
}
const ok = (v, m) => { assert.ok(v, m); pass++; };

// hồ sơ + mã bạn
for (const k of ['a', 'b', 'c', 'd']) await as(U[k], 'insert into public.profiles (id, agency) values ($1,$2)', [U[k], 'Agency ' + k.toUpperCase()]);
const code = Object.fromEntries((await as(U.a, 'select id, code from public.profiles')).map(r => [Object.keys(U).find(k => U[k] === r.id), r.code]));
ok(Object.values(code).every(c => /^AGN-[A-Z2-9]{4}$/.test(c)), 'mã bạn đúng dạng');
await fails(U.a, 'insert into public.profiles (id, agency) values ($1,$2)', [U.b, 'giả'], '');                 // tạo hồ sơ hộ người khác
await fails(U.a, 'update public.profiles set likes = 999 where id = $1', [U.a], 'permission');                 // tự tăng like
await fails(U.a, 'update public.profiles set code = $2 where id = $1', [U.a, 'AGN-AAAA'], 'permission');
await as(U.a, 'update public.profiles set agency = $2 where id = $1', [U.b, 'Hack']);
ok((await as(U.b, 'select agency from public.profiles where id=$1', [U.b]))[0].agency === 'Agency B', 'không sửa được hồ sơ người khác');
await fails(null, 'select * from public.profiles', [], 'permission');                                         // chưa đăng nhập

// bản lưu: chỉ chủ
await as(U.a, 'insert into public.saves (id, data, client_t) values ($1, $2, 1)', [U.a, JSON.stringify({ cash: 5 })]);
ok((await as(U.b, 'select * from public.saves')).length === 0, 'B không đọc được bản lưu của A');
await fails(U.b, 'insert into public.saves (id, data) values ($1, $2)', [U.a, '{}'], '');

// văn phòng: chỉ bạn bè đọc
await as(U.a, 'insert into public.offices (id, data) values ($1, $2)', [U.a, JSON.stringify({ objs: [] })]);
ok((await as(U.b, 'select * from public.offices where id=$1', [U.a])).length === 0, 'chưa là bạn thì không xem văn phòng');

// kết bạn
await fails(U.a, 'select public.send_friend_request($1)', ['AGN-ZZZZ'], 'code_not_found');
await fails(U.a, 'select public.send_friend_request($1)', [code.a], 'self');
ok((await as(U.a, 'select public.send_friend_request($1) r', [code.b.toLowerCase()]))[0].r === 'sent', 'gửi lời mời (mã chữ thường vẫn nhận)');
ok((await as(U.a, 'select public.send_friend_request($1) r', [code.b]))[0].r === 'sent', 'gửi lại không tạo trùng');
const req = (await as(U.b, "select id from public.friend_requests where to_id=$1 and status='pending'", [U.b]))[0].id;
await fails(U.c, 'select public.respond_friend_request($1, true)', [req], 'request_not_found');               // người ngoài không chấp nhận hộ
ok((await as(U.b, 'select public.respond_friend_request($1, true) r', [req]))[0].r === 'accepted', 'B chấp nhận');
ok((await as(U.b, 'select * from public.offices where id=$1', [U.a])).length === 1, 'là bạn rồi thì xem được văn phòng');
ok((await as(U.c, 'select * from public.offices where id=$1', [U.a])).length === 0, 'C vẫn không xem được');
await fails(U.a, 'select public.send_friend_request($1)', [code.b], 'already_friends');
// mời chéo: C mời A, A nhập mã C → chấp nhận luôn
await as(U.c, 'select public.send_friend_request($1)', [code.a]);
ok((await as(U.a, 'select public.send_friend_request($1) r', [code.c]))[0].r === 'accepted', 'mời chéo thì thành bạn ngay');
await fails(U.a, 'insert into public.friendships (a,b) values ($1,$2)', [U.a, U.d], 'permission');            // tự thêm bạn

// quà: mỗi bạn 1 quà/ngày, tặng nhiều bạn được
await fails(U.a, 'select public.send_gift($1,$2)', [U.b, 'aquarium'], 'bad_gift');
const g1 = (await as(U.a, 'select public.send_gift($1,$2) id', [U.b, 'potted_plant']))[0].id;
await fails(U.a, 'select public.send_gift($1,$2)', [U.b, 'ruby_1'], 'gift_done_today');
ok((await as(U.a, 'select public.send_gift($1,$2) id', [U.c, 'ruby_2']))[0].id > 0, 'cùng ngày tặng bạn khác được');
await fails(U.a, 'select public.send_gift($1,$2)', [U.d, 'potted_plant'], 'not_friends');
await as(U.c, 'select public.send_gift($1,$2)', [U.a, 'rug_blue']);
await as(U.b, 'select public.send_gift($1,$2)', [U.a, 'ruby_3']);
await fails(U.a, 'insert into public.mail (to_id, from_id, kind, item) values ($1,$2,$3,$4)', [U.b, U.a, 'gift', 'big_tree'], 'permission');
// nhận: 1 lần; người khác không nhận hộ
await fails(U.c, 'select public.claim_mail($1)', [g1], 'not_claimable');
ok((await as(U.b, 'select public.claim_mail($1) it', [g1]))[0].it === 'potted_plant', 'B nhận quà');
await fails(U.b, 'select public.claim_mail($1)', [g1], 'not_claimable');
await fails(U.b, 'update public.mail set claimed=false where id=$1', [g1], 'permission');
const all = await as(U.a, 'select * from public.claim_all_mail()');
ok(all.length === 2 && all.map(r => r.item).sort().join() === 'ruby_3,rug_blue', 'A nhận tất cả 2 quà');
ok((await as(U.a, 'select * from public.claim_all_mail()')).length === 0, 'nhận tất cả lần 2 không còn gì');

// lời nhắn, like
for (let i = 0; i < 3; i++) await as(U.b, 'select public.send_note($1,$2)', [U.a, 'Chào ' + i]);
await fails(U.b, 'select public.send_note($1,$2)', [U.a, 'lần 4'], 'note_limit');
await fails(U.b, 'select public.send_note($1,$2)', [U.c, 'x'], 'not_friends');
await fails(U.c, 'select public.send_note($1,$2)', [U.a, 'x'.repeat(141)], 'bad_note');
await as(U.b, 'select public.send_like($1)', [U.a]);
await fails(U.b, 'select public.send_like($1)', [U.a], 'like_done_today');
ok((await as(U.c, 'select likes from public.profiles where id=$1', [U.a]))[0].likes === 1, 'like cộng vào hồ sơ');
ok((await as(U.c, 'select * from public.mail where to_id=$1', [U.a])).every(m => m.from_id === U.c), 'C chỉ thấy thư mình gửi cho A');

// chặn: hết là bạn, không gửi được nữa, không xem văn phòng
await as(U.a, 'select public.block_user($1)', [U.b]);
ok((await as(U.b, 'select * from public.offices where id=$1', [U.a])).length === 0, 'bị chặn thì không xem văn phòng');
await fails(U.b, 'select public.send_friend_request($1)', [code.a], 'blocked');
await fails(U.b, 'select public.send_note($1,$2)', [U.a, 'hi'], 'not_friends');
ok((await as(U.a, "select * from public.mail where from_id=$1 and kind='note'", [U.b])).length === 0, 'chặn thì xóa lời nhắn của người đó');

// xóa dữ liệu của mình
await as(U.c, 'select public.delete_my_data()');
ok((await as(U.a, 'select * from public.profiles where id=$1', [U.c])).length === 0, 'xóa dữ liệu C');
ok((await as(U.a, 'select * from public.friendships where b=$1', [U.c])).length === 0, 'C rời khỏi danh sách bạn của A');
console.log(`supabase-schema: ${pass} kiểm tra đạt`);
