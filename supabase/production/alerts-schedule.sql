-- Owner-applied production setup, after alert migrations and Vault provisioning.
-- Not a seed: this never creates fixture identities or changes shared curation.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function private.invoke_alert_scheduler()
returns bigint language plpgsql security definer set search_path = '' as $$
declare credential text; request_id bigint;
begin
  select decrypted_secret into strict credential from vault.decrypted_secrets
    where name = 'sdet_alert_scheduler';
  if length(credential) < 32 then raise exception 'Alert scheduler credential unavailable'; end if;
  select net.http_post(
    url := 'https://sdet-market-tracker-855618435389.us-west1.run.app/api/alerts/evaluate',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || credential),
    body := '{}'::jsonb, timeout_milliseconds := 28000
  ) into request_id;
  delete from cron.job_run_details where jobid in
    (select jobid from cron.job where jobname = 'sdet-price-alerts')
    and end_time < now() - interval '7 days';
  return request_id;
end;
$$;
revoke all on function private.invoke_alert_scheduler() from public, anon, authenticated, service_role;

-- Install paused; activate only after verifying the matching Cloud Run revision.
select cron.schedule('sdet-price-alerts','*/5 * * * *','select private.invoke_alert_scheduler()');
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'sdet-price-alerts';
commit;
