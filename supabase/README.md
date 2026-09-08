# Accounts and local database

Supabase now backs frontend authentication, watchlists and curated membership.
Test telemetry now uses GitHub Actions artifacts. No hosted project is linked. PostgreSQL 17 and the exact Supabase
CLI version in package.json provide the local baseline.

## Setup and reset

PostgreSQL runs in Supabase containers; a separate Windows PostgreSQL installation is unnecessary. If Docker cannot start after Windows virtualization changes, perform a full Restart and verify Docker/WSL before changing firmware settings. Verify installed versions rather than relying on historical setup notes.

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
Google OAuth and public signup disabled unless the wrapper finds both Google credentials. Realtime,
Storage, Analytics and Edge Runtime are not needed here and are disabled.

## Data model and permissions

| Object/action | Visitor | User | App admin |
|---|---|---|---|
| Read asset catalog and curated membership | Yes | Yes | Yes |
| Direct catalog INSERT through Data API | No | No | Yes |
| Request trusted searched-symbol registration | No | Yes, server validation | Yes, server validation |
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
users' watchlists. Neither browser roles nor the service role have direct role-table access. The trusted registration migration grants service_role SELECT/INSERT on assets only; Auth admin APIs remain broadly privileged. See [symbol registration](../docs/symbol-registration.md) for the endpoint and limits.

## Trusted admin provisioning

Use a trusted database-owner SQL session (local Studio SQL editor in development;
an owner-controlled administrative process for a verified hosted project). First verify
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

The asset seed snapshots **88** symbols from `INITIAL_BOARD_STOCKS`. It seeds identities only, never market prices. Fixtures are config seed files, not migrations.

| Local SQL identity | UUID | Initial item |
|---|---|---|
| Admin | `11111111-1111-4111-8111-111111111111` | AAPL |
| Alice | `22222222-2222-4222-8222-222222222222` | AAPL |
| Bob | `33333333-3333-4333-8333-333333333333` | MSFT |

Emails use the reserved `example.invalid` domain. No passwords, OAuth identities,
refresh tokens, or browser login credentials are seeded. SQL tests switch database
roles and transaction-local JWT claims to exercise the policies. This does not test
JWT signing, Google OAuth or HTTP authentication; those need separate integration
tests described below. Production callers cannot set database roles/claims this way
through the Data API; the gateway must establish them from a verified token.

`supabase/tests/authorization.test.sql` uses pgTAP inside a rolled-back transaction.
It checks anonymous access, ownership, cross-user and admin isolation, self-promotion,
metadata forgery, curation, constraints, role revocation, deletion cascades and stale
deleted-user tokens. Use the seeded local stack; reset only when its data is disposable.

## Official references

