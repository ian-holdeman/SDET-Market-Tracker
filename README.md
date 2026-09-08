# SDET Market Tracker

A React/TypeScript stock-market board and SDET portfolio. Express validates Yahoo market data, Supabase owns Google authentication and private watchlists, and GitHub Actions supplies published test evidence. Visitors can browse every public page without signing in. Firebase has been retired; old test results are not migrated.

## Local setup

Use Node 22 (`.nvmrc`) and npm. Docker/WSL is required for local Supabase and database tests.

```sh
npm ci
npm run db:start
npm run auth:setup:local
npm run dev
```

`auth:setup:local` writes ignored local configuration using the local Supabase stack. See [Supabase setup](supabase/README.md) for Google OAuth setup, fixtures and role provisioning. Do not reset a database containing accounts you want to keep. Apply new local migrations without reset with `node scripts/supabase.mjs migration up --local`.

The app defaults to [localhost:3000](http://localhost:3000). Google returns through `/auth/callback`; authentication returns Board visitors to its overview. The public market pages do not require credentials. Missing optional account or history configuration produces an explicit unavailable/empty state.

Copy configuration names from `.env.example`; keep values in ignored `.env.local` or the hosting environment. `VITE_*` values are public and embedded at build time. `SUPABASE_SECRET_KEY` and `TEST_HISTORY_TOKEN` are server-only. Never prefix them with `VITE_`.

## Build and serve

```sh
npm run lint
npm run build
npm start
```

`lint` runs TypeScript checking. The build writes public Vite assets to `dist/client` and the private ESM server to `dist/server`. Only `dist/client` is served. Production paths resolve relative to the server bundle, not the working directory. Runtime deployment needs both directories, package manifests and production dependencies. `npm run preview` also starts the full server; only `npm run dev` enables Vite. Restart development after server changes.

The server reads `.env.local`, then `.env`, without overriding existing process variables. `PORT` defaults to 3000. `/api/health` checks application availability, not provider availability. No application hosting configuration is committed.

## Verification

```sh
npm run build:e2e
npm run test:baseline
npm run test:e2e -- --workers=2
npm run test:e2e:ingest
npm run db:test
npm run db:lint
npm run test:auth
npm run build
```

Playwright launches an isolated production server on `127.0.0.1:3100`, with fake public Supabase configuration and intercepted external APIs. It cannot reuse your development server. Restore the normal build afterwards. Browser tests do not prove database authorization: SQL and local Auth/PostgREST tests exercise those boundaries separately with transactional/disposable fixtures. Test cases have at most one retry; every attempt is retained in evidence.

The offline suite covers server/configuration boundaries, provider validation, financial calculations, ownership endpoints and telemetry integrity. Opt-in `npm run test:market:live` and `npm run test:market:coverage` access Yahoo; they establish point-in-time availability rather than independent financial correctness. HTML reports, traces and recordings are local diagnostic artifacts and are not published by CI.

The Tests showcase separately includes curated, reviewed local recordings in public client assets. Use `npm run record:showcase` to capture the selected browser scenarios; see [recording preparation, review, and playback limits](docs/test-recordings.md). These demonstrations use mocked services and do not establish current CI outcomes.

## Published test history

GitHub Actions runs browser/offline and local database checks in parallel jobs of `.github/workflows/playwright.yml`. Only sanitized test evidence is uploaded, keyed by run ID and workflow attempt. Database-job failure prevents the overall workflow from appearing passed, even if browser tests passed. PR runs execute checks but are not accepted as portfolio telemetry.

Configure server-only `TEST_HISTORY_REPOSITORY`, `TEST_HISTORY_BRANCH` and `TEST_HISTORY_TOKEN` to read trusted workflow history. The token needs Actions read access to that repository; there is no browser token or publishing endpoint. Leaving all three unset shows “No verified runs yet.” Read-only retrieval of published GitHub evidence has been exercised locally. Verify the specific workflow run for each new commit; this is separate from hosted application configuration.

`npm run test:e2e:ingest` writes local evidence only. `--github` is reserved for the Actions workflow. Missing/invalid reports produce incomplete evidence and exit nonzero. Failed reports remain failed even when validation succeeds. The dashboard never treats ingestion success as test success.

See [telemetry architecture and evidence semantics](docs/test-telemetry.md) for retention, trust boundaries, latest-run ordering, failure states and setup requirements.

## Project guidance and roadmap

Start new development tasks with [AGENTS.md](AGENTS.md), the [project overview](docs/project-overview.md), and the [owner roadmap](docs/roadmap.md). Keep durable standards in AGENTS.md, implementation details in the domain guides, and planned work in the roadmap.

## Architecture and security references

- [Market-data pipeline](docs/market-data.md): server validation, provenance, caches, unavailable values and coverage limits.
- [Accounts and database authorization](supabase/README.md): Google sign-in, UUID ownership, curation and deletion.
- [Searched-asset registration](docs/symbol-registration.md): trusted validation without curation privileges.
- [Test telemetry](docs/test-telemetry.md): authoritative CI evidence and public-safe publication.

- [Header activity](docs/header-activity.md): trusted workflow activity and scheduled equity sessions.

For immediate cold-load evidence, the server stores an ignored snapshot under `.telemetry/snapshots`. Set server-only `TEST_SNAPSHOT_DIRECTORY` to a private persistent volume for hosting; ephemeral filesystems cannot guarantee restart persistence. See the telemetry guide for limits and failure behavior.

Future feature scope and maintenance considerations are tracked in the [roadmap](docs/roadmap.md). Visitors never trigger test runs.
