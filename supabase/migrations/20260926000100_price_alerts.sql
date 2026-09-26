-- Owned rules/history are readable through RLS. All state transitions and delivery
-- material are confined to narrowly scoped, service-only functions.
create table public.alert_rules (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null references public.assets(symbol),
  comparison text not null check (comparison in ('above','below')),
  target double precision not null check (target between -1e15 and 1e15),
  unit text not null check (unit ~ '^([A-Za-z]{3}|%)$'),
  revision integer not null default 1,
  armed boolean not null default true,
  last_observed timestamptz,
  created_at timestamptz not null default now()
);
create index alert_rules_owner_asset on public.alert_rules(user_id, symbol);
create index alert_rules_symbol on public.alert_rules(symbol);
alter table public.alert_rules enable row level security;
revoke all on public.alert_rules from public, anon, authenticated, service_role;
grant select, delete on public.alert_rules to authenticated;
create policy own_alert_rules on public.alert_rules for select to authenticated using (user_id = (select auth.uid()));
create policy delete_own_alert_rules on public.alert_rules for delete to authenticated using (user_id = (select auth.uid()));

create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid not null, -- Snapshot history survives rule deletion.
  revision integer not null,
  symbol text not null,
  comparison text not null,
  target double precision not null,
  value double precision not null,
  unit text not null,
  observed_at timestamptz not null,
  retrieved_at timestamptz not null,
  source text not null,
  session text not null,
  created_at timestamptz not null default clock_timestamp(),
  read_at timestamptz,
  unique(rule_id, revision, observed_at)
);
create index alert_events_owner_time on public.alert_events(user_id, created_at desc, id desc);
create index alert_events_expiry on public.alert_events(created_at);
alter table public.alert_events enable row level security;
revoke all on public.alert_events from public, anon, authenticated, service_role;
grant select on public.alert_events to authenticated;
create policy own_recent_alert_events on public.alert_events for select to authenticated
  using (user_id = (select auth.uid()) and created_at > now() - interval '30 days');

create table private.alert_assets (
  symbol text primary key references public.assets(symbol),
  due_at timestamptz not null default now(),
  lease uuid,
  lease_until timestamptz,
  checked_at timestamptz,
  available boolean not null default false
);
create table private.alert_installations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  capability_hash text not null unique,
  subscription jsonb not null,
  endpoint text not null unique,
  enabled_at timestamptz not null default clock_timestamp()
);
create index alert_assets_due on private.alert_assets(due_at);
create index alert_installations_owner on private.alert_installations(user_id);
create table private.alert_deliveries (
  event_id uuid not null references public.alert_events(id) on delete cascade,
  installation_id uuid not null references private.alert_installations(id) on delete cascade,
  attempts integer not null default 0,
  due_at timestamptz not null default now(),
  lease uuid,
  lease_until timestamptz,
  accepted_at timestamptz,
  claimed_at timestamptz,
  primary key(event_id, installation_id)
);
create index alert_deliveries_due on private.alert_deliveries(due_at) where accepted_at is null;
alter table private.alert_assets enable row level security;
alter table private.alert_installations enable row level security;
alter table private.alert_deliveries enable row level security;
revoke all on private.alert_assets, private.alert_installations, private.alert_deliveries from public, anon, authenticated, service_role;

create function public.save_alert_rule(verified_user uuid, rule_id uuid, asset_symbol text, direction text,
  target_value double precision, quote_unit text, expected_revision integer)
returns public.alert_rules language plpgsql security definer set search_path = '' as $$
declare r public.alert_rules;
begin
  -- Serialize per owner/asset, including the empty-set creation race.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(verified_user::text || ':' || asset_symbol, 0));
  select * into r from public.alert_rules where id = rule_id for update;
  if found then
    if r.user_id <> verified_user or r.symbol <> asset_symbol then raise exception 'This alert is unavailable.'; end if;
    if r.comparison = direction and r.target = target_value and r.unit = quote_unit then return r; end if;
    if expected_revision is null or expected_revision <> r.revision then raise exception 'This alert changed. Reload before editing.'; end if;
    update public.alert_rules set comparison = direction, target = target_value, unit = quote_unit,
      revision = revision + 1, armed = true where id = rule_id returning * into r;
    -- Keep last_observed as a floor: an edited generation needs new evidence.
  else
    if expected_revision is not null then raise exception 'This alert was deleted. Reload before editing.'; end if;
    if (select count(*) from public.alert_rules where user_id = verified_user and symbol = asset_symbol) >= 4 then
      raise exception 'An asset can have up to four alerts.';
    end if;
    insert into public.alert_rules(id,user_id,symbol,comparison,target,unit)
      values(rule_id,verified_user,asset_symbol,direction,target_value,quote_unit) returning * into r;
  end if;
  insert into private.alert_assets(symbol) values(asset_symbol) on conflict do nothing;
  return r;
end;
$$;

