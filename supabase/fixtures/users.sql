-- LOCAL ONLY. Included by config.toml, never by a migration.
-- No passwords, provider identities, tokens, or login credentials are created.
-- These rows support SQL authorization tests, not browser login.
insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'admin@example.invalid', '{}', '{}'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'alice@example.invalid', '{}', '{}'),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'bob@example.invalid', '{}', '{}');

insert into private.admin_users (user_id) values ('11111111-1111-4111-8111-111111111111');
insert into public.watchlist_items (user_id, symbol) values
  ('11111111-1111-4111-8111-111111111111', 'AAPL'),
  ('22222222-2222-4222-8222-222222222222', 'AAPL'),
  ('33333333-3333-4333-8333-333333333333', 'MSFT');

