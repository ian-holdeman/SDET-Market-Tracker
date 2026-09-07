# Local database foundation

This is separate from the running Firebase application. No frontend reads or writes
these tables yet. No hosted project is linked. PostgreSQL 17 and the exact Supabase
CLI version in package.json provide the local baseline.

## Setup and reset

Windows setup on 2026-09-07: Docker Desktop 4.90.0 and WSL 2.7.13.0 (kernel
6.18.33.2) were installed. Firmware virtualization was verified enabled. Enabling
Virtual Machine Platform returned exit code 3010: **Windows must restart** before
the engine can run. No automatic restart was performed.

After restarting Windows, start Docker Desktop and verify `docker info` succeeds,
then run the commands below. PostgreSQL comes from the Supabase containers; a
separate Windows PostgreSQL installation is unnecessary. If Docker still reports
virtualization unavailable, inspect its startup logs and hypervisor configuration
before changing firmware settings (firmware virtualization is already enabled).

Install/start a Docker-compatible Linux container runtime (Docker Desktop with WSL2
on Windows), then run from the repository root:

```sh
npm ci
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
```

`db:reset` destroys and recreates **this local project's database**, applying migrations
and fixtures. It is deliberately passed `--local`. Do not add `--linked`, `--db-url`,
or run a remote push with these local fixtures. First startup downloads container
images and uses disk/RAM, but does not provision paid services. Stop with
`npm run db:stop` when finished; local data is retained. Port 54321 is the API,
54322 PostgreSQL, and 54323 Studio. Keep these services restricted to your local
machine; local-stack generated credentials are development credentials, not secrets
to reuse in production. Do not paste status output containing keys into tracked files.

Optional CLI telemetry opt-out for the current PowerShell session:
`$env:SUPABASE_TELEMETRY_DISABLED = '1'`.

The configuration exposes only `public`, disables automatic API grants, and leaves
Google OAuth and public signup disabled until the authentication slice. Realtime,
Storage, Analytics and Edge Runtime are not needed here and are disabled.

## Data model and permissions

| Object/action | Visitor | User | App admin |
|---|---|---|---|
| Read asset catalog and curated membership | Yes | Yes | Yes |
| Register a catalog symbol | No | No | Yes |
| Add/remove curated membership | No | No | Yes |
| Read/add/remove watchlist items | No | Own only | Own only |
| Update ownership, truncate tables, delete asset identity | No | No | No |
| Read or modify admin assignments directly | No | No | No |

- `assets(symbol)` holds canonical identifiers only; no prices or duplicated profile
  information. Registering an asset does not automatically curate it.
- `curated_assets(symbol)` is shared membership, independent of all watchlists.
- `watchlist_items(user_id, symbol)` uses the Auth UUID and a composite primary key.
  A foreign key rejects unknown assets; delete/reinsert replaces UPDATE privileges.
- `private.admin_users(user_id)` contains only trusted assignments. No row means
  ordinary user. A private, fixed-search-path SECURITY DEFINER helper answers whether
  the authenticated caller is an admin, without accepting another user's ID.

RLS and grants both apply. A forbidden INSERT raises an error; a forbidden DELETE
may affect zero visible rows. Tests check effects, not just HTTP-style success.
Admin checks read the assignment table, so role revocation is effective on subsequent
statements without waiting for JWT claims to refresh. Editable profile metadata is
never consulted. Database owners bypass RLS intentionally; browser roles do not.

Only catalog/curation are public. The admin has no policy permitting access to other
users' watchlists. Neither browser roles nor the service role are granted access to
the role table in this slice. A future privileged backend must receive only the
grants it needs, rather than implicitly depending on default Supabase grants.

## Trusted admin provisioning

Use a trusted database-owner SQL session (local Studio SQL editor in development;
an owner-controlled administrative process in a future hosted project). First verify
the intended user's Auth UUID against their identity. Then substitute it below:

```sql
begin;
insert into private.admin_users (user_id)
values ('<verified-auth-user-uuid>') on conflict do nothing;
commit;
-- Revoke immediately:
delete from private.admin_users where user_id = '<verified-auth-user-uuid>';
```

Do not create an RPC or UI control that lets a user appoint admins. App admins can
curate assets, not grant authority. Never put owner/service credentials in browser
code or VITE variables.

## Fixtures and tests

The asset seed snapshots **88** symbols from `INITIAL_BOARD_STOCKS` (the legacy code's
comments describing 50 do not match the current list). It seeds identities only,
not the app's placeholder prices. Fixtures are config seed files, not migrations.

| Local SQL identity | UUID | Initial item |
|---|---|---|
| Admin | `11111111-1111-4111-8111-111111111111` | AAPL |
| Alice | `22222222-2222-4222-8222-222222222222` | AAPL |
| Bob | `33333333-3333-4333-8333-333333333333` | MSFT |

Emails use the reserved `example.invalid` domain. No passwords, OAuth identities,
refresh tokens, or browser login credentials are seeded. SQL tests switch database
roles and transaction-local JWT claims to exercise the policies. This does not test
JWT signing, Google OAuth or HTTP authentication; those need separate integration
tests in the next slice. Production callers cannot set database roles/claims this way
through the Data API; the gateway must establish them from a verified token.

`supabase/tests/authorization.test.sql` uses pgTAP inside a rolled-back transaction.
It checks anonymous access, ownership, cross-user and admin isolation, self-promotion,
metadata forgery, curation, constraints, role revocation, deletion cascades and stale
deleted-user tokens. Reset before running so fixtures are deterministic.

## Next slice: Google sign-in and deletion

After creating an owner-controlled hosted project, configure Google OAuth and exact
redirect URLs, then connect the frontend using public client configuration. Use the
authenticated UUID for watchlists; admin visibility must reflect database-enforced
permissions. Users adding searched assets outside the catalog will need a narrowly
scoped trusted symbol-validation/registration path. It must not confer curation
permission; it is not implemented here.

Deleting an Auth identity cascades through watchlist items and admin assignments.
Shared assets/curation have no personal attribution and remain intact. A later login
with the same email but a fresh UUID inherits nothing. The next slice must implement
a trusted account-deletion endpoint that verifies the caller, deletes through the
Auth admin API, clears local sessions, and handles failure honestly. SQL cascade tests
do not establish OAuth deletion behavior or provider backup/log-retention guarantees.

## Verification status (2026-09-07)

TypeScript, production build, six baseline tests (including exact asset seed parity),
and both Playwright smoke projects passed. Existing logo/bundle build warnings remain.
The 48 pgTAP assertions and SQL migrations are **not yet runtime-verified**: the local
database test command returned ECONNREFUSED on 127.0.0.1:54322 while the engine awaits
the Windows restart. The separate database GitHub Actions workflow has been added
but has not been run remotely. Run start/reset/test/lint after the reboot, resolve
any failures, and update this status with the results. No Firebase or hosted database
was contacted or modified.

## Official references

- [Local CLI and runtime prerequisites](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Row-level security and private helpers](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Explicit API grants](https://supabase.com/docs/guides/api/securing-your-api)
- [Database functions and search_path](https://supabase.com/docs/guides/database/functions)
- [pgTAP database testing](https://supabase.com/docs/guides/database/testing)
- [Auth identities and cascading deletion](https://supabase.com/docs/guides/auth/managing-user-data)
