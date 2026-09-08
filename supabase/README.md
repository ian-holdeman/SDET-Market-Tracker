# Local database foundation

Supabase now backs frontend authentication, watchlists and curated membership.
Firebase remains for legacy test telemetry. No hosted project is linked. PostgreSQL 17 and the exact Supabase
CLI version in package.json provide the local baseline.

## Setup and reset

Windows setup is working: Docker Desktop 4.90.0, Docker Engine 29.7.2 and WSL
2.7.13.0 (kernel 6.18.33.2). PostgreSQL runs in Supabase's containers; a separate
Windows PostgreSQL installation is unnecessary.

During setup, all virtualization features were enabled but the Windows hypervisor
was not running. Windows system-file repair succeeded, and a full **Restart**
resolved startup. The last shutdown/power-on cycles had used Fast Startup, which
preserves kernel state. If this recurs after feature changes, use Start > Power >
Restart and verify `docker info` before changing firmware settings.

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

## Foundation verification (2026-09-07, before frontend integration)

TypeScript, production build, six baseline tests (including exact asset seed parity),
and both Playwright smoke projects passed. Existing logo/bundle build warnings remain.
After the Windows restart, `db:start` and a clean `db:reset` successfully applied the
migration and all local fixtures. **All 48 pgTAP authorization assertions passed.**
`db:lint` checked both public and private schemas with no errors or warnings.
The tests roll back their changes, preserving the seeded development identities.
The separate database GitHub Actions workflow has not been run remotely. Google
OAuth, Auth API account deletion, and frontend migration were pending at this stage;
SQL tests do not validate those integrations. No Firebase or hosted database was
contacted or modified.

## Official references

- [Local CLI and runtime prerequisites](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Row-level security and private helpers](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Explicit API grants](https://supabase.com/docs/guides/api/securing-your-api)
- [Database functions and search_path](https://supabase.com/docs/guides/database/functions)
- [pgTAP database testing](https://supabase.com/docs/guides/database/testing)
- [Auth identities and cascading deletion](https://supabase.com/docs/guides/auth/managing-user-data)

## Google sign-in and frontend integration

The frontend now uses Supabase for accounts, UUID-owned watchlists, and curated
membership. Firebase remains only for legacy test history/telemetry. No hosted
Supabase project has been verified or linked in this workspace.

### Local configuration

```sh
npm run db:start
npm run db:reset
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

Google credentials have **not** been created. In Google Cloud, select/create a
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
before applying migrations; do not upload local Auth fixtures. Production hosting,
hosted project provisioning and Google console changes have not occurred.

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
UUID, with per-user RLS and foreign keys as the authority. A failed write is shown
rather than represented as a successful optimistic save.

**Unregistered search assets cannot be saved yet.** The UI explains this restriction.
The future trusted registration path must authenticate callers, validate a
canonical symbol against a provider, and insert asset identity only. It must never
grant curated membership, watchlist access for another UUID, or role assignment.
There is intentionally no such endpoint or new service-role catalog grant here.

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
- CI adds local Auth API integration to the database job and browser Auth checks
  to the existing application job. It has not been executed remotely.

Live Google consent, real Google callback/cancellation, deletion of a
Google-linked Auth identity, and signing in again with the same Google account
still need a manual end-to-end check after provider configuration. SQL and password
Auth tests cannot prove those outcomes or provider retention guarantees.

References:
[Google provider setup](https://supabase.com/docs/guides/auth/social-login/auth-google),
[PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow),
[server identity verification](https://supabase.com/docs/reference/javascript/auth-getuser),
[Auth admin deletion](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser),
[deleted users and JWT lifetime](https://supabase.com/docs/guides/auth/managing-user-data).

### Integration verification (2026-09-07)

Passed locally: TypeScript, normal production build, nine baseline checks,
53 pgTAP assertions, database lint, real local Auth API deletion/recreation,
and 16 browser checks across the full and focused Chromium/WebKit runs.
Telemetry validation ran in dry-run mode only. A dummy secret-key build was
correctly rejected; the restored normal browser artifacts were checked against
the configured server secret and did not contain it. Existing duplicate logo
cases and large bundle warnings remain. The normal local build is restored.

The owner has now created the Google Cloud project named SDET Market Tracker.
The OAuth client/provider configuration and live Google round trip still need
completion. The Google Cloud sign-in page is open in Codex for the owner to
continue. A Google Cloud project is distinct from a hosted Supabase project;
no hosted Supabase project has been verified or changed.

### Google provider setup (2026-09-07)

The local OAuth client and its exact URLs were verified in Google Cloud. Saved
credentials are read only from ignored root .env. After a volume-preserving
restart, Auth settings reported Google enabled and signup allowed. All 53 pgTAP
assertions and the real local Auth deletion/recreation test passed again. The app
is running at http://localhost:3000. A real sign-in from /logic reached Google’s
consent screen requesting name/profile picture and email. User consent and the
completed callback are still pending; this is not yet a verified round trip.

### Owner manual Google OAuth verification

The owner reported verifying the real Google sign-in return destination, watchlist
persistence across sign-out/sign-in, account deletion signing the user out, and a
subsequent same-email sign-in starting with an empty watchlist and no inherited
admin access. These are owner-reported manual results, supplementing the automated
SQL, Auth API and mocked browser checks. They do not establish provider backup or
log-retention guarantees.

A follow-up navigation defect was reproduced: individual card collapse and Collapse
All left a stale symbol in the URL. OAuth restored that URL and reopened the card.
The Board now keeps the URL aligned with individual expansion state and clears a
single-card destination on bulk expansion/collapse. Regression checks exercise
watchlist save, collapse, sign-out and Google re-login, while retaining deliberate
open-card deep links.

### Corrected Board OAuth return contract

OAuth return paths now normalize any allowed Board route to `/board`, even when
the user leaves an asset card open before signing out and back in. Normalizing
both when saving the destination and when consuming it also handles previously
stored asset URLs. Ordinary direct asset links still expand cards outside OAuth.
This supersedes the earlier test expectation that OAuth should preserve open-card
deep links. Browser regressions leave the card open and exercise sign-out/sign-in
from both query-based and path-based asset URLs with a populated watchlist.
