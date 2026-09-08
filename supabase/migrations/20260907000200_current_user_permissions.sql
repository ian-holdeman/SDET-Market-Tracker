begin;
-- Presentation-only lookup; mutations still use RLS. No caller-supplied UUID.
create function public.current_user_is_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.is_admin(); $$;
revoke all on function public.current_user_is_admin() from public, anon, authenticated, service_role;
grant execute on function public.current_user_is_admin() to authenticated;
commit;
