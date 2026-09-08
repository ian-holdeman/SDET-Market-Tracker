# Trustworthy test telemetry

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
| Passed on first attempt | passed, included in clean-pass count |
| Failed/timed out, passed on one retry | flaky, both attempts visible, excluded from clean passes |
| Failed again on retry | failed, both attempts visible |
| Skipped without execution | skipped |
| Interrupted test/runner | interrupted |
| Collected but no result, missing end, empty collection | incomplete |
| GitHub cancellation | cancelled, regardless of previous test passes |
| Missing/invalid/expired artifact | no test counts or success rate; workflow remains visible |

A failed retry remains failed, rather than being relabeled flaky. The retry history is always visible. Clean pass rate = first-attempt passes / all collected test-project cases, including skipped, interrupted and unexecuted cases. Zero collected tests means unavailable rate, never 100%. Timed-out executions remain `timedOut` in attempt details and failed at test level. Workflow failure can coexist with a 100% browser clean-pass rate when another CI job failed; the workflow status remains failed.

## Ordering, retention and retrieval

No mutable latest pointer exists. Sort by GitHub workflow run number descending, then attempt descending. An old run finishing late or being rerun cannot displace a newer run. Latest attempt is the first entry; latest completed workflow attempt is the first completed entry, even when its evidence is missing. This is intentionally distinct from latest passing run.

The dashboard considers the newest five trusted workflow runs from the first twenty branch-filtered API results, retaining up to two attempts of each. This is a bounded recent-history view, not a full archive. JSON artifacts retain for 90 days (subject to repository policy); after expiry, workflow metadata remains visible within the recent-history window with evidence marked expired/missing. Older attempts remain inspectable in GitHub while retained there. Storage limits or artifact-upload failures produce missing evidence, not fabricated fallback results.

`GET /api/test-history` has no write counterpart. Retrieval is bounded by timeout, response/decompression limits and a fixed repository/workflow. A 60-second process cache deduplicates concurrent loads. Only GitHub receives the read credential; signed artifact storage downloads receive no authorization header. ZIP content is read in memory with the patched decoder, never extracted onto disk. Invalid artifact content is labeled invalid; upstream network/auth/rate failures produce a retrieval error or retain previous results with an explicit stale label. Manual refresh performs a request; it does not pretend to run tests or bypass the server cache.

The UI distinguishes initial loading, no verified runs, retrieval failure and stale retained data. The home card and Tests page use the same validated feed and summary functions. There are no simulated execution controls, fabricated traces, hard-coded passing suite counts or synthetic refresh timestamps.

## Validation and remaining deployment work

- Offline tests exercise the contract, calculations, missing-report ingestion, provenance, cancellation, artifact decoding, ordering, cache and stale behavior.
- Browser tests simulate GitHub/API responses to prove public UI states and preservation of attempt history. Existing auth/market workflows remain covered.
- SQL tests and disposable local Auth/PostgREST integration tests prove real ownership and curation boundaries; browser mocks do not.
- Workflow syntax can be checked with actionlint. Local execution is not proof that GitHub artifact upload/download permissions or retention work.
- After review/authorized push, run the updated workflow on the trusted branch, configure the read-only token on the app server, and verify an actual run, retry, failure and missing-artifact case. These remote steps are not completed by local checks.

No live-provider contract check runs in the deterministic CI gate. Yahoo availability/accuracy and telemetry correctness are separate claims. Existing Express/qs dependency advisories and bundle-size warnings remain outside this focused change; Firebase and its dependency tree have been removed.

Official references: [Playwright Reporter lifecycle](https://playwright.dev/docs/api/class-reporter), [retry attempt data](https://playwright.dev/docs/api/class-testresult), [GitHub artifact API](https://docs.github.com/en/rest/actions/artifacts), [workflow artifacts and retention](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts).
