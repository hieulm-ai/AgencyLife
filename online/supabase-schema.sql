-- Agency's Life Tycoon · Online bản 1 (tài khoản, lưu đám mây, bạn bè, tham quan, hộp thư, quà)
-- Chạy 1 lần trong Supabase → SQL Editor → New query → dán toàn bộ → Run.
-- Chạy lại được (idempotent) khi có bản cập nhật: bảng giữ nguyên dữ liệu, hàm và quy tắc được tạo lại.
-- Ngày tính theo giờ Việt Nam (Asia/Ho_Chi_Minh). Mọi giới hạn nằm ở đây, trình duyệt không vượt được.

-- ---------- tiện ích ----------
create or replace function public.vn_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;

create or replace function public.gen_friend_code() returns text
language plpgsql volatile as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- bỏ 0/O, 1/I dễ nhầm
  c text;
begin
  loop
    c := 'AGN-';
    for i in 1..4 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
    exit when not exists (select 1 from public.profiles where code = c);
  end loop;
  return c;
end $$;

-- ---------- bảng ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  agency text not null default 'Agency' check (char_length(agency) between 1 and 40),
  look jsonb not null default '{}'::jsonb check (octet_length(look::text) <= 4000),
  level int not null default 1 check (level between 1 and 99),
  rep int not null default 0 check (rep between 0 and 1000000),
  jobs int not null default 0 check (jobs between 0 and 10000000),
  likes int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.profiles alter column code set default public.gen_friend_code();

create table if not exists public.saves (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (octet_length(data::text) <= 1000000),
  client_t bigint not null default 0,
  device text not null default '' check (char_length(device) <= 40),
  updated_at timestamptz not null default now()
);

create table if not exists public.offices (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (octet_length(data::text) <= 500000),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  day date not null default public.vn_today(),
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create table if not exists public.friendships (
  a uuid not null references auth.users(id) on delete cascade,
  b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);

create table if not exists public.blocks (
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.mail (
  id bigint generated always as identity primary key,
  to_id uuid not null references auth.users(id) on delete cascade,
  from_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('gift','note','like','wage')),
  item text check (item is null or item ~ '^[a-z0-9_]{1,40}$'),
  body text check (body is null or char_length(body) between 1 and 140),
  day date not null default public.vn_today(),
  claimed boolean not null default false,
  created_at timestamptz not null default now()
);
-- 1 quà và 1 like cho mỗi bạn mỗi ngày (gửi cho bạn khác vẫn được)
create unique index if not exists mail_gift_once on public.mail (from_id, to_id, day) where kind = 'gift';
create unique index if not exists mail_like_once on public.mail (from_id, to_id, day) where kind = 'like';
create index if not exists mail_to on public.mail (to_id, created_at desc);
-- 14/10/2026: thư 'wage' = tiền công khi bạn bè mượn nhân viên. Bảng cũ (chạy lại file này) được nới ràng buộc ở đây.
alter table public.mail drop constraint if exists mail_kind_check;
alter table public.mail add constraint mail_kind_check check (kind in ('gift','note','like','wage'));
-- mượn mỗi bạn 1 lần/ngày
create unique index if not exists mail_wage_once on public.mail (from_id, to_id, day) where kind = 'wage';

-- Danh sách quà được phép (game chọn 4 món mỗi ngày từ danh sách này). Đổi danh sách: sửa bảng này.
create table if not exists public.gift_pool (item text primary key);
insert into public.gift_pool (item) values
  ('potted_plant'),('decorative_blue_mark'),('coffee_table'),('water_dispenser'),
  ('rug_blue'),('bookshelf'),('softbox'),('ruby_1'),('ruby_2'),('ruby_3')
on conflict do nothing;

-- ---------- quyền: chỉ đọc/ghi qua RLS; thao tác giữa 2 người chỉ qua hàm bên dưới ----------
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.offices enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.mail enable row level security;
alter table public.gift_pool enable row level security;

revoke all on public.profiles, public.saves, public.offices, public.friend_requests,
  public.friendships, public.blocks, public.mail, public.gift_pool from anon, authenticated;
grant select on public.profiles, public.friend_requests, public.friendships, public.blocks, public.mail, public.gift_pool to authenticated;
grant insert (id, agency, look, level, rep, jobs) on public.profiles to authenticated;
grant update (agency, look, level, rep, jobs, updated_at) on public.profiles to authenticated;   -- không tự sửa mã bạn, số like
grant select, insert, update, delete on public.saves to authenticated;
grant select, insert, update, delete on public.offices to authenticated;
grant insert, delete on public.blocks to authenticated;
grant delete on public.mail to authenticated;

create or replace function public.are_friends(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships where a = x and b = y) $$;
create or replace function public.is_blocked(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x)) $$;

