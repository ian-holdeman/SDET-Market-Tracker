-- Cost admission is private, shared across revisions, and independent of editable
-- profile metadata. Existing records and owner-only RLS remain unchanged.
create table private.usage_budgets (
  scope text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);
create index usage_budgets_expiry on private.usage_budgets(expires_at);
alter table private.usage_budgets enable row level security;
revoke all on private.usage_budgets from public, anon, authenticated, service_role;

create function private.claim_usage(kind text, verified_user uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare keys text[]; ceilings integer[]; seconds integer[]; owner_ids uuid[];
  instant timestamptz; used integer; missing integer := 0; trusted_admin boolean := false;
begin
  if kind <> 'provider' then
    if verified_user is null or not exists(select 1 from auth.users where id=verified_user) then return false; end if;
    trusted_admin := exists(select 1 from private.admin_users where user_id=verified_user);
  end if;
  if kind='provider' then
    keys := array['provider-minute','provider-day']; ceilings := array[600,20000]; seconds := array[60,86400]; owner_ids := array[null::uuid,null::uuid];
  elsif kind='test' then
    keys := array['test-site-day']; ceilings := array[200]; seconds := array[86400]; owner_ids := array[null::uuid];
    if not trusted_admin then
      keys := keys || array['test-hour:'||verified_user::text,'test-day:'||verified_user::text];
      ceilings := ceilings || array[6,20]; seconds := seconds || array[3600,86400]; owner_ids := owner_ids || array[verified_user,verified_user];
    end if;
  elsif kind='subscription' then
    if trusted_admin then return true; end if;
    keys := array['subscription-hour:'||verified_user::text]; ceilings := array[10]; seconds := array[3600]; owner_ids := array[verified_user];
  else return false;
  end if;
  -- Constant lock/key namespace; callers cannot create arbitrary quota keys.
  perform pg_catalog.pg_advisory_xact_lock(824771030);
  instant := clock_timestamp();
  delete from private.usage_budgets where expires_at <= instant;
  for i in 1..array_length(keys,1) loop
    select attempts into used from private.usage_budgets where scope=keys[i];
    if not found then missing := missing + 1;
    elsif used >= ceilings[i] then return false;
    end if;
  end loop;
  if (select count(*) from private.usage_budgets) + missing > 5000 then return false; end if;
  for i in 1..array_length(keys,1) loop
    insert into private.usage_budgets(scope,user_id,expires_at,attempts)
      values(keys[i],owner_ids[i],instant + seconds[i] * interval '1 second',1)
      on conflict(scope) do update set attempts=private.usage_budgets.attempts+1;
  end loop;
  return true;
end;
$$;
revoke all on function private.claim_usage(text,uuid) from public, anon, authenticated, service_role;

create function public.claim_market_budget() returns boolean
language sql security definer set search_path = '' as $$ select private.claim_usage('provider'); $$;
revoke all on function public.claim_market_budget() from public, anon, authenticated;
grant execute on function public.claim_market_budget() to service_role;

-- Keep the tested transition implementation private, with one authoritative
-- public entry point. Service callers cannot bypass the new wrapper via REST.
alter function public.save_alert_rule(uuid,uuid,text,text,double precision,text,integer) set schema private;
revoke all on function private.save_alert_rule(uuid,uuid,text,text,double precision,text,integer) from public, anon, authenticated, service_role;
create function public.save_alert_rule(verified_user uuid, rule_id uuid, asset_symbol text, direction text,
  target_value double precision, quote_unit text, expected_revision integer)
returns public.alert_rules language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize even creation on different assets/accounts; count limits cannot race.
  perform pg_catalog.pg_advisory_xact_lock(824771031);
  if not exists(select 1 from public.alert_rules where id=rule_id)
    and not exists(select 1 from private.admin_users where user_id=verified_user) then
    if (select count(*) from public.alert_rules where user_id=verified_user) >= 40 then
      raise exception using errcode='P4290', message='Member alert limit reached. Remove an alert before adding another.';
    end if;
    if (select count(*) from public.alert_rules r where not exists(select 1 from private.admin_users a where a.user_id=r.user_id)) >= 1000 then
      raise exception using errcode='P4290', message='Shared member alert capacity reached. Existing alerts remain available.';
    end if;
  end if;
  return private.save_alert_rule(verified_user,rule_id,asset_symbol,direction,target_value,quote_unit,expected_revision);
end;
$$;
revoke all on function public.save_alert_rule(uuid,uuid,text,text,double precision,text,integer) from public, anon, authenticated;
grant execute on function public.save_alert_rule(uuid,uuid,text,text,double precision,text,integer) to service_role;

alter function public.set_alert_installation(uuid,uuid,uuid,text,jsonb) set schema private;
revoke all on function private.set_alert_installation(uuid,uuid,uuid,text,jsonb) from public, anon, authenticated, service_role;
create function public.set_alert_installation(verified_user uuid, verified_session uuid, installation_id uuid, capability text, push_subscription jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(verified_user::text, 1));
  -- An exact retry must not revoke a queued notification or spend another claim.
  if exists(select 1 from private.alert_installations i join auth.sessions s on s.id=i.session_id and s.user_id=i.user_id
    where i.id=installation_id and i.user_id=verified_user and i.session_id=verified_session
      and i.capability_hash=capability and i.subscription=push_subscription and (s.not_after is null or s.not_after>now())) then return true; end if;
  -- Invalid ownership/session attempts are still rejected by the original function;
  -- any exception rolls back both the claim and the installation change.
  if not private.claim_usage('subscription',verified_user) then
    raise exception using errcode='P4290', message='Notification changes are temporarily limited. Retry later.';
  end if;
  return private.set_alert_installation(verified_user,verified_session,installation_id,capability,push_subscription);
end;
$$;
revoke all on function public.set_alert_installation(uuid,uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.set_alert_installation(uuid,uuid,uuid,text,jsonb) to service_role;

alter function public.prepare_alert_notification_test(uuid,uuid,text,uuid) set schema private;
revoke all on function private.prepare_alert_notification_test(uuid,uuid,text,uuid) from public, anon, authenticated, service_role;
create function public.prepare_alert_notification_test(verified_user uuid, installation_id uuid, capability text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  -- Match subscription replacement's budget-before-installation lock order.
  -- Otherwise replacement can hold the budget lock while a test holds its row.
  perform pg_catalog.pg_advisory_xact_lock(824771030);
  -- Original function locks the installation, verifies live ownership, deduplicates,
  -- and applies the 30-second cooldown before any owner/site budget is consumed.
  result := private.prepare_alert_notification_test(verified_user,installation_id,capability,request_id);
  if result->>'status'='ready' and not private.claim_usage('test',verified_user) then
    raise exception using errcode='P4290', message='Test budget exhausted';
  end if;
  return result;
exception when sqlstate 'P4290' then
  -- Roll back preparation too, so a denied test never becomes a duplicate success.
  return jsonb_build_object('status','budget_limited');
end;
$$;
revoke all on function public.prepare_alert_notification_test(uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.prepare_alert_notification_test(uuid,uuid,text,uuid) to service_role;
