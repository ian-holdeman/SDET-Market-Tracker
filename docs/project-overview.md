# Project overview

This project serves two purposes: personal market monitoring and a public portfolio demonstrating Senior SDET skills. The audience should see useful functionality and inspect credible engineering evidence without needing an account. Production-quality behavior and a minimalist interface take priority over breadth. Infrastructure cost matters; do not infer a budget or provision paid services.

Home, The Board, The Tests and The Logic are owner-accepted as initial version complete. Privacy/security review is the next feature; hosting selection and production verification remain open. See [milestones and remaining scope](roadmap.md).

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
- Accounts currently enable watchlists. Admin curation is separate from personal data; Google metadata cannot assign roles. See [accounts and authorization](../supabase/README.md).
- Keep personal-data use limited to operating sign-in and private watchlists. The owner does not want analytics, advertising, subscriptions, behavioral tracking or secondary use. Review necessary Auth/storage/provider processing honestly; see [privacy direction](privacy-security.md).
- The Board shows six price/activity metrics: previous close, day range, 52-week range, volume, one-month change and one-year change. Google Finance links provide deeper research; inaccessible fundamentals are not estimated. See [market data](market-data.md).
- Searched assets can be registered through a trusted server path and saved under owner-only RLS. Registration does not curate an asset. See [symbol registration](symbol-registration.md).
- GitHub is the authority for public test results. Curated local browser recordings provide visual demonstrations, with mocks and provenance disclosed; a separate historical pipeline replay uses revalidated GitHub job timing and a sanitized browser-results replay. Visitors must not execute tests. See [telemetry](test-telemetry.md) and [recordings](test-recordings.md), and [pipeline replay](pipeline-replay.md).
- Header dots indicate an in-progress trusted GitHub workflow and scheduled U.S. equity hours, respectively. The market dot excludes crypto and does not establish live prices or absence of halts. See [activity indicators](header-activity.md).

## Working agreement

Use the feature workflow in [AGENTS.md](../AGENTS.md) for each substantial feature. Initial questions and a concrete proposal precede the agreed implementation prompt; accepted work then proceeds through meaningful tests, focused implementation, desktop/mobile review, and owner feedback. Small refinements stay within the accepted scope. This workflow targets production quality without treating local checks as proof of hosted readiness.

Preserve the owner’s stated acceptance milestone and any deferred scope in the roadmap. When scoping explanatory pages, check visible claims against actual code and evidence before drafting copy; describe engineering choices without promising zero defects or instantaneous upstream results.

Keep one source of truth per concern: AGENTS.md for engineering and design standards, domain guides for accepted behavior and reproduction, and the roadmap for completion and unresolved future scope. Update existing guidance rather than accumulating session summaries. Test totals, running processes, browser tabs, and machine-specific temporary paths are not durable project facts.

## Environment and evidence boundaries

The tracked setup targets a local Supabase stack and a Node server. No application hosting configuration is committed. Verify ignored local configuration and the intended project before any environment-dependent work; a Google Cloud OAuth project is not a Supabase project. Google setup and the owner-reported manual round trip are documented in the account guide. Do not duplicate credentials here.

During the preceding implementation work, local offline/browser checks, database/Auth integration checks, and read-only GitHub retrieval were exercised. The owner reported successful real Google sign-in, watchlist persistence and deletion/re-login behavior. These observations are not a permanent green baseline or proof of hosted durability. Rerun affected checks for new changes and inspect actual GitHub runs before claiming publication for a particular commit.

Local snapshots survive a Node restart. Hosting them on an ephemeral filesystem will not provide durable cold-start data; a private persistent volume or a future durable-store implementation is required. Per-process caches and rate limits are not distributed protections. Market licensing, independent reconciliation, privacy wording and hosting readiness remain separate concerns.

Use [README](../README.md) for setup and [the roadmap](roadmap.md) for next work. Do not turn future ideas into implementation without a scoped task.