- [Local CLI and runtime prerequisites](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Row-level security and private helpers](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Explicit API grants](https://supabase.com/docs/guides/api/securing-your-api)
- [Database functions and search_path](https://supabase.com/docs/guides/database/functions)
- [pgTAP database testing](https://supabase.com/docs/guides/database/testing)
- [Auth identities and cascading deletion](https://supabase.com/docs/guides/auth/managing-user-data)

## Google sign-in and frontend integration

The frontend now uses Supabase for accounts, UUID-owned watchlists, and curated
membership. Test history is read from GitHub Actions artifacts. No hosted
Supabase project has been verified or linked in this workspace.

### Local configuration

```sh
npm run db:start
npm run auth:setup:local
npm run dev
```

Open **http://localhost:3000**. The setup command reads keys from the pinned CLI
without printing them and writes only ignored `.env.local`. It refuses to replace
different existing values and refuses any API URL other than the local stack.
The three VITE variables are public, compiled into the browser:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_AUTH_REDIRECT_URL`. Only the new `sb_publishable_` key format is accepted.
Server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` support deletion. Never prefix
a secret with VITE. Restart development/rebuild production after configuration changes.

Missing client configuration preserves visitor browsing and explains the missing
fields when sign-in is requested. Disabled Google provider settings also produce
an explanation before redirecting. A missing server secret disables deletion with
HTTP 503; it does not simulate success.

### Exact OAuth URLs

OAuth has two different callbacks:

| Setting | Local value |
|---|---|
| Google Cloud OAuth client type | Web application |
| Google authorized JavaScript origin | `http://localhost:3000` |
| Google authorized redirect URI (Supabase Auth) | `http://127.0.0.1:54321/auth/v1/callback` |
| Supabase Auth Site URL | `http://localhost:3000` |
| Supabase additional redirect URL (our frontend) | `http://localhost:3000/auth/callback` |
| VITE_AUTH_REDIRECT_URL | `http://localhost:3000/auth/callback` |

Do not substitute `/api/auth/callback`. The app serves `/auth/callback` as a
frontend route. It exchanges a PKCE authorization code once, removes it from the
address bar, then restores the return page from sessionStorage. Board routes always return to
`/board`, discarding asset paths, queries and fragments; other allowed pages keep
their original query and fragment.
The return path is restricted to this app's routes; no user-controlled external URL
is accepted. Start and finish in the same browser and origin.

For a new environment, in Google Cloud select/create a
project owned by you, configure Google Auth Platform branding/audience, and create
a Web application OAuth client using the exact values above. While the consent
screen is in Testing, add your Google account as a test user. Request only the
default identity scopes (openid, email, profile), not market or Google account access.

Store the Google client ID and secret in the ignored root `.env` (read by the
Supabase CLI), using `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`. These are not browser variables.
The tracked provider configuration references these environment variables. The npm
`db:*` commands use `scripts/supabase.mjs`, which loads ignored root `.env` and
enables Google and new-account signup only when both credentials are populated.
A partial pair fails with an explanation. Without credentials, Google and new
signups remain disabled, preserving the credential-free CI database baseline.
Use the npm commands rather than invoking the underlying Supabase binary directly,
so boolean environment substitution has an explicit value.

Run `npm run db:stop` followed by `npm run db:start` after changing credentials.
This preserves database volumes; do not reset a database containing your real
local Google test identity. The email/password provider remains available for
owner-created local test identities; enabling local Google signup also enables
the global signup setting. Before hosted rollout, separately restrict unwanted
providers and validate the hosted configuration.

For a future hosted project, Google's redirect URI becomes
`https://<verified-project-ref>.supabase.co/auth/v1/callback`. Use the exact deployed
HTTPS origin for the app Site URL and `<origin>/auth/callback` for the additional
redirect and VITE setting. Avoid wildcard redirect rules. Verify the project/ref
before applying migrations; do not upload local Auth fixtures. Application hosting is not configured in this repository. Existing Google console settings are environment-specific; verify them before making changes.

### Authorization and deletion

`current_user_is_admin()` exposes only the caller's current permission, delegating
to the same private helper used by RLS. It accepts no UUID, and only authenticated
callers may execute it. Google metadata supplies a display name only. Editing that
metadata or old localStorage role values cannot grant database privileges.
Provision/revoke admins through the trusted owner SQL procedure above, using the
actual Auth UUID. Role visibility refreshes on sign-in, token events, and window
focus; a revoked role may remain visually stale until refresh, but writes are
immediately denied by database policy.

Expanded cards expose curated add/remove controls only for verified admins.
Mutations must affect exactly one returned row before the UI treats them as
confirmed. Curation deletes membership only. Watchlist writes use the authenticated
UUID, with per-user RLS and foreign keys as the authority. Settings bulk clear performs one owner-filtered `watchlist_items` DELETE, preserving identities, admin assignments, shared assets and curation. AuthContext excludes concurrent watchlist/account writes and re-reads uncertain outcomes; stale responses cannot update another account. The disposable `scripts/auth-tests/clear-watchlist.test.ts` verifies effects for both owners, including empty and forbidden cross-owner clears. No migration or new privilege is required. See [Settings](../docs/settings.md). A failed write is shown
rather than represented as a successful optimistic save.

Searched assets outside the catalog can be saved through `POST /api/assets/register`. The server verifies the caller and provider symbol, inserts shared identity only, then the frontend saves the watchlist item with the user session under RLS. Registration grants no curation, role or cross-user privileges. See [trusted symbol registration](../docs/symbol-registration.md) for the full contract.

`DELETE /api/account` accepts a bearer access token and no target/body parameters.
The server validates the token by calling Auth `getUser(token)`, then invokes
`auth.admin.deleteUser(verifiedUser.id, false)` with a server-only secret. It rejects
foreign browser Origins. Supabase performs hard identity deletion; existing SQL
foreign keys cascade personal watchlists and admin assignments. Shared tables have
no owner attribution and remain intact.

Only a confirmed success clears the browser's persisted Auth state and SDK session.
Failure/timeout messages explicitly avoid claiming that deletion succeeded or
failed atomically across the network: a lost response may follow a successful
deletion. Verify the current session before retrying. Other devices may retain
cached state and unexpired JWTs; deleted-user foreign keys and removed admin
assignments prevent personal writes/admin operations, and server `getUser`
rejects the deleted identity. The app does not delete the Google account or claim
immediate erasure from provider backups/logs. A fresh UUID with the same email has
no inherited watchlist or admin assignment.

### Checks and test boundaries

```sh
npm run db:test
npm run db:lint
npm run test:auth
npm run lint
npm run build:e2e
npm run test:baseline
npm run test:e2e
npm run test:e2e:ingest
npm run build
```

- pgTAP covers table authorization/cascades and the caller-only permission RPC.
- `test:auth` targets only the local API at 127.0.0.1:54321. It creates unique,
  temporary password identities through Auth admin API, tests real Auth sessions,
  deletes through the real endpoint, checks cascades, and recreates the same email.
  Cleanup removes only its own identities and unique shared fixture. It requires
  local Docker access; no credentials or tokens are logged.
- Baseline Node tests cover config/return-path validation, deletion failure cases,
  build serving boundaries and telemetry.
- Browser tests use a reserved fake Supabase origin and intercepted responses.
  They test PKCE navigation, UUID write payloads, forged role rejection, deletion
  failure/success UX and disabled-provider messaging in Chromium and WebKit.
  They do not establish Google's external behavior or Supabase authorization;
  those are separate integration boundaries.
- `build:e2e` builds a mock-configured bundle for browser tests. Always run
  `npm run build` afterwards for a normal local build. Both builds keep secrets
  out of the browser.
- `.github/workflows/playwright.yml` runs local Auth API integration in the database job and mocked browser checks in the application job. Inspect the specific GitHub run before claiming CI success for a change.

The owner reported successful real Google sign-in, watchlist persistence, account deletion/sign-out, and subsequent same-email sign-in with an empty watchlist and no inherited admin role. These are manual observations, separate from automated SQL/password-Auth/browser evidence. Repeat the relevant real-provider checks after OAuth configuration changes; none establishes provider retention guarantees.

References:
[Google provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[server identity verification](https://supabase.com/docs/reference/javascript/auth-getuser),
[Auth admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser),
[deleted users and JWT lifetime](https://supabase.com/docs/guides/auth/managing-user-data).

### Board OAuth regression contract

OAuth normalizes every allowed Board return route to `/board` both when saving and consuming the destination. Signing out from an expanded card must not reopen it after login. Ordinary direct asset links remain supported outside OAuth. Browser regressions cover query/path destinations and populated watchlists.
