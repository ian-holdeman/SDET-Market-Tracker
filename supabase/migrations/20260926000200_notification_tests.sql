-- One bounded diagnostic per installation. Tests never become market events/history.
create table private.alert_notification_tests (
  installation_id uuid primary key references private.alert_installations(id) on delete cascade,
  id uuid not null unique,
  requested_at timestamptz not null default clock_timestamp(),
  consumed_at timestamptz
);
alter table private.alert_notification_tests enable row level security;
revoke all on private.alert_notification_tests from public, anon, authenticated, service_role;

create function public.prepare_alert_notification_test(verified_user uuid, installation_id uuid, capability text, request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare device private.alert_installations; previous private.alert_notification_tests;
begin
  select i.* into device from private.alert_installations i join auth.sessions s on s.id=i.session_id and s.user_id=i.user_id
    where i.id=installation_id and i.user_id=verified_user and i.capability_hash=capability
      and (s.not_after is null or s.not_after>now()) for update of i;
  if not found then return jsonb_build_object('status','unavailable'); end if;
  select * into previous from private.alert_notification_tests t where t.installation_id=device.id;
  if found then
    if previous.id=request_id then return jsonb_build_object('status','duplicate'); end if;
    if previous.requested_at>clock_timestamp()-interval '30 seconds' then return jsonb_build_object('status','limited'); end if;
  end if;
  insert into private.alert_notification_tests(installation_id,id) values(device.id,request_id)
    on conflict on constraint alert_notification_tests_pkey do update set id=excluded.id,requested_at=clock_timestamp(),consumed_at=null;
  return jsonb_build_object('status','ready','eventId',request_id,'installationId',device.id,'subscription',device.subscription);
end;
$$;

-- Both real events and test hints pass through the same display-time authorization.
create function public.consume_alert_notification(event_key uuid, installation_id uuid, capability text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  result:=public.consume_alert_delivery(event_key,installation_id,capability);
  if result is not null then return result; end if;
  update private.alert_notification_tests t set consumed_at=clock_timestamp()
    from private.alert_installations i,auth.sessions s
    where t.id=event_key and t.installation_id=consume_alert_notification.installation_id
      and i.id=t.installation_id and i.capability_hash=capability
      and s.id=i.session_id and s.user_id=i.user_id and (s.not_after is null or s.not_after>now())
      and t.requested_at>now()-interval '2 minutes' and t.consumed_at is null
    returning jsonb_build_object('id',t.id,'user_id',i.user_id,'kind','test') into result;
  return result;
end;
$$;
revoke all on function public.prepare_alert_notification_test(uuid,uuid,text,uuid),
  public.consume_alert_notification(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.prepare_alert_notification_test(uuid,uuid,text,uuid),
  public.consume_alert_notification(uuid,uuid,text) to service_role;
