begin;
-- Server-only registration. No access to curation, watchlists or role assignments.
grant usage on schema public to service_role;
grant select, insert on public.assets to service_role;
commit;
