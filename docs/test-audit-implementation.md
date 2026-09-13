# Test coverage and evidence boundaries

The project uses complementary verification layers rather than treating one passing suite as proof of every boundary.

## Coverage

| Area | Scenarios |
| --- | --- |
| Market browsing | Search, category/numeric ordering, filters, unavailable values and navigation |
| Charts and calculations | Session changes, calendar returns, zero/negative values, stale responses and delayed timeframe results |
| Watchlists and accounts | Save/reload/remove-one, bulk clear, cross-user isolation, role boundaries, deletion and recreated identities |
| Failure and concurrency | Uncertain writes, recovery, duplicate requests, stale responses and account changes during in-flight operations |
| Test evidence | Provenance, retry history, missing/expired artifacts, saved snapshots, removals and historical-archive independence |
| Interface behavior | Keyboard dialogs, focus restoration, responsive layouts, palette changes and mounted chart/player continuity |
| Documents and media | Decoded PDF/video content, selectable text, explicit downloads and recovery from loading failures |

## What each layer establishes

Deterministic tests check parsing, financial calculations and boundary behavior using controlled inputs. Browser tests exercise application interactions with isolated synthetic dependencies in desktop Chromium and mobile WebKit.

Database and disposable authentication integration tests separately exercise grants, row-level security, ownership and deletion effects. Live-provider checks observe external availability and selected response properties at a particular time.

Published GitHub evidence preserves workflow identity, original attempts, failures and missing outcomes. Curated recordings remain separate demonstrations.

## Limits

Browser fixtures do not prove real Google OAuth, database authorization, independent market accuracy or GitHub scheduler delivery. Sampled contrast and viewport checks are not an exhaustive accessibility audit. Current CI and hosted health require evidence for the specific run and deployed revision.

No universal coverage percentage, financial-accuracy guarantee or permanent green baseline is claimed. See [test results](test-telemetry.md), [recordings](test-recordings.md), and [hosting evidence](deployment.md).
