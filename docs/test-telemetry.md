# Trustworthy test telemetry

Curated local browser recordings are a separate demonstration feature; see [recording selection, reproduction, and public media policy](test-recordings.md). Their media and outcomes never enter the authoritative GitHub telemetry feed described here.

The separate [parallel pipeline replay](pipeline-replay.md) reads allowlisted job timing and reuses the selected attempt's sanitized browser artifact through `/api/test-pipeline`. It does not extend browser-case artifacts or alter dashboard result semantics.

## Publication and storage choice

GitHub Actions artifacts are the storage layer: no additional database, write endpoint, CI secrets or paid service is introduced. Small JSON artifacts use the repository's existing Actions storage allowance. The server reads GitHub's workflow metadata and matching sanitized artifacts. Public visitors never call Actions APIs directly and cannot trigger execution.

The trusted workflow is `.github/workflows/playwright.yml`. It runs browser/offline and database authorization jobs. Only push/workflow_dispatch runs of the configured repository and branch are displayed; fork/PR runs are excluded even when they have an identically named artifact. The workflow uploads `test-evidence-v1-<runId>-<runAttempt>` with overwrite disabled. Run completion and conclusions come from GitHub, never from a browser or ingestion exit code.

A cancellation, checkout failure, dependency failure, timeout or job failure may prevent artifact creation. GitHub's run remains visible; unavailable evidence never becomes zero tests passed or 100% success. A database job failure overrides an otherwise passing browser report at the workflow-status level. Counts are explicitly browser test counts, not database assertion counts.

## Configuration

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

- Offline tests exercise the contract, calculations, missing-report ingestion, provenance, cancellation, artifact decoding, ordering, cache and stale behavior.
- Browser tests simulate GitHub/API responses to prove public UI states and preservation of attempt history. Existing auth/market workflows remain covered.
- SQL tests and disposable local Auth/PostgREST integration tests prove real ownership and curation boundaries; browser mocks do not.
- Workflow syntax can be checked with actionlint. Local execution is not proof that GitHub artifact upload/download permissions or retention work.
- Read-only GitHub retrieval of published results was verified during development. For each new change, inspect its actual trusted workflow run before claiming publication; local checks and a previously successful run do not verify a later commit. Hosted configuration and persistence remain deployment work.

No live-provider contract check runs in the deterministic CI gate. Yahoo availability/accuracy and telemetry correctness are separate claims. Firebase and its dependency tree have been removed. Reassess dependency advisories with a current audit; see [maintenance considerations](roadmap.md).

Official references: [GitHub workflow search and pagination](https://docs.github.com/en/rest/actions/workflow-runs), [Playwright Reporter lifecycle](https://playwright.dev/docs/api/class-reporter), [retry attempt data](https://playwright.dev/docs/api/class-testresult), [GitHub artifact API](https://docs.github.com/en/rest/actions/artifacts), [workflow artifacts and retention](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts).


## Background refresh

Visible Home and Tests views refresh current results every 15 seconds and on returning to the tab. Requests in progress are shared and never overlapped by the poller. Validated results remain in memory across navigation, so returning to a card displays its last retrieved evidence immediately while checking for updates. Refresh failures retain that evidence with the existing warning; an initial load without evidence uses skeleton metric tiles. This browser memory cache is not persisted or published; the separate server snapshot is persisted as described below.

Initial recent-result discovery still scans at most five pages; routine refresh updates the latest page and retains previously discovered older records. Entering the dashboard performs bounded recent-result discovery; requested older pages are revalidated subject to their cache TTL. The server rechecks workflow/artifact metadata and caches at most 32 validated reports for five minutes to avoid repeated signed ZIP downloads. Expired or missing artifacts are respected before that cache is used. A cold startup with no valid persisted snapshot must still obtain its first evidence from GitHub. Saved evidence can be served immediately on later starts; current status is not an instantaneous push notification.


## Persistent cold-start snapshots

The single Node server now keeps a sanitized snapshot of its latest history page in an ignored private file. TEST_SNAPSHOT_DIRECTORY overrides the default .telemetry/snapshots directory (relative to the process working directory). Files are named by a hash of repository and branch; tokens are never part of file names or contents. Only validated feed fields are stored. The envelope has its own version and scope, a 4 MB limit, and a 90-day maximum retrieval age. Missing/corrupt/unsupported/out-of-scope snapshots are discarded. A temporary file is flushed and atomically renamed; generation ordering prevents an older scheduled write replacing a newer one. Only one server process should write a directory.

GET /api/test-history without a cursor serves the file-backed snapshot immediately and starts one background refresh. No snapshot returns pending empty evidence, not a passing result. While refreshing, visible clients poll the inexpensive memory response every two seconds; otherwise they retain the 15-second interval. Successful revalidation replaces the previous head window, including removals and expired evidence; older paginated records are revalidated when retrieved. A failed refresh preserves the original fetchedAt and marks the returned evidence stale. Persistence failures are logged server-side and leave validated in-memory service available. Neither failure rewrites an old retrieval timestamp. Snapshot data is labeled saved/updating; it is not a new authoritative publication.

Home may show previous usable metrics while a newer attempt is incomplete, explicitly labeled with their run number; its footer still identifies the newest attempt and outcome. Skeleton values reserve tile dimensions, and changed values fade for 180 ms only when reduced motion is not requested. First installation with no verified snapshot must still obtain its first result from GitHub.

No hosting is configured. Local files survive a Node restart, but an ephemeral/serverless filesystem may disappear on restart or redeploy. For this implementation, configure a private persistent volume and TEST_SNAPSHOT_DIRECTORY on a single long-running Node instance; do not place it under served assets or commit populated snapshots. Read-only/ephemeral hosting and multi-instance deployment require a durable store with conditional writes before promising restart persistence. No resource or deployment was created. Browser simulations establish presentation behavior; temporary-directory HTTP tests establish local persistence and ordering, not hosted-volume durability.

The Automation Dashboard uses a static bold lightning bolt with two trailing speed lines, distinct from The Tests terminal icon. It is decorative and does not indicate live execution; the heading retains its existing size and spacing.
