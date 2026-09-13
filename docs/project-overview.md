# Project overview

This project serves two purposes: personal market monitoring and a public portfolio demonstrating Senior SDET skills. The audience should see useful functionality and inspect credible engineering evidence without needing an account. Reliable core workflows and a minimalist interface take priority over breadth. Infrastructure cost matters; do not infer a budget or provision paid services.

The initial application is complete and owner-accepted, with hosted evidence recorded in [deployment and operation](deployment.md). The September 12 local update is also accepted: appearance polish, nightly CI, the F1–F14 test audit, automatic nightly replay and refreshed recordings. Deployment and genuine scheduled-publication checks for that update remain separate. See [Contact behavior](contact.md) and the [roadmap](roadmap.md).

## Architecture map

| Area | Implementation and responsibility |
| --- | --- |
| Browser | React 19, TypeScript, Vite, Tailwind and Motion; src/App.tsx selects Home, Board, Tests, Logic and Settings |
| Server | Express entry in server.ts; server/ contains provider validation, registration, deletion and GitHub evidence readers |
| Market | server/market.ts → src/services/yahooMarket.ts → MarketContext → Board, charts and Home movers; Yahoo is an external dependency, not an accuracy oracle |
| Identity and data | Supabase Auth plus PostgreSQL grants/RLS; AuthContext and client services; versioned SQL and local fixtures under supabase/ |
| Test evidence | Playwright reporter/ingestion scripts → GitHub Actions artifact → validated server feed/snapshot → shared telemetry calculations and presentation |
| Validation | Node offline tests in scripts/tests, browser specs and page objects in src/tests, SQL assertions in supabase/tests, real local Auth/REST tests in scripts/auth-tests |

## Durable product decisions

- Initial launch scope: Board, Tests, Logic, Home, and honest Privacy/Contact/Settings behavior. Visitors can explore all public content.
- Settings provides account deletion, owner-scoped bulk watchlist clearing, browser-only Light/Dark appearance and the full public privacy notice. The device supplies the unsaved default; explicit choices survive sign-out/deletion and are never sent to the server. See [Settings behavior and evidence](settings.md).
- Accounts currently enable watchlists. Admin curation is separate from personal data; Google metadata cannot assign roles. See [accounts and authorization](../supabase/README.md).
- Keep personal-data use limited to operating sign-in and private watchlists. The owner does not want analytics, advertising, subscriptions, behavioral tracking or secondary use. Review necessary Auth/storage/provider processing honestly; see [privacy direction](privacy-security.md).
- The Board shows six price/activity metrics: previous close, day range, 52-week range, volume, one-month change and one-year change. Google Finance links provide deeper research; inaccessible fundamentals are not estimated. See [market data](market-data.md).
- Searched assets can be registered through a trusted server path and saved under owner-only RLS. Registration does not curate an asset. See [symbol registration](symbol-registration.md).
- GitHub is the authority for public test results. Curated local browser recordings provide visual demonstrations, with mocks and provenance disclosed; a separate nightly pipeline replay uses revalidated GitHub job timing and sanitized browser results, with the existing historical archive retained separately. Visitors must not execute tests. See [telemetry](test-telemetry.md) and [recordings](test-recordings.md), and [pipeline replay](pipeline-replay.md).
- Header dots indicate an in-progress trusted GitHub workflow and scheduled U.S. equity hours, respectively. The market dot excludes crypto and does not establish live prices or absence of halts. See [activity indicators](header-activity.md).

## Contribution guidance

Follow [AGENTS.md](../AGENTS.md) for scope, meaningful regression coverage, validation and review. Keep engineering standards there, behavior and reproduction in domain guides, and completion/deferred scope in the roadmap. Public claims must match source and dated evidence; local checks do not establish current CI success or hosted readiness.

## Environment and evidence boundaries

Local development uses Node 22 and an isolated Supabase stack. Production uses Cloud Run, private Cloud Storage and the separately configured Supabase Free project. Verify the intended target before environment-dependent work; local fixtures must never reach hosted data. The [deployment guide](deployment.md) records dated hosted OAuth and recovery checks, while the [audit guide](test-audit-implementation.md) records the accepted local update. Neither is a permanent green baseline for later commits.

Cloud Run uses conditional private Cloud Storage snapshots and an independently published historical archive. Local file snapshots remain available for one process. The nightly selection guard stores only the highest observed identity through the same private facilities; it is not a publication authority. Registration has a shared database budget; public market caches and concurrency limits remain per process. The private Finnhub comparison has limited, explicit coverage; provider rights and hosted verification remain separate concerns.

Use [README](../README.md) for setup and [the roadmap](roadmap.md) for next work. Do not turn future ideas into implementation without a scoped task.