drop policy if exists p_profiles_read on public.profiles;
create policy p_profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists p_profiles_ins on public.profiles;
create policy p_profiles_ins on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists p_profiles_upd on public.profiles;
create policy p_profiles_upd on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists p_saves_own on public.saves;
create policy p_saves_own on public.saves for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists p_offices_read on public.offices;
create policy p_offices_read on public.offices for select to authenticated
  using (id = auth.uid() or (public.are_friends(auth.uid(), id) and not public.is_blocked(auth.uid(), id)));
drop policy if exists p_offices_write on public.offices;
create policy p_offices_write on public.offices for insert to authenticated with check (id = auth.uid());
drop policy if exists p_offices_upd on public.offices;
create policy p_offices_upd on public.offices for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists p_offices_del on public.offices;
create policy p_offices_del on public.offices for delete to authenticated using (id = auth.uid());

drop policy if exists p_req_read on public.friend_requests;
create policy p_req_read on public.friend_requests for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());
drop policy if exists p_friends_read on public.friendships;
create policy p_friends_read on public.friendships for select to authenticated using (a = auth.uid());
drop policy if exists p_blocks_own on public.blocks;
create policy p_blocks_own on public.blocks for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());
drop policy if exists p_mail_read on public.mail;
create policy p_mail_read on public.mail for select to authenticated using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists p_mail_del on public.mail;
create policy p_mail_del on public.mail for delete to authenticated using (to_id = auth.uid());
drop policy if exists p_pool_read on public.gift_pool;
create policy p_pool_read on public.gift_pool for select to authenticated using (true);

-- ---------- hàm thao tác giữa hai người (lỗi trả về mã ngắn, game dịch sang tiếng Việt) ----------
create or replace function public.send_friend_request(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); them uuid; rev public.friend_requests;
begin
  if me is null then raise exception 'not_logged_in'; end if;
  select id into them from public.profiles where code = upper(trim(p_code));
  if them is null then raise exception 'code_not_found'; end if;
  if them = me then raise exception 'self'; end if;
  if public.is_blocked(me, them) then raise exception 'blocked'; end if;
  if public.are_friends(me, them) then raise exception 'already_friends'; end if;
  if (select count(*) from public.friendships where a = me) >= 50 then raise exception 'friend_limit'; end if;
  if (select count(*) from public.friend_requests where from_id = me and day = public.vn_today()) >= 20 then raise exception 'request_limit'; end if;
  select * into rev from public.friend_requests where from_id = them and to_id = me and status = 'pending';
  if found then   -- người kia đã mời mình: chấp nhận luôn
    perform public.respond_friend_request(rev.id, true);
    return 'accepted';
  end if;
  insert into public.friend_requests (from_id, to_id) values (me, them)
  on conflict (from_id, to_id) do update set status = 'pending', day = public.vn_today(), created_at = now()
    where public.friend_requests.status <> 'pending';
  return 'sent';
end $$;

