begin;
select plan(16);
-- Disposable transactional fixtures; no hosted subscription or transport is used.
insert into auth.sessions(id,user_id,created_at,updated_at)
  values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222',now(),now());
insert into private.alert_installations(id,user_id,session_id,capability_hash,subscription,endpoint)
  values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    repeat('c',64),'{"endpoint":"https://fcm.googleapis.com/wp/delivery-regression","keys":{}}','https://fcm.googleapis.com/wp/delivery-regression');
insert into public.alert_events(id,user_id,rule_id,revision,symbol,comparison,target,value,unit,observed_at,retrieved_at,source,session,created_at)
  select id,'22222222-2222-4222-8222-222222222222',id,1,'AAPL','above',100,101,'USD',now(),now(),'Yahoo Finance sampled close','regular',created
  from (values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,now()-interval '12 minutes'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,now()-interval '15 minutes')) events(id,created);
insert into private.alert_deliveries(event_id,installation_id)
  select id,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' from public.alert_events
    where id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
create temporary table delivery_claims as select value job from jsonb_array_elements(public.claim_alert_deliveries());
select is((select count(*) from delivery_claims where job->>'installationId'='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),1::bigint,'only the unexpired event is claimed');
select is((select (job->>'expiresAt')::timestamptz from delivery_claims where job->>'eventId'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  now()+interval '3 minutes','transport receives the original event expiry, not a new fifteen-minute window');
select is((select attempts from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),1,'first claim spends one transport attempt');
select public.finish_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  (select (job->>'lease')::uuid from delivery_claims where job->>'eventId'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'retry');
select is((select due_at from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  date_bin(interval '5 minutes',now(),timestamptz '2000-01-01 00:00:00+00')+interval '5 minutes',
  'retry is eligible at the next scheduler boundary despite completion latency');
select ok((select accepted_at is null from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'retry does not claim acceptance');
select public.finish_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',gen_random_uuid(),'accepted');
select ok((select accepted_at is null from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'stale lease cannot mark acceptance');
-- Make the next poll eligible without sleeping or changing the transaction clock.
update private.alert_deliveries set due_at=now() where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
truncate delivery_claims;
insert into delivery_claims select value from jsonb_array_elements(public.claim_alert_deliveries());
select is((select attempts from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),2,'second attempt is available');
select public.finish_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  (select (job->>'lease')::uuid from delivery_claims where job->>'eventId'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'retry');
select is((select due_at from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
  date_bin(interval '5 minutes',now(),timestamptz '2000-01-01 00:00:00+00')+interval '5 minutes','subsequent retries remain aligned');
update private.alert_deliveries set due_at=now() where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
truncate delivery_claims;
insert into delivery_claims select value from jsonb_array_elements(public.claim_alert_deliveries());
select is((select attempts from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),3,'third bounded attempt is available');
select public.finish_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  (select (job->>'lease')::uuid from delivery_claims where job->>'eventId'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'retry');
update private.alert_deliveries set due_at=now() where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
select is((select count(*) from jsonb_array_elements(public.claim_alert_deliveries()) job where job->>'installationId'='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),0::bigint,'three attempts remain the safety bound');
update private.alert_deliveries set attempts=0,lease_until=null where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
truncate delivery_claims;
insert into delivery_claims select value from jsonb_array_elements(public.claim_alert_deliveries());
select public.finish_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  (select (job->>'lease')::uuid from delivery_claims where job->>'eventId'='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'accepted');
select ok((select accepted_at is not null from private.alert_deliveries where event_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),'successful transport persists acceptance');
select is((select count(*) from jsonb_array_elements(public.claim_alert_deliveries()) job where job->>'installationId'='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),0::bigint,'accepted transport is not retried');
select is(public.consume_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',repeat('c',64)),null::jsonb,'longer transport retention never bypasses the event expiry');
delete from auth.sessions where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
select is(public.consume_alert_delivery('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',repeat('c',64)),null::jsonb,'revoked session still blocks display');
set local role anon;
select throws_ok('select public.claim_alert_deliveries()','42501',null,'guests cannot dispatch');
reset role;
set local role authenticated;
select throws_ok($$select public.finish_alert_delivery(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'accepted')$$,'42501',null,'browser accounts cannot acknowledge transport');
reset role;
select * from finish();
rollback;
