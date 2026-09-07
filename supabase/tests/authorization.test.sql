-- Runs in the local database after db reset. All changes roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

select is((select count(*) from public.curated_assets), 88::bigint, 'all 88 current curated symbols seeded');
select is((select count(*) from private.admin_users), 1::bigint, 'one local admin');

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select is((select count(*) from public.curated_assets c join public.assets a using (symbol)), 88::bigint, 'visitor reads curated catalog');
select throws_ok($$insert into public.curated_assets values ('AAPL')$$, '42501', null, 'visitor cannot insert curated assets');
select throws_ok($$delete from public.curated_assets where symbol = 'AAPL'$$, '42501', null, 'visitor cannot delete curated assets');
select throws_ok($$select * from public.watchlist_items$$, '42501', null, 'visitor cannot read watchlists');
select throws_ok($$insert into public.watchlist_items (symbol) values ('NVDA')$$, '42501', null, 'visitor cannot write watchlists');
select throws_ok($$insert into public.assets values ('TEST')$$, '42501', null, 'visitor cannot write catalog');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is(private.is_admin(), false, 'Alice is not an admin');
select results_eq($$select symbol from public.watchlist_items order by symbol$$, array['AAPL']::text[], 'Alice sees only her watchlist');
select lives_ok($$insert into public.watchlist_items (symbol) values ('NVDA')$$, 'owner inserts watchlist item');
select throws_ok($$insert into public.watchlist_items (symbol) values ('NVDA')$$, '23505', null, 'duplicate watchlist item rejected');
select throws_ok($$insert into public.watchlist_items (symbol) values ('NOTSEEDED')$$, '23503', null, 'watchlist must reference catalog');
select throws_ok($$insert into public.watchlist_items values ('33333333-3333-4333-8333-333333333333', 'NVDA')$$, '42501', null, 'cross-user insert denied');
select results_eq($$delete from public.watchlist_items where user_id = '33333333-3333-4333-8333-333333333333' returning symbol$$, array[]::text[], 'cross-user delete affects zero rows');
select throws_ok($$update public.watchlist_items set user_id = '33333333-3333-4333-8333-333333333333'$$, '42501', null, 'ownership changes have no UPDATE grant');
select results_eq($$delete from public.watchlist_items where symbol = 'NVDA' returning symbol$$, array['NVDA']::text[], 'owner deletes own item');
select throws_ok($$insert into public.curated_assets values ('AAPL')$$, '42501', null, 'ordinary user cannot add curated membership');
select results_eq($$delete from public.curated_assets where symbol = 'AAPL' returning symbol$$, array[]::text[], 'ordinary user cannot remove membership');
select throws_ok($$insert into public.assets values ('TEST')$$, '42501', null, 'ordinary user cannot extend catalog');
select throws_ok($$insert into private.admin_users values ('22222222-2222-4222-8222-222222222222')$$, '42501', null, 'self-promotion denied');
select throws_ok($$update private.admin_users set user_id = '22222222-2222-4222-8222-222222222222'$$, '42501', null, 'role reassignment denied');
select throws_ok($$delete from private.admin_users$$, '42501', null, 'role removal denied');
select throws_ok($$truncate public.curated_assets$$, '42501', null, 'TRUNCATE cannot bypass RLS');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","user_metadata":{"role":"admin","is_admin":true}}', true);
select is(private.is_admin(), false, 'editable metadata cannot confer admin');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select results_eq($$select symbol from public.watchlist_items$$, array['MSFT']::text[], 'Bob retains his private watchlist');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(private.is_admin(), true, 'trusted assignment confers admin');
select is((select count(*) from public.watchlist_items), 1::bigint, 'admin cannot read other watchlists');
select throws_ok($$insert into public.watchlist_items values ('22222222-2222-4222-8222-222222222222', 'NVDA')$$, '42501', null, 'admin cannot write another watchlist');
select results_eq($$delete from public.watchlist_items where user_id = '33333333-3333-4333-8333-333333333333' returning symbol$$, array[]::text[], 'admin cannot delete another watchlist');
select throws_ok($$insert into private.admin_users values ('33333333-3333-4333-8333-333333333333')$$, '42501', null, 'app admin cannot appoint admins');
select lives_ok($$insert into public.assets values ('TEST')$$, 'admin registers a searched asset');
select lives_ok($$insert into public.curated_assets values ('TEST')$$, 'admin curates registered asset');
select throws_ok($$insert into public.assets values ('bad symbol')$$, '23514', null, 'catalog enforces canonical symbol');
select throws_ok($$delete from public.assets where symbol = 'AAPL'$$, '42501', null, 'admin cannot delete asset identity');
select results_eq($$delete from public.curated_assets where symbol = 'AAPL' returning symbol$$, array['AAPL']::text[], 'admin removes curated membership');
reset role;
select is((select count(*) from public.watchlist_items where symbol = 'AAPL'), 2::bigint, 'removing membership preserves watchlists');
select is((select count(*) from public.assets where symbol = 'AAPL'), 1::bigint, 'removing membership preserves asset identity');

-- Revocation takes effect without refreshing stale JWT role metadata.
delete from private.admin_users where user_id = '11111111-1111-4111-8111-111111111111';
set local role authenticated;
select is(private.is_admin(), false, 'revoked admin loses privilege on next statement');
select throws_ok($$insert into public.curated_assets values ('AAPL')$$, '42501', null, 'revoked admin cannot curate');
reset role;
insert into private.admin_users values ('11111111-1111-4111-8111-111111111111');

-- Deletion is performed by a trusted Auth administrator, not a browser SQL role.
delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is((select count(*) from public.watchlist_items where user_id = '22222222-2222-4222-8222-222222222222'), 0::bigint, 'user deletion cascades personal records');
delete from auth.users where id = '11111111-1111-4111-8111-111111111111';
select is((select count(*) from private.admin_users), 0::bigint, 'admin identity deletion cascades role');
select is((select count(*) from public.watchlist_items where user_id = '11111111-1111-4111-8111-111111111111'), 0::bigint, 'admin deletion cascades personal records');
select is((select count(*) from public.curated_assets where symbol = 'TEST'), 1::bigint, 'account deletion preserves shared curation');
insert into auth.users (id, aud, role, email) values ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'admin@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
select is(private.is_admin(), false, 'returning email gets no inherited admin role');
select is((select count(*) from public.watchlist_items), 0::bigint, 'new identity starts with empty watchlist');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(private.is_admin(), false, 'deleted admin old token has no privilege');
select throws_ok($$insert into public.watchlist_items (symbol) values ('MSFT')$$, '23503', null, 'deleted identity cannot write with stale token');
reset role;

select * from finish();
rollback;
