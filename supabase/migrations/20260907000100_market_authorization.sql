begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

-- No duplicated email/name/profile data. Identity belongs to Supabase Auth.
create table public.assets (
  symbol text primary key,
  constraint canonical_symbol check (
    char_length(symbol) between 1 and 32 and symbol ~ '^[A-Z0-9^][A-Z0-9.^=-]*$'
  )
);

create table public.curated_assets (
  symbol text primary key references public.assets(symbol) on delete restrict
);

create table public.watchlist_items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symbol text not null references public.assets(symbol) on delete restrict,
  primary key (user_id, symbol)
);
create index watchlist_items_symbol_idx on public.watchlist_items(symbol);

-- Absence means ordinary user. Only a trusted database owner provisions admins.
create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.assets enable row level security;
alter table public.curated_assets enable row level security;
alter table public.watchlist_items enable row level security;
alter table private.admin_users enable row level security;

-- Supabase defaults can grant more than a new table needs: revoke explicitly.
revoke all on public.assets, public.curated_assets, public.watchlist_items
  from public, anon, authenticated, service_role;
revoke all on private.admin_users from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;
grant select on public.assets, public.curated_assets to anon, authenticated;
grant insert on public.assets to authenticated;
grant insert, delete on public.curated_assets to authenticated;
grant select, insert, delete on public.watchlist_items to authenticated;

-- Non-exposed helper. Fixed search_path and fully qualified names avoid hijacking.
-- No user-supplied UUID: callers can only ask whether THEY are an admin.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public, anon, authenticated, service_role;
grant execute on function private.is_admin() to authenticated;

create policy assets_public_read on public.assets for select to anon, authenticated using (true);
create policy assets_admin_insert on public.assets for insert to authenticated
  with check ((select private.is_admin()));
create policy curated_public_read on public.curated_assets for select to anon, authenticated using (true);
create policy curated_admin_insert on public.curated_assets for insert to authenticated
  with check ((select private.is_admin()));
create policy curated_admin_delete on public.curated_assets for delete to authenticated
  using ((select private.is_admin()));

create policy watchlist_owner_read on public.watchlist_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy watchlist_owner_insert on public.watchlist_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy watchlist_owner_delete on public.watchlist_items for delete to authenticated
  using (user_id = (select auth.uid()));

-- No UPDATE, TRUNCATE, catalog DELETE, role-table policy, or role-management RPC.
commit;
