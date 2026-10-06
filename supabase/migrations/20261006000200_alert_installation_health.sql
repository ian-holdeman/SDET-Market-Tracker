-- A capability-scoped read lets a reopened client distinguish a revoked server
-- installation from browser-local subscription presence. It never renews a session.
create function public.alert_installation_available(installation_id uuid, capability text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.alert_installations i
      join auth.sessions s on s.id=i.session_id and s.user_id=i.user_id
    where i.id=installation_id and i.capability_hash=capability
      and (s.not_after is null or s.not_after>now())
  );
$$;
revoke all on function public.alert_installation_available(uuid,text) from public, anon, authenticated;
grant execute on function public.alert_installation_available(uuid,text) to service_role;
