# The SDET's Market Tracker

The next database foundation is documented in [supabase/README.md](supabase/README.md).
It is local-only and does not replace the running Firebase integration yet.

React/TypeScript market dashboard and SDET portfolio. Express proxies market data;
the browser uses Firestore for accounts and test history. This baseline does not
deploy anything or require paid infrastructure.

## Local setup

Use Node.js 22 (see `.nvmrc`) and npm. CI uses the same Node major and `npm ci`
with the committed lockfile. Do not substitute `npm install` when `npm ci` fails;
resolve the lockfile mismatch instead.

```sh
npm ci
npx playwright install chromium webkit
npm run dev
```

On Linux, install browser system dependencies with
`npx playwright install --with-deps chromium webkit`.
Development runs at http://localhost:3000. HMR remains disabled as in the existing
application; refresh the browser after edits.

The public market pages work without Firebase configuration. Accounts and test
history report that Firebase is unavailable, including the missing variable names.
They do not silently initialize against an unrelated project. The market proxy
requires outbound access to Yahoo Finance; ticker images use Parqet's asset CDN.

## Firebase configuration

Copy `.env.example` to `.env.local` and populate the Firebase **web app** values
for an isolated development project. The required fields are
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`.
The remaining fields are described in the example. Set
`VITE_FIREBASE_DATABASE_ID` to the provisioned named database, or leave it empty
for `(default)`. The browser and ingestion CLI use the same default and validator.
Validation checks presence/placeholders, not remote project validity or access.

Both Vite and the ingestion CLI load `.env.local` before `.env`; existing process
environment variables take precedence. Vite also supports its mode-specific env
files. Do not use mode-specific Firebase settings for ingestion: supply them in
the CLI environment explicitly. `VITE_*` values are public build-time configuration,
not secrets. Restart development or rebuild after changing them. Never place a
service-account key or other private credential in a `VITE_*` variable.

Gemini is not used. Legacy `GEMINI_API_KEY` and `BASE_URL` entries are unnecessary.
The ingestion CLI no longer accepts `FIREBASE_*` aliases; use `VITE_FIREBASE_*`
consistently. No configuration values are committed.

**Known pre-launch blocker:** authentication is still the original browser-side
passcode system, and the checked-in Firestore rules allow public writes. This
task does not change authentication, rules, or the existing database. Do not
mistake configuration validation for access control. Firebase Auth, enforced RBAC,
and isolated database integration tests are separate work before launch.

## Production build and local preview

```sh
npm run lint
npm run build
npm start
```

`npm run preview` also starts the full application. `npm start` always uses
production serving, regardless of `NODE_ENV`; only `npm run dev` enables Vite.
The build cleans the fixed repository `dist` directory using a cross-platform
Node script, then writes:

- `dist/client`: public HTML, CSS, and JavaScript.
- `dist/server`: private Node ESM server bundle and source map.

Only `dist/client` is served. Start paths resolve relative to the server bundle,
not the current directory. Runtime dependencies must be installed, but Vite and
other dev dependencies are only needed to develop/build. A deployment would need
both output directories plus package manifests and `npm ci --omit=dev`.
No hosting provider is configured by this task.

`PORT` is a process environment variable, defaulting to 3000. On PowerShell:

```powershell
$env:PORT = '3001'
npm start
```

On a POSIX shell: `PORT=3001 npm start`. The server does not load PORT from `.env`.
`GET /api/health` checks application availability, not Yahoo/Firebase availability.

## Baseline checks

```sh
npm run lint
npm run build
npm run test:baseline
npm run test:e2e
npm run test:e2e:ingest
```

- `lint` is TypeScript checking, not ESLint.
- `test:baseline` uses Node's test runner for configuration/report validation and
  HTTP checks against the built server. Build first. It checks health, asset serving,
  deep-link fallback, API 404s, private artifact isolation, and PORT validation.
- Playwright starts a fresh **production build** on `127.0.0.1:3100` and refuses
  to reuse another process. Keep this port available. It deliberately ignores
  personal `.env` BASE_URL values so it cannot target a remote site accidentally.
- The navigation smoke test runs in desktop Chromium and mobile WebKit, checks
  navigation, refresh, and browser history. Market responses are intercepted and
  external browser requests are blocked. It does not validate live prices or
  Firebase. Other suite files are still scaffolding, not coverage claims.
- Browser reports/artifacts are under `playwright-report` and `test-results`.
  Headed debugging: `npm run test:e2e:headed`; UI runner: `npm run test:e2e:ui`.

CI runs the same checks on Node 22/Linux and retains reports for 14 days. It needs
no Firebase credentials and does not publish telemetry. A failed browser command
still fails the job even if report validation succeeds afterward.

## Telemetry is explicit

`npm run test:e2e:ingest` validates `test-results/results.json` without connecting
to Firebase. Missing, malformed, inconsistent, empty, or skipped-only reports
exit nonzero; none generate sample passes. Failed reports remain failed, flaky
retries are counted separately, all browser projects are retained, and run-level
errors prevent a passed status. Validation success means the report is structurally
valid, not that its tests passed. Check the test command exit status for that.

Only after intentionally choosing a target database, this command publishes:

```sh
npm run test:e2e:ingest -- --write
```

Publishing requires valid configuration and permission to write `test_runs`.
Write errors exit nonzero. A timeout has an unknown remote outcome and is reported
as a failure. This remains a client-SDK writer under the current rules; trusted
CI authentication and automated publishing must be designed with the RBAC work.
The command uses the current report file, so run tests immediately before publishing.
The home card no longer invents successful test runs when history is unavailable.

## Engineering rationale and next decisions

The baseline separates public assets from executable artifacts, decouples public
pages from optional services, and tests failure paths as well as the happy path.
Local smoke tests are deterministic and cost-free; external integration accuracy
must be established separately rather than inferred from those smoke results.

Next decisions: Firebase Auth/RBAC design, an emulator or disposable development
database, free hosting constraints, live market reliability checks, and a budgeted
architecture for user-triggered headed execution. No live-runner/container
infrastructure or broader UI redesign is included here.

## Supabase accounts

Google sign-in, private UUID-owned watchlists, curated membership and account deletion
use Supabase. Firebase configuration now applies only to legacy test history.
See [Supabase setup](supabase/README.md#google-sign-in-and-frontend-integration) for
local configuration, exact OAuth URLs, Google provider setup, permission boundaries
and verification commands. No hosted project or Google OAuth client is configured yet.
Use `npm run build:e2e` before browser tests and `npm run build` afterwards to restore
the normal local build.
