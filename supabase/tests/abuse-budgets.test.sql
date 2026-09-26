begin;
set local search_path = public, extensions;
select no_plan();
-- Transactional fixtures; retained local accounts and quota state are restored.
delete from private.usage_budgets;
set local role anon;
select throws_ok('select public.claim_market_budget()', '42501', null, 'guest cannot claim site budget');
reset role;
set local role authenticated;
select throws_ok('select public.claim_market_budget()', '42501', null, 'member cannot claim site budget');
select throws_ok('select * from private.usage_budgets', '42501', null, 'quota records are private');
reset role;
set local role service_role;
select throws_ok('select * from private.usage_budgets', '42501', null, 'service role cannot edit quota counters');
select throws_ok($$select private.save_alert_rule(null,null,null,null,null,null,null)$$, '42501', null, 'private transition cannot bypass the public quota wrapper');
select ok(bool_and(public.claim_market_budget()), 'first 600 shared provider claims admitted') from generate_series(1,600);
select is(public.claim_market_budget(),false,'601st provider claim denied');
reset role;
select is((select attempts from private.usage_budgets where scope='provider-day'),600,'denial does not partially spend daily quota');
update private.usage_budgets set expires_at=now()-interval '1 second' where scope='provider-minute';
select ok(public.claim_market_budget(),'expired minute recovers');
update private.usage_budgets set attempts=20000 where scope='provider-day';
select is(public.claim_market_budget(),false,'daily cap cannot be bypassed by minute expiry');
select is((select attempts from private.usage_budgets where scope='provider-minute'),1,'daily denial does not partially spend minute quota');
select is(private.claim_usage('unknown'),false,'no caller-selected quota namespace');
update private.usage_budgets set expires_at=now()-interval '1 second';
select ok(public.claim_market_budget(),'expired counters recover without unbounded retention');
select is((select count(*) from private.usage_budgets),2::bigint,'expired counters are removed');

-- Simulate grandfathered pre-cap records; new limits must not delete them.
insert into public.alert_rules(id,user_id,symbol,comparison,target,unit)
  select gen_random_uuid(),'22222222-2222-4222-8222-222222222222','AAPL','above',100,'USD'
  from generate_series(1,1000);
select throws_ok($$select public.save_alert_rule('33333333-3333-4333-8333-333333333333',gen_random_uuid(),'MSFT','above',1,'USD',null)$$,
  'P4290','Shared member alert capacity reached. Existing alerts remain available.','site member cap cannot be bypassed with another account');
select lives_ok($$select public.save_alert_rule('11111111-1111-4111-8111-111111111111',gen_random_uuid(),'MSFT','above',1,'USD',null)$$,
  'trusted admin is exempt from member count caps');
select is((select count(*) from public.alert_rules where user_id='22222222-2222-4222-8222-222222222222'),1000::bigint,'existing records survive');

select ok(private.claim_usage('test','22222222-2222-4222-8222-222222222222'),'valid owner gets test budget');
update private.usage_budgets set attempts=200 where scope='test-site-day';
select is(private.claim_usage('test','11111111-1111-4111-8111-111111111111'),false,'shared delivery safety applies even to an admin');
delete from auth.users where id='22222222-2222-4222-8222-222222222222';
select is((select count(*) from private.usage_budgets where user_id='22222222-2222-4222-8222-222222222222'),0::bigint,'account deletion removes its budget records');
select * from finish();
rollback;
