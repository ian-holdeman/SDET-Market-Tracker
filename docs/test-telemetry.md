# Trustworthy test telemetry

Curated local browser recordings are a separate demonstration feature; see [recording selection, reproduction, and public media policy](test-recordings.md). Their media and outcomes never enter the authoritative GitHub telemetry feed described here.

The separate [parallel pipeline replay](pipeline-replay.md) reads allowlisted job timing and reuses the selected attempt's sanitized browser artifact through `/api/test-pipeline`. It does not extend browser-case artifacts or alter dashboard result semantics.

## Publication and storage choice

GitHub Actions artifacts are the storage layer: no additional database, write endpoint, CI secrets or paid service is introduced. Small JSON artifacts use the repository's existing Actions storage allowance. The server reads GitHub's workflow metadata and matching sanitized artifacts. Public visitors never call Actions APIs directly and cannot trigger execution.

The trusted workflow is `.github/workflows/playwright.yml`. It runs browser/offline and database authorization jobs. Only push/workflow_dispatch/schedule runs of the configured repository and branch are displayed; fork/PR runs are excluded even when they have an identically named artifact. The workflow uploads `test-evidence-v1-<runId>-<runAttempt>` with overwrite disabled. Run completion and conclusions come from GitHub, never from a browser or ingestion exit code.

A cancellation, checkout failure, dependency failure, timeout or job failure may prevent artifact creation. GitHub's run remains visible; unavailable evidence never becomes zero tests passed or 100% success. A database job failure overrides an otherwise passing browser report at the workflow-status level. Counts are explicitly browser test counts, not database assertion counts.

## Configuration

### Nightly execution

The workflow uses GitHub's native `cron: '17 2 * * *'` with `timezone: 'America/Denver'`. It targets every night, including weekends, regardless of new commits or prior success for that SHA. There is no commit deduplication, clock gate, extra scheduler job or cancellation group. GitHub runs the latest default-branch commit; the workflow must be present on that branch and the server's configured trusted branch must match it (currently `main`). Existing push, PR and manual execution are preserved.

The complete existing Application baseline runs in two parallel jobs. `test` installs locked dependencies and browser engines, runs lint, both builds, offline checks and desktop Chromium/mobile WebKit, then attempts sanitized publication even after a test failure. `database` starts disposable runner-local Supabase, resets only that disposable database, and runs SQL tests/lint and real local Auth integration, with unconditional cleanup. Live-provider checks remain opt-in. The later suite audit is separate work and may propose adjustments; this change does not audit or reduce the baseline.

Scheduled events use the existing ingestion and history/activity readers. Repository, branch, workflow, commit, run and attempt checks retain their existing boundaries; the case contract is unchanged. Distinct nightly run IDs remain distinct even at the same SHA. The fixed historical replay validator and selected archive are unchanged. Ingestion/upload success is not suite success; the workflow conclusion preserves database failures while artifact counts remain browser-only.

**DST and delivery limits.** Ordinary targets are 08:17 UTC during daylight time and 09:17 UTC during standard time. On spring-forward Sunday, 02:17 does not exist: GitHub advances it to **03:00 local**, not 03:17. Fall-back repeats 01:00, so 02:17 occurs once after the transition. GitHub can delay or drop scheduled runs and disables public-repository schedules after 60 days without repository activity. No catch-up service or exact-time guarantee is provided. Use GitHub's existing [Actions notification preferences](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs) (optionally failed workflows only); scheduled notifications go to the last cron editor, or the person who re-enables a disabled workflow. No custom alerts or extra reporting job is introduced. These semantics were checked against [GitHub's official schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) on September 12, 2026.

