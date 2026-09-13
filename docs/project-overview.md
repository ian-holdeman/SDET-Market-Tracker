# Architecture overview

The SDET Market Tracker combines public market browsing with private watchlists and inspectable software-test evidence. Its design emphasizes understandable behavior, explicit failure states and low-cost operation.

## Main components

| Component | Responsibility |
| --- | --- |
| React and TypeScript interface | Home, Board, Tests, Logic, Settings and Contact |
| Express server | Validating external market responses and trusted test evidence |
| Supabase | Google authentication, private watchlists and database-enforced ownership |
| GitHub Actions | Executing checks and supplying published test results |
| Cloud Run and private Cloud Storage | Application hosting, validated evidence snapshots and an independent historical archive |

## Data and trust boundaries

Market observations retain their provider identity, currency and timestamps. Optional missing values remain unavailable; refresh failure does not turn old observations into fresh data. See [market-data behavior](market-data.md).

Watchlists belong to authenticated accounts. Database authorization prevents cross-user access, while shared Board curation remains separate from private holdings. See [accounts and data](../supabase/README.md).

Test results originate from trusted GitHub Actions evidence. Saved snapshots improve initial display but cannot publish results or override upstream removals. Historical replay is clearly labelled and excluded from rolling metrics. See [test evidence](test-telemetry.md).

## Design tradeoffs

Public browsing remains accessible without sign-in. Browser appearance preferences stay local to the browser. The hosting design targets zero additional monthly cost and accepts scale-to-zero cold starts and provider availability limits.

The project uses AI assistance with human direction, review and verification. Local fixtures, bounded measurements and earlier release checks each have specific evidence limits; they are not permanent production-health claims.

See [future plans](roadmap.md), [hosting](deployment.md), and [privacy](privacy-security.md).
