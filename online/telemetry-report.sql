-- Báo cáo truy cập + lỗi (24 giờ qua và 7 ngày) — Agency's Life Tycoon
delete from public.telemetry where host = 'selftest';
with v as (select * from public.telemetry where kind='visit'),
e as (select * from public.telemetry where kind='error')
select 'A. Lượt mở game 24h theo link' as muc, host as nhom, count(*)::text as so, count(distinct device)::text as thiet_bi from v where at > now()-interval '24 hours' group by host
union all select 'B. Lượt mở game 7 ngày theo link', host, count(*)::text, count(distinct device)::text from v where at > now()-interval '7 days' group by host
union all select 'C. 7 ngày theo thiết bị', platform, count(*)::text, count(distinct device)::text from v where at > now()-interval '7 days' group by platform
union all select 'D. 7 ngày theo trình duyệt', browser, count(*)::text, count(distinct device)::text from v where at > now()-interval '7 days' group by browser
union all select 'E. Mở từ icon màn hình chính (7 ngày)', standalone::text, count(*)::text, count(distinct device)::text from v where at > now()-interval '7 days' group by standalone
union all select 'F. Lỗi 24h', left(msg,120)||' @ '||left(src,60), count(*)::text, count(distinct device)::text||' tb · '||string_agg(distinct platform||'/'||browser, ', ') from e where at > now()-interval '24 hours' group by msg, src
order by 1, 3 desc;
