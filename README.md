# SDET Market Tracker

A personal market tracker that brings together financial data, private watchlists and transparent software-test evidence.

[Visit the application](https://sdet-market-tracker-855618435389.us-west1.run.app)

## Explore the application

- **Home** pairs market movers with the latest verified test-run summary. Saved results show their age while current evidence is checked.
- **The Board** offers asset search, interactive price charts, market metrics and private watchlists. Market browsing is available without an account; Google sign-in enables saving assets.
- **The Tests** presents published GitHub Actions results, nightly pipeline replay and four recorded demonstrations. Failed runs, retries and unavailable evidence remain visible.
- **The Logic** explains the project's architecture, testing approach and use of AI assistance.
- **Settings and Contact** provide browser appearance preferences, account controls, privacy information and a resume preview with an explicit PDF download.

## Engineering approach

The application uses React and TypeScript for the interface, an Express server for external-data validation, Supabase for authentication and private watchlists, and GitHub Actions for published test evidence. Google Cloud Run hosts the application; private Cloud Storage preserves validated test snapshots and a separate historical archive.

Data provenance and failure states are part of the experience. Missing values remain unavailable, stale results are labelled, and retrieved data does not acquire a new observation time simply because it was cached. Database authorization enforces watchlist ownership independently of the interface.

The hosting design targets zero additional monthly cost. Scale-to-zero operation accepts cold starts, and provider allowances and availability remain constraints. See the [architecture overview](docs/project-overview.md) and [hosting overview](docs/deployment.md).

## Understanding the test evidence

Published results come from trusted GitHub Actions runs. A first-attempt pass, a successful retry and a failed test are distinct outcomes. Missing artifacts do not become passing results, and an ingestion success does not establish test success.

Recorded demonstrations use disclosed synthetic dependencies. They demonstrate application behavior and are separate from current CI results. Browser tests, database integration checks and live-provider observations establish different boundaries; none alone proves universal reliability, accessibility or financial accuracy.

Learn more about [test evidence](docs/test-telemetry.md), [coverage and limitations](docs/test-audit-implementation.md), and [recorded demonstrations](docs/test-recordings.md).

## Privacy and limitations

Public market browsing does not require an account. Personal-data use is limited to sign-in and private watchlists; the application does not add analytics, advertising or behavioral profiling. Provider and hosting logs have separate retention limits. See [privacy and security](docs/privacy-security.md).

Market information may be delayed or unavailable and is not independently reconciled across every asset. Dated local or hosted checks do not establish current CI status or production availability.

## Future plans

Planned additions include asset-price alerts, mock portfolios, a real investment/net-worth tracker, a downloadable mobile app and tablet-view improvements. See the [roadmap](docs/roadmap.md).

## AI assistance

Development used AI assistance, with feature design, code review and verification directed by the project owner. The project retains that provenance and the limits of its reported evidence.