**Zero-additional-spend feasibility.** Read-only public API inspection on September 12 confirmed a public repository with default branch `main`. The latest observed baseline, [run 34281678379](https://github.com/ian-holdeman/SDET-Market-Tracker/actions/runs/34281678379), used 7m25s for `test` and 1m41s for `database`: about 282 runner-minutes for 31 comparable nights. The existing 25/20-minute job deadlines bound that estimate at 1,395 runner-minutes for 31 nights, excluding reruns and other triggers. These are estimates from an older suite, not a benchmark of this change. Standard public-repository Ubuntu runners use GitHub's free allowance; no larger runners are introduced.

The most recent observed JSON artifact was 9,379 bytes; recent sanitized artifacts peaked at 9,435 bytes. Ninety nights at that size add about 0.85 MB with the unchanged 90-day retention. The reader already rejects artifacts above 1 MB, so 90 admitted nightly artifacts would be at most 90 MB, but that reader bound is not a storage billing cap. Pushes, reruns and other repositories/Packages also consume storage. [GitHub Free includes 500 MB shared artifact/Packages storage and a separate 10 GB repository cache allowance](https://docs.github.com/en/billing/concepts/product-billing/github-actions). This supports the existing zero-additional-spend design; account-wide usage, billing caps and cache settings were not accessible through public metadata and must be checked before activation. Do not enable paid overages or change billing settings as part of this work.

**Release proof still required.** The local implementation and fixtures are complete and owner-accepted on September 12, 2026. This acceptance does not establish a push, deployment or remote workflow execution. After an authorized release of both workflow and readers, verify the default branch, Actions enablement, current account storage headroom/zero-spend controls and notification recipient. Observe a genuine `event=schedule` run, including an unchanged previously passing commit: record its SHA, run/attempt, both job conclusions and matching sanitized artifact. Confirm Home and The Tests show that same attempt with honest metrics and that the activity dot follows in-progress/completed metadata. Retain any failures, missing artifacts or scheduler delays. Manual dispatch and local DST fixtures cannot establish actual scheduled publication. Nightly execution publishes evidence; application deployment remains separate.

### Current server configuration

Set these three server-only variables together in ignored `.env.local` or hosting secrets:

- `TEST_HISTORY_REPOSITORY`: `ian-holdeman/SDET-Market-Tracker`.
- `TEST_HISTORY_BRANCH`: the branch whose workflow is trusted (for example `main`; confirm the repository default).
- `TEST_HISTORY_TOKEN`: a fine-grained GitHub token restricted to that repository with **Actions: read** permission. Never place it in browser configuration or share it in chat.

No new GitHub Actions secret is required to upload artifacts: upload-artifact uses the job's built-in artifact service credentials. The workflow has only `contents: read` repository permission. No application secret or database production credential enters the workflow. Local database jobs use disposable local Supabase.

Protect the publishing branch and review workflow/test-source changes. Repository administrators remain part of the trust boundary. Configure token expiry/rotation operationally. No hosted service, branch protection, token, deployment or push is created by these repository changes.

## Contract and ingestion

`src/telemetry/contract.ts` defines and validates version 1. Evidence contains source environment, full commit SHA, GitHub run ID and attempt, collection/start/end timestamps, runner status, error count, complete collected test inventory, relative source path, project, and zero to two attempts per test. Each attempt has its index, actual execution status, start and duration. UI summaries are derived, not accepted as caller-supplied counters.

The custom Playwright reporter records the planned inventory in `onBegin`, checkpoints atomically after each test attempt/error, and marks completion only in `onEnd`. Interrupted processes therefore leave incomplete evidence. Missing attempts cannot silently disappear from the denominator. The contract rejects duplicate test IDs, inventory/count mismatch, impossible retry sequences, more than one retry, invalid timestamps, unsupported schema versions and mismatched provenance. Expected-failure annotations do not turn actual failed executions into clean passes.

`npm run test:e2e:ingest` validates `.telemetry/input.json` and writes `.telemetry/local/telemetry.json`. That location is ignored and is never served. CI passes `--github`, requiring a trusted event and exact run/attempt/SHA match, then writes `.telemetry/publish/telemetry.json`. Reprocessing the same valid evidence produces identical JSON. Missing/malformed evidence produces an incomplete, zero-inventory envelope and a nonzero exit status. An interrupted valid report stays incomplete. Neither validation success nor artifact upload success means tests passed.

Only allowlisted fields survive validation. Raw logs, stdout/stderr, assertion messages, stack traces, attachments, screenshots, recordings, traces, HTML and environment variables are excluded. Test titles and relative filenames come from reviewed source and must not contain secrets or personal data. Raw local Playwright diagnostics are never uploaded by this workflow.

## Outcome semantics

| Evidence | Display |
| --- | --- |
| Passed on first attempt | passed, included in Pass Rate numerator |
| Failed/timed out, passed on one retry | flaky, both attempts visible, excluded from Pass Rate numerator |
| Failed again on retry | failed, both attempts visible |
| Skipped without execution | skipped |
| Interrupted test/runner | interrupted |
| Collected but no result, missing end, empty collection | incomplete |
| GitHub cancellation | cancelled, regardless of previous test passes |
| Missing/invalid/expired artifact | no test counts or success rate; workflow remains visible |

A failed retry remains failed, rather than being relabeled flaky. The retry history is always visible. The UI label is **Pass Rate**. Its calculation is first-attempt passes / all collected test-project cases, including skipped, interrupted and unexecuted cases. Zero collected tests means unavailable rate, never 100%. Timed-out executions remain `timedOut` in attempt details and failed at test level. Workflow failure can coexist with a 100% browser Pass Rate when another CI job failed; the workflow status remains failed.

## Ordering, retention and retrieval

Latest identity is derived from run ordering, including when cached in a snapshot. Sort by GitHub workflow run number descending, then attempt descending. An old run finishing late or being rerun cannot displace a newer run. Latest attempt is the first entry; latest completed workflow attempt is the first completed entry, even when its evidence is missing. This is intentionally distinct from latest passing run.

The default table shows up to five recent completed attempts with usable test evidence, including failed and flaky results. Empty attempts remain in the history modal. If the newest attempt lacks usable results, a warning identifies it and labels any displayed metrics as previous results. Home identifies the newest attempt and may display explicitly labeled previous usable metrics. Shared presentation functions keep metric calculations consistent; Duration measures report start to completion, not the sum of parallel test durations.

History loads in pages of at most five attempts, including older reruns. A creation-time cursor bounds the workflow search and prevents newly created runs shifting subsequent pages; records are deduplicated by run ID and attempt. Initial dashboard discovery is limited to five pages. Load older runs in the modal to continue beyond that window. GitHub's filtered workflow search exposes at most 1,000 workflow runs; the modal reports this limit if reached. This is retained history, not a permanent archive. JSON artifacts retain for 90 days subject to repository policy; expired/deleted artifacts leave workflow metadata with unavailable evidence. Artifact discovery is bounded to the first 100 artifacts per workflow run; unusually artifact-heavy runs may show evidence as missing. Storage or upload failures never produce fabricated results.

`GET /api/test-history` has no write counterpart. Retrieval is bounded by timeout, response/decompression limits and a fixed repository/workflow. The configured latest route uses the persistent snapshot service described below, with a 15-second refresh cooldown. Cursor pages retain a bounded 100-entry process cache with 60-second reuse. Invalid cursors are rejected before contacting GitHub. Only GitHub receives the read credential; signed artifact storage downloads receive no authorization header. ZIP content is read in memory with the patched decoder, never extracted onto disk. Invalid artifact content is labeled invalid; upstream network/auth/rate failures produce a retrieval error or retain previous results with an explicit stale label. Manual refresh performs a request; it does not pretend to run tests or bypass the server cache.

The UI distinguishes initial loading, no verified runs, retrieval failure and stale retained data. The home card and Tests page use the same validated feed and summary functions. There are no simulated execution controls, fabricated traces, hard-coded passing suite counts or synthetic refresh timestamps.

## Validation and remaining deployment work

- The nightly local slice passed Node 22 lint, `build:e2e`, the offline baseline, focused Logic/navigation/activity/history browser checks on desktop Chromium and mobile WebKit, actionlint 1.7.12, and the restored normal build. Logic captures were reviewed in both palettes. New regressions first demonstrated schedule rejection in publication, ingestion, history and activity; they now cover unchanged SHA identities, prior-attempt provenance, missing/failure/retry evidence and native timezone boundary fixtures. DST fixtures verify timezone conversion and workflow configuration, not GitHub scheduler delivery.
- The first sandbox test attempt could not resolve the Windows user; execution outside that sandbox reproduced the intended failures. The locked `npm ci` initially hit a development-server file lock and succeeded after releasing it. Browser checks passed without retries; the existing `NO_COLOR`/`FORCE_COLOR` warning and dependency deprecation notice were retained. No SQL/Auth code or job commands changed, so live local database/Auth suites were not rerun for this event-only extension. No retained owner database was reset, and no live provider or remote workflow was invoked.
- Offline tests exercise the contract, calculations, missing-report ingestion, provenance, cancellation, artifact decoding, ordering, cache and stale behavior.
- Browser tests simulate GitHub/API responses to prove public UI states and preservation of attempt history. Existing auth/market workflows remain covered.
- SQL tests and disposable local Auth/PostgREST integration tests prove real ownership and curation boundaries; browser mocks do not.
- Workflow syntax can be checked with actionlint. Local execution is not proof that GitHub artifact upload/download permissions or retention work.
- Read-only GitHub retrieval of published results was verified during development. For each new change, inspect its actual trusted workflow run before claiming publication; local checks and a previously successful run do not verify a later commit. Existing hosted configuration and persistence checks are recorded in [deployment](deployment.md); each new release still needs its own verification.

No live-provider contract check runs in the deterministic CI gate. Yahoo availability/accuracy and telemetry correctness are separate claims. Firebase and its dependency tree have been removed. Reassess dependency advisories with a current audit; see [maintenance considerations](roadmap.md).

Official references: [GitHub workflow search and pagination](https://docs.github.com/en/rest/actions/workflow-runs), [Playwright Reporter lifecycle](https://playwright.dev/docs/api/class-reporter), [retry attempt data](https://playwright.dev/docs/api/class-testresult), [GitHub artifact API](https://docs.github.com/en/rest/actions/artifacts), [workflow artifacts and retention](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts).


## Background refresh

Visible Home and Tests views refresh current results every 15 seconds and on returning to the tab. Requests in progress are shared and never overlapped by the poller. Validated results remain in memory across navigation, so returning to a card displays its last retrieved evidence immediately while checking for updates. Refresh failures retain that evidence with the existing warning; an initial load without evidence uses skeleton metric tiles. This browser memory cache is not persisted or published; the separate server snapshot is persisted as described below.

Initial recent-result discovery still scans at most five pages; routine refresh updates the latest page and retains previously discovered older records. Entering the dashboard performs bounded recent-result discovery; requested older pages are revalidated subject to their cache TTL. The server rechecks workflow/artifact metadata and caches at most 32 validated reports for five minutes to avoid repeated signed ZIP downloads. Expired or missing artifacts are respected before that cache is used. A cold startup with no valid persisted snapshot must still obtain its first evidence from GitHub. Saved evidence can be served immediately on later starts; current status is not an instantaneous push notification.


## Persistent cold-start snapshots

The snapshot envelope contains only a validated feed, version, repository/branch scope and original retrieval time. It is limited to 4 MB and rejected after 90 days. Snapshots are caches, never publication authorities: successful source revalidation replaces the head window including removals and expired evidence. A failed refresh retains original timestamps with an explicit stale state; write failure is logged without claiming durability.

Local mode uses an ignored private directory, default .telemetry/snapshots, with flushed temporary files and atomic rename. Only one process may write that directory. Cloud Run instead requires TEST_SNAPSHOT_BUCKET and uses private generation-conditional Cloud Storage writes. Each writer captures its generation before upstream retrieval; a late writer cannot overwrite a newer result. Keys hash repository/branch scope. Reads validate byte bounds, CRC32C, scope and timestamps; missing/corrupt/denied storage falls back to bounded live retrieval. Application users receive no bucket permissions.

Initialization starts inside the first request. Under request-based Cloud Run CPU, the initiating and coalesced requests await refresh and persistence before responding; they cannot rely on CPU after response completion. Local long-running mode retains its background refresh behavior. Cold boot/redeploy reloads only a valid saved snapshot. An abrupt kill can leave an operation unconfirmed, but conditional atomic writes preserve the prior stored generation. The snapshot lifecycle deletes only objects under snapshots/ older than 90 days; cache versioning is disabled to avoid retaining every refresh.

An independently published archive serves only the curated historical pipeline demonstration. It is not a way to extend live cache expiry, invent recent activity, duplicate metrics or restore a deleted latest run. See [archive publication and revocation](pipeline-replay.md#explicit-historical-archive) and [deployment](deployment.md). Local concurrency/corruption/expiry and real-SDK fixture tests do not establish actual hosted storage IAM or recovery.

The Automation Dashboard uses a static bold lightning bolt with two trailing speed lines. It is decorative and does not indicate live execution.
