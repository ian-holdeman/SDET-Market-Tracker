-- Cooldown survives history clearing, rule recreation, installation changes and restarts.
create table private.alert_asset_cooldowns (
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null references public.assets(symbol),
  admitted_at timestamptz not null,
  primary key(user_id,symbol)
);
alter table private.alert_asset_cooldowns enable row level security;
revoke all on private.alert_asset_cooldowns from public, anon, authenticated, service_role;
-- Carry existing admitted history across the upgrade; deployment must not reset allowance.
insert into private.alert_asset_cooldowns(user_id,symbol,admitted_at)
  select user_id,symbol,max(created_at) from public.alert_events
  where created_at>clock_timestamp()-interval '60 minutes' group by user_id,symbol;

-- Only the trusted evaluator supplies clock_timestamp(). The private clock argument
-- permits exact boundary tests without exposing a caller-controlled admission clock.
create function private.admit_alert_asset(owner_id uuid, asset_symbol text, instant timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into private.alert_asset_cooldowns(user_id,symbol,admitted_at)
    values(owner_id,asset_symbol,instant)
    on conflict(user_id,symbol) do update set admitted_at=excluded.admitted_at
      where private.alert_asset_cooldowns.admitted_at <= instant - interval '60 minutes';
  return found;
end;
$$;
revoke all on function private.admit_alert_asset(uuid,text,timestamptz) from public, anon, authenticated, service_role;

create or replace function public.finish_alert_work(results jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare job jsonb; obs jsonb; expected jsonb; r public.alert_rules; qualifies boolean; event_key uuid;
  observed timestamptz; retrieved timestamptz; price double precision; made integer := 0;
begin
  -- Same outer order as quota/save wrappers; no budget or installation locks follow.
  perform pg_catalog.pg_advisory_xact_lock(824771031);
  if jsonb_typeof(results) <> 'array' or jsonb_array_length(results) > 16 then raise exception 'Invalid alert batch'; end if;
  for job in select value from jsonb_array_elements(results) order by value->>'symbol' loop
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
    -- UUID ascending breaks simultaneous-rule ties deterministically.
    for expected in select value from jsonb_array_elements(job->'rules') order by value->>'id' loop
      select * into r from public.alert_rules where id = (expected->>'id')::uuid
        and symbol = job->>'symbol' and revision = (expected->>'revision')::integer for update;
      if not found or r.unit <> obs->>'unit' or (r.last_observed is not null and observed <= r.last_observed) then continue; end if;
      qualifies := case r.comparison when 'above' then price >= r.target else price <= r.target end;
      update public.alert_rules set last_observed = observed, armed = not qualifies where id = r.id;
      if qualifies and r.armed and private.admit_alert_asset(r.user_id,r.symbol,clock_timestamp()) then
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

-- Evaluation and bulk operations share an atomic boundary; later events stay unread/visible.
create function public.mutate_alert_history(operation text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in to manage alert history.'; end if;
  if operation not in ('read','clear') or operation is null then raise exception 'Invalid history operation.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(824771031);
  if operation='read' then
    update public.alert_events set read_at=clock_timestamp()
      where user_id=owner_id and read_at is null and created_at>now()-interval '30 days';
  else
    -- Cascading outbox deletion cancels pending consumption. A previously consumed
    -- payload can still finish display; OS notifications need not be withdrawn.
    delete from public.alert_events where user_id=owner_id;
  end if;
  return true;
end;
$$;
revoke all on function public.mutate_alert_history(text) from public, anon, service_role;
grant execute on function public.mutate_alert_history(text) to authenticated;