create or replace function public.respond_friend_request(p_id bigint, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r public.friend_requests;
begin
  select * into r from public.friend_requests where id = p_id and to_id = me and status = 'pending' for update;
  if not found then raise exception 'request_not_found'; end if;
  if not p_accept then update public.friend_requests set status = 'declined' where id = p_id; return 'declined'; end if;
  if public.is_blocked(r.from_id, r.to_id) then raise exception 'blocked'; end if;
  if (select count(*) from public.friendships where a = r.from_id) >= 50
     or (select count(*) from public.friendships where a = r.to_id) >= 50 then raise exception 'friend_limit'; end if;
  update public.friend_requests set status = 'accepted' where id = p_id;
  update public.friend_requests set status = 'accepted' where from_id = r.to_id and to_id = r.from_id and status = 'pending';
  insert into public.friendships (a, b) values (r.from_id, r.to_id), (r.to_id, r.from_id) on conflict do nothing;
  return 'accepted';
end $$;

create or replace function public.remove_friend(p_other uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friendships where (a = auth.uid() and b = p_other) or (a = p_other and b = auth.uid());
  delete from public.friend_requests where (from_id = auth.uid() and to_id = p_other) or (from_id = p_other and to_id = auth.uid()); $$;

create or replace function public.block_user(p_other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_other = auth.uid() then raise exception 'self'; end if;
  insert into public.blocks (blocker, blocked) values (auth.uid(), p_other) on conflict do nothing;
  perform public.remove_friend(p_other);
  delete from public.mail where to_id = auth.uid() and from_id = p_other and not (kind in ('gift','wage') and claimed = false);
end $$;

create or replace function public.check_pair(p_to uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not_logged_in'; end if;
  if p_to = me then raise exception 'self'; end if;
  if not public.are_friends(me, p_to) then raise exception 'not_friends'; end if;
  if public.is_blocked(me, p_to) then raise exception 'blocked'; end if;
  return me;
end $$;

create or replace function public.send_gift(p_to uuid, p_item text) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := public.check_pair(p_to); new_id bigint;
begin
  if not exists (select 1 from public.gift_pool where item = p_item) then raise exception 'bad_gift'; end if;
  begin
    insert into public.mail (to_id, from_id, kind, item) values (p_to, me, 'gift', p_item) returning id into new_id;
  exception when unique_violation then raise exception 'gift_done_today';
  end;
  return new_id;
end $$;

create or replace function public.send_note(p_to uuid, p_body text) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := public.check_pair(p_to); b text := trim(p_body); new_id bigint;
begin
  if b is null or char_length(b) < 1 or char_length(b) > 140 then raise exception 'bad_note'; end if;
  if (select count(*) from public.mail where from_id = me and to_id = p_to and kind = 'note' and day = public.vn_today()) >= 3 then raise exception 'note_limit'; end if;
  insert into public.mail (to_id, from_id, kind, body) values (p_to, me, 'note', b) returning id into new_id;
  return new_id;
end $$;

create or replace function public.send_like(p_to uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.check_pair(p_to);
begin
  begin
    insert into public.mail (to_id, from_id, kind) values (p_to, me, 'like');
  exception when unique_violation then raise exception 'like_done_today';
  end;
  update public.profiles set likes = likes + 1 where id = p_to;
end $$;

-- Mượn nhân viên của bạn (14/10/2026): người mượn gọi hàm; người cho mượn nhận thư 'wage'.
-- Tiền công = 2 × lương ngày của nhân viên đó; game của người cho mượn tính khi bấm Nhận.
-- Mỗi bạn 1 lần/ngày, tối đa 3 lần/ngày; chỉ mượn người có trong văn phòng đã lưu của bạn, không phải nhân vật chính hay linh vật.
create or replace function public.borrow_staff(p_owner uuid, p_staff text) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := public.check_pair(p_owner); office jsonb; new_id bigint;
begin
  if p_staff is null or p_staff !~ '^[A-Za-z0-9_]{1,34}$' or p_staff = '09_Vit_Vang' then raise exception 'borrow_bad_staff'; end if;
  select data into office from public.offices where id = p_owner;
  if office is null then raise exception 'borrow_no_office'; end if;
  if jsonb_typeof(office->'gs'->'staffIds') is distinct from 'array' or not (office->'gs'->'staffIds' ? p_staff)
     or coalesce(office->'gs'->'player'->>'id', '') = p_staff then raise exception 'borrow_bad_staff'; end if;
  if (select count(*) from public.mail where from_id = me and kind = 'wage' and day = public.vn_today()) >= 3 then raise exception 'borrow_limit'; end if;
  begin
    insert into public.mail (to_id, from_id, kind, item) values (p_owner, me, 'wage', 'wage_' || lower(p_staff)) returning id into new_id;
  exception when unique_violation then raise exception 'borrow_done_today';
  end;
  return new_id;
end $$;

-- Nhận quà: mỗi thư chỉ đổi "chưa nhận → đã nhận" 1 lần; game chỉ cộng vào Kho khi hàm trả về món quà.
create or replace function public.claim_mail(p_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare it text;
begin
  update public.mail set claimed = true
   where id = p_id and to_id = auth.uid() and kind in ('gift','wage') and claimed = false
  returning item into it;
  if it is null then raise exception 'not_claimable'; end if;
  return it;
end $$;

create or replace function public.claim_all_mail() returns table (id bigint, item text)
language sql security definer set search_path = public as $$
  update public.mail m set claimed = true
   where m.to_id = auth.uid() and m.kind in ('gift','wage') and m.claimed = false
  returning m.id, m.item $$;

-- Xóa dữ liệu game của chính mình (tài khoản đăng nhập xóa ở Supabase → Authentication → Users).
create or replace function public.delete_my_data() returns void
language sql security definer set search_path = public as $$
  delete from public.mail where to_id = auth.uid() or from_id = auth.uid();
  delete from public.friendships where a = auth.uid() or b = auth.uid();
  delete from public.friend_requests where from_id = auth.uid() or to_id = auth.uid();
  delete from public.blocks where blocker = auth.uid() or blocked = auth.uid();
  delete from public.offices where id = auth.uid();
  delete from public.saves where id = auth.uid();
  delete from public.profiles where id = auth.uid(); $$;

revoke all on function public.send_friend_request(text), public.respond_friend_request(bigint, boolean),
  public.remove_friend(uuid), public.block_user(uuid), public.check_pair(uuid), public.send_gift(uuid, text), public.borrow_staff(uuid, text),
  public.send_note(uuid, text), public.send_like(uuid), public.claim_mail(bigint), public.claim_all_mail(),
  public.delete_my_data(), public.are_friends(uuid, uuid), public.is_blocked(uuid, uuid), public.gen_friend_code() from public, anon;
grant execute on function public.send_friend_request(text), public.respond_friend_request(bigint, boolean),
  public.remove_friend(uuid), public.block_user(uuid), public.send_gift(uuid, text), public.borrow_staff(uuid, text),
  public.send_note(uuid, text), public.send_like(uuid), public.claim_mail(bigint), public.claim_all_mail(),
  public.delete_my_data(), public.are_friends(uuid, uuid), public.is_blocked(uuid, uuid), public.gen_friend_code() to authenticated;

-- Cập nhật 15/10/2026: theo dõi lượt truy cập + lỗi cho open beta (ẩn danh, chỉ ghi; xem trong SQL Editor)
create table if not exists public.telemetry (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in ('visit','error')),
  host text check (char_length(host) <= 60),
  platform text check (char_length(platform) <= 20),
  browser text check (char_length(browser) <= 20),
  standalone boolean not null default false,
  device text check (char_length(device) <= 40),
  ver text check (char_length(ver) <= 20),
  screen text check (char_length(screen) <= 20),
  msg text check (char_length(msg) <= 300),
  src text check (char_length(src) <= 200)
);
create index if not exists telemetry_at_idx on public.telemetry (at desc);
create index if not exists telemetry_device_at_idx on public.telemetry (device, at desc);
alter table public.telemetry enable row level security;
drop policy if exists telemetry_insert on public.telemetry;
create policy telemetry_insert on public.telemetry for insert to anon, authenticated with check (true);
revoke all on public.telemetry from anon, authenticated;
grant insert (kind, host, platform, browser, standalone, device, ver, screen, msg, src) on public.telemetry to anon, authenticated;
-- Chống ghi tràn: mỗi thiết bị tối đa 20 dòng / 10 phút; bảng giữ 90 ngày.
create or replace function public.telemetry_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.telemetry where device = new.device and at > now() - interval '10 minutes') >= 20 then
    return null;
  end if;
  if random() < 0.01 then delete from public.telemetry where at < now() - interval '90 days'; end if;
  return new;
end $$;
revoke all on function public.telemetry_guard() from public, anon, authenticated;
drop trigger if exists telemetry_guard on public.telemetry;
create trigger telemetry_guard before insert on public.telemetry for each row execute function public.telemetry_guard();
