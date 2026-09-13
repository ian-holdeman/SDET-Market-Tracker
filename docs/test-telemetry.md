# Test evidence and results

The Tests and Home summarize results published by trusted GitHub Actions runs. Recorded demonstrations and historical replay are separate forms of evidence.

## What a result means

| Outcome | Meaning |
| --- | --- |
| Passed | Passed on the first attempt |
| Flaky | Failed initially and passed on the single permitted retry |
| Failed | Failed without a successful retry |
| Skipped or interrupted | Did not complete a normal successful execution |
| Incomplete or unavailable | Collected results are missing, invalid or insufficient |

Pass Rate is first-attempt passes divided by all collected test-project cases, including skipped, interrupted and unexecuted cases. An empty collection has no success rate. Retry history remains visible.

Workflow outcome and browser-case counts are distinct. A database-job failure can make a workflow fail even when its browser cases passed. Artifact ingestion or upload success does not establish test success.

## Source and freshness

Published results retain their repository, commit, run, attempt and original timestamps. The newest workflow attempt remains the latest identity even when its results are missing; earlier usable metrics are labelled as previous results.

Saved snapshots are validated caches, not publication authorities. Home can show saved evidence with its age and “Checking for updates.” while fresh verification completes. Successful verification replaces removed or expired results; failures retain eligible evidence with a warning. Snapshots are limited to 90 days and do not acquire new observation times on retrieval.

The separately retained historical archive is labelled historical and excluded from rolling metrics. It cannot substitute for a missing latest run. Visitors cannot trigger execution.

## Nightly execution

The workflow targets 2:17 a.m. America/Denver every day, including weekends and unchanged commits. Browser/offline checks and database authorization checks have separate job outcomes. Test publication is separate from application deployment.

GitHub scheduling can be delayed or missed. Spring-forward advances the nonexistent 02:17 local time to 03:00; fall-back does not repeat the 02:17 schedule. These scheduling semantics were checked against [GitHub's official documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) on September 12, 2026.

Local fixtures and manual dispatch do not prove genuine scheduled publication. Current status requires evidence from the specific trusted run; earlier successful runs do not verify later commits.

## Initial-load measurements

September 12, 2026 measurements separated time to saved evidence from time to fresh verification.

| Controlled observation | First usable evidence | Fresh verification |
| --- | --- | --- |
| Server with persisted fixture and 1,200 ms injected upstream delay | 1,232 ms before; 54 ms after | 1,265 ms after |
| Desktop Chromium, both palettes, delayed API fixture | 1,570–1,597 ms before; 211–216 ms after | 1,399–1,404 ms after |
| Mobile WebKit, both palettes, delayed API fixture | 187–207 ms after; no pre-change mobile measurement | 1,398–1,406 ms after |

The server experiment reduced time to saved evidence by 95.6%. These local fixture measurements do not predict full-page hosted cold starts. A separate existing hosted API sample took 7,237 ms initially and 188 ms immediately afterward; it did not isolate Cloud Run startup or verify the later local change.

## Evidence limits

Browser mocks establish application behavior. Database integration checks establish different authorization boundaries, and live-provider observations establish point-in-time external availability. None alone proves universal reliability, accessibility, financial accuracy or current production health.

See [test coverage](test-audit-implementation.md), [recordings](test-recordings.md), [pipeline replay](pipeline-replay.md), and [hosting](deployment.md).