create function public.read_alert_event(event_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.alert_events set read_at = coalesce(read_at, clock_timestamp())
    where id = event_id and user_id = auth.uid() and created_at > now() - interval '30 days';
  return found;
end;
$$;

create function public.claim_alert_work() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare jobs jsonb;
begin
  -- Time retention has no event-count cap; rule memory is never expired here.
  delete from public.alert_events where id in (select id from public.alert_events
    where created_at <= now() - interval '30 days' order by created_at limit 1000);
  delete from private.alert_installations i where not exists
    (select 1 from auth.sessions s where s.id = i.session_id and s.user_id = i.user_id and (s.not_after is null or s.not_after > now()));
  delete from private.alert_deliveries d using public.alert_events e
    where d.event_id = e.id and e.created_at < now() - interval '15 minutes';
  -- Retain the asset work row with its shared identity. Deleting it concurrently
  -- with the first new rule could lose that rule's scheduling registration.
  with due as (
    select symbol from private.alert_assets a where due_at <= now() and (lease_until is null or lease_until < now())
      and exists (select 1 from public.alert_rules r where r.symbol=a.symbol)
      order by due_at, symbol for update skip locked limit 16
  ), claimed as (
    update private.alert_assets a set lease = gen_random_uuid(), lease_until = now() + interval '45 seconds'
      from due where a.symbol = due.symbol returning a.symbol, a.lease
  ) select coalesce(jsonb_agg(jsonb_build_object('symbol', c.symbol, 'lease', c.lease,
    'rules', (select jsonb_agg(jsonb_build_object('id',r.id,'revision',r.revision)) from public.alert_rules r where r.symbol=c.symbol))), '[]'::jsonb)
    into jobs from claimed c;
  return jobs;
end;
$$;

create function public.finish_alert_work(results jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare job jsonb; obs jsonb; expected jsonb; r public.alert_rules; qualifies boolean; event_key uuid;
  observed timestamptz; retrieved timestamptz; price double precision; made integer := 0;
begin
  if jsonb_typeof(results) <> 'array' or jsonb_array_length(results) > 16 then raise exception 'Invalid alert batch'; end if;
  for job in select value from jsonb_array_elements(results) loop
    perform 1 from private.alert_assets where symbol = job->>'symbol' and lease = (job->>'lease')::uuid
      and lease_until > clock_timestamp() for update;
    if not found then continue; end if;
    obs := job->'observation';
    update private.alert_assets set checked_at = clock_timestamp(), available = false,
      due_at = date_bin(interval '5 minutes', clock_timestamp(), timestamptz '2000-01-01 00:00:00+00') + interval '5 minutes',
      lease_until = null where symbol = job->>'symbol';
    if obs is null or obs = 'null'::jsonb then continue; end if;
    observed := (obs->>'observedAt')::timestamptz; retrieved := (obs->>'retrievedAt')::timestamptz;
    price := (obs->>'value')::double precision;
    if observed is null or retrieved is null or price is null or not (price between -1e15 and 1e15)
      or observed > retrieved or observed < clock_timestamp() - interval '15 minutes'
      or retrieved > clock_timestamp() + interval '1 minute' or retrieved < observed
      or obs->>'symbol' is distinct from job->>'symbol'
      or obs->>'source' is distinct from 'Yahoo Finance sampled close'
      or coalesce(obs->>'session','') not in ('pre','regular','post','continuous') then continue; end if;
    update private.alert_assets set available = true where symbol = job->>'symbol';
    for expected in select value from jsonb_array_elements(job->'rules') loop
      select * into r from public.alert_rules where id = (expected->>'id')::uuid
        and symbol = job->>'symbol' and revision = (expected->>'revision')::integer for update;
      if not found or r.unit <> obs->>'unit' or (r.last_observed is not null and observed <= r.last_observed) then continue; end if;
      qualifies := case r.comparison when 'above' then price >= r.target else price <= r.target end;
      update public.alert_rules set last_observed = observed, armed = not qualifies where id = r.id;
      if qualifies and r.armed then
        insert into public.alert_events(user_id,rule_id,revision,symbol,comparison,target,value,unit,observed_at,retrieved_at,source,session)
          values(r.user_id,r.id,r.revision,r.symbol,r.comparison,r.target,price,r.unit,observed,retrieved,obs->>'source',obs->>'session')
          returning id into event_key;
        insert into private.alert_deliveries(event_id,installation_id)
          select event_key,i.id from private.alert_installations i join auth.sessions s on s.id=i.session_id and s.user_id=i.user_id
            where i.user_id=r.user_id and (s.not_after is null or s.not_after > now())
              and i.enabled_at <= (select created_at from public.alert_events where id=event_key);
        made := made + 1;
      end if;
    end loop;
  end loop;
  return made;
end;
$$;

create function public.alert_coverage(asset_symbol text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('checkedAt', a.checked_at, 'available', a.available)
    from private.alert_assets a where a.symbol = asset_symbol
    and exists(select 1 from public.alert_rules r where r.symbol=a.symbol and r.user_id=auth.uid());
$$;

create function public.set_alert_installation(verified_user uuid, verified_session uuid, installation_id uuid,
  capability text, push_subscription jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from auth.sessions where id=verified_session and user_id=verified_user and (not_after is null or not_after > now())) then raise exception 'Session expired.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(verified_user::text, 1));
  if exists(select 1 from private.alert_installations where id=installation_id and user_id<>verified_user) then raise exception 'Revoke the previous installation first.'; end if;
  if not exists(select 1 from private.alert_installations where id=installation_id)
    and (select count(*) from private.alert_installations where user_id=verified_user) >= 10 then raise exception 'Up to ten notification installations are supported.'; end if;
  -- Replacing capability/subscription cancels queued work and does not backfill.
  delete from private.alert_installations where id=installation_id;
  insert into private.alert_installations(id,user_id,session_id,capability_hash,subscription,endpoint)
    values(installation_id,verified_user,verified_session,capability,push_subscription,push_subscription->>'endpoint');
  return true;
end;
$$;

create function public.revoke_alert_installation(installation_id uuid, capability text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.alert_installations where id=installation_id and capability_hash=capability;
  return true; -- Do not reveal whether an unrelated identifier exists.
end;
$$;

create function public.claim_alert_deliveries() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare jobs jsonb;
begin
  with due as (
    select d.event_id,d.installation_id from private.alert_deliveries d
      join public.alert_events e on e.id=d.event_id join private.alert_installations i on i.id=d.installation_id
      join auth.sessions s on s.id=i.session_id and s.user_id=i.user_id
      where d.accepted_at is null and d.attempts<3 and d.due_at<=now()
        and (d.lease_until is null or d.lease_until<now()) and e.created_at>now()-interval '15 minutes'
        and (s.not_after is null or s.not_after > now())
      order by d.due_at for update of d skip locked limit 16
  ), claimed as (
    update private.alert_deliveries d set attempts=d.attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '30 seconds'
      from due where d.event_id=due.event_id and d.installation_id=due.installation_id returning d.*
  ) select coalesce(jsonb_agg(jsonb_build_object('eventId',c.event_id,'installationId',c.installation_id,'lease',c.lease,
    'subscription',i.subscription)), '[]'::jsonb) into jobs from claimed c join private.alert_installations i on i.id=c.installation_id;
  return jobs;
end;
$$;

create function public.finish_alert_delivery(event_key uuid, installation_id uuid, claim uuid, outcome text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if outcome='gone' then
    delete from private.alert_installations i where i.id=installation_id and exists(select 1 from private.alert_deliveries d
      where d.event_id=event_key and d.installation_id=i.id and d.lease=claim);
  else
    update private.alert_deliveries d set accepted_at=case when outcome='accepted' then clock_timestamp() else null end,
      lease_until=null,due_at=now()+interval '5 minutes'
      where d.event_id=event_key and d.installation_id=finish_alert_delivery.installation_id and d.lease=claim;
  end if;
end;
$$;

-- The push contains only opaque IDs. Recheck revocation and the Auth session at
-- display time; claim once so transport retries cannot display twice per device.
create function public.consume_alert_delivery(event_key uuid, installation_id uuid, capability text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  update private.alert_deliveries d set claimed_at=clock_timestamp()
    from private.alert_installations i, public.alert_events e, auth.sessions s
    where d.event_id=event_key and d.installation_id=consume_alert_delivery.installation_id
      and i.id=d.installation_id and i.capability_hash=capability and s.id=i.session_id and s.user_id=i.user_id
      and (s.not_after is null or s.not_after > now())
      and e.id=d.event_id and e.user_id=i.user_id and e.created_at>now()-interval '15 minutes' and d.claimed_at is null
    returning to_jsonb(e) into result;
  return result;
end;
$$;

-- Default PUBLIC EXECUTE must be removed from every new security-definer function.
revoke all on function public.save_alert_rule(uuid,uuid,text,text,double precision,text,integer),
  public.claim_alert_work(), public.finish_alert_work(jsonb), public.set_alert_installation(uuid,uuid,uuid,text,jsonb),
  public.revoke_alert_installation(uuid,text), public.claim_alert_deliveries(), public.finish_alert_delivery(uuid,uuid,uuid,text),
  public.consume_alert_delivery(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.save_alert_rule(uuid,uuid,text,text,double precision,text,integer),
  public.claim_alert_work(), public.finish_alert_work(jsonb), public.set_alert_installation(uuid,uuid,uuid,text,jsonb),
  public.revoke_alert_installation(uuid,text), public.claim_alert_deliveries(), public.finish_alert_delivery(uuid,uuid,uuid,text),
  public.consume_alert_delivery(uuid,uuid,text) to service_role;
revoke all on function public.read_alert_event(uuid), public.alert_coverage(text) from public, anon, service_role;
grant execute on function public.read_alert_event(uuid), public.alert_coverage(text) to authenticated;
