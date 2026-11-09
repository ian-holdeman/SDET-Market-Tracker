-- Match price-push transport retention to the existing fifteen-minute display
-- window, and make transient retries eligible at the next five-minute Cron tick.
create or replace function public.claim_alert_deliveries() returns jsonb
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
    'subscription',i.subscription,'expiresAt',e.created_at+interval '15 minutes')), '[]'::jsonb)
    into jobs from claimed c join private.alert_installations i on i.id=c.installation_id
      join public.alert_events e on e.id=c.event_id;
  return jobs;
end;
$$;

create or replace function public.finish_alert_delivery(event_key uuid, installation_id uuid, claim uuid, outcome text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if outcome='gone' then
    delete from private.alert_installations i where i.id=installation_id and exists(select 1 from private.alert_deliveries d
      where d.event_id=event_key and d.installation_id=i.id and d.lease=claim);
  else
    update private.alert_deliveries d set accepted_at=case when outcome='accepted' then clock_timestamp() else null end,
      lease_until=null,due_at=date_bin(interval '5 minutes',now(),timestamptz '2000-01-01 00:00:00+00')+interval '5 minutes'
      where d.event_id=event_key and d.installation_id=finish_alert_delivery.installation_id and d.lease=claim;
  end if;
end;
$$;
-- CREATE OR REPLACE retains ACLs; make the private execution boundary explicit.
revoke all on function public.claim_alert_deliveries(),public.finish_alert_delivery(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_alert_deliveries(),public.finish_alert_delivery(uuid,uuid,uuid,text) to service_role;
