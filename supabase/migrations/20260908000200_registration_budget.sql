-- Shared budget across instances/revisions. Only the trusted server may claim
-- attempts, after Auth getUser verification; no browser can choose another UUID.
create table private.asset_registration_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  attempts integer not null check (attempts between 1 and 10)
);
alter table private.asset_registration_limits enable row level security;
revoke all on private.asset_registration_limits from public, anon, authenticated, service_role;

create function public.claim_asset_registration(verified_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_time_value timestamptz;
  claimed boolean := false;
begin
  -- Serialize this small bounded table, including new-user capacity checks.
  perform pg_catalog.pg_advisory_xact_lock(824771029);
  current_time_value := pg_catalog.clock_timestamp();
  delete from private.asset_registration_limits where expires_at <= current_time_value;
  if not exists (select 1 from auth.users where id = verified_user) then return false; end if;
  if not exists (select 1 from private.asset_registration_limits where user_id = verified_user)
     and (select count(*) from private.asset_registration_limits) >= 1000 then return false; end if;
  insert into private.asset_registration_limits (user_id, expires_at, attempts)
  values (verified_user, current_time_value + interval '1 minute', 1)
  on conflict (user_id) do update
    set attempts = private.asset_registration_limits.attempts + 1
    where private.asset_registration_limits.attempts < 10
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;
revoke all on function public.claim_asset_registration(uuid) from public, anon, authenticated;
grant execute on function public.claim_asset_registration(uuid) to service_role;
