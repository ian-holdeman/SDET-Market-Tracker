# Parallel pipeline replay

Status: initial draft complete and owner-accepted. This milestone covers the timeline and sanitized browser-results feed; it does not establish deployment or publication of the local changes.

The section beneath the recorded test monitor presents the two existing jobs from one selected successful GitHub Actions attempt. It is a historical job timeline, not live activity, a CI dispatcher, or a full-suite test-case report. A compact browser-results feed uses the same selected attempt. The Automation Dashboard remains the source for current suite results. No workflow restructuring or additional containers are part of this feature.

## Selected source and trust

`src/telemetry/pipeline.ts` pins the repository, branch, workflow path/ID, run ID/number, attempt, and commit for the featured run. The initial selection is [Application baseline #25, attempt 1](https://github.com/ian-holdeman/SDET-Market-Tracker/actions/runs/34213740343/attempts/1), at commit `4046057df107ebda1342f435a03249ae7a656a7f`. A selected identity is not a stored successful result: current source metadata must validate before the server serves a replay.

`server/test-pipeline.ts` reads two GitHub REST resources: the exact run attempt and its jobs (`/actions/runs/{run_id}/attempts/{attempt}` and the corresponding `/jobs?per_page=100`). These metadata requests and the subsequent browser-artifact retrieval share a ten-second deadline. Metadata requests reject redirects and cap each response at 300 KB; artifact handling is described below. They use the existing server-only history configuration and Actions-read token. No new permissions, workflow artifacts, database, public credential, or paid infrastructure are introduced.

Validation requires the configured and pinned repository/branch, matching source and head repositories, trusted push/workflow_dispatch event, workflow identity, commit, exact attempt, and successful completed run/jobs. Exactly the existing `test` and `database` jobs must be present with distinct IDs, matching run/attempt/commit, and valid ordered UTC timestamps. Invalid or missing timing never becomes zero. Zero-duration intervals remain legitimate; no overlap is represented as zero rather than invented concurrency.

Only allowlisted run identity, source link, successful job identity/outcome, timestamps, verification expiry, and the existing sanitized browser evidence leave the server. Raw job responses, steps, logs, runner names, tokens, and diagnostics are not served. This is a separate, narrowly scoped metadata endpoint; the browser-case artifact contract and GitHub publication workflow remain unchanged.

## Retrieval and retention

`GET /api/test-pipeline` has no write counterpart and accepts no visitor-selected source. One in-memory cache entry coalesces concurrent requests, reuses verified evidence for at most sixty seconds, and applies a fifteen-second failure cooldown. Missing configuration returns 503; invalid, deleted, inaccessible, or expired source metadata returns 502 without cached success. Responses use `Cache-Control: no-store`. There is no disk snapshot or static successful fallback for this feature.

The client bounds response size to 1.1 MB, validates again, has a twelve-second abort deadline, revalidates expired evidence in the background, and cancels work on unmount. Returning to a suspended tab revalidates the source. During the bounded request, the last verified historical timeline remains mounted with a small source-check label. A confirmed failure or the twelve-second deadline removes it and offers retry; it is never retained indefinitely after a failed check. Unchanged run/job evidence preserves playback, slider focus, and layout across verification timestamps. Changed run/job evidence resets the replay to the completed overview. The original job timestamps never become the verification timestamps.

GitHub source availability governs retention. The ninety-day browser artifact expiry removes the browser-results feed independently of job metadata availability. Removing a selected run or access to it makes the replay unavailable after the bounded revalidation interval. Replace the selection deliberately after inspecting a new successful attempt, its two jobs, actual overlap, and the workflow at its commit. Do not auto-select the latest success or silently change the showcased execution. Review changed job topology before extending the contract.

## Presentation and timing

The section is labelled **CI Job Timeline** with a plain horizontal bar-chart icon. Prefer literal, descriptive headings and conventional imagery for this feature.

The initial state is a static completed overview. Emphasize the job window, overlap, and job durations; let the shared bars and axis convey start/end positions. Exact offsets remain available to screen readers without visible per-lane captions. Keep the visible speed label short and replay-state announcements offscreen except for actionable reduced-motion guidance. Two horizontal lanes share the same origin and scale at every screen size; job labels and durations sit above the bars. The full window is the earliest job start to the latest job completion, excluding time before the first job and after the last. Overlap is the intersection of job intervals, not an estimated speedup. Job duration includes setup and cleanup, and is not the browser-test duration or a sum of test-case durations.

Replay runs at an explicitly labelled 20× scale, with pause/resume and a native keyboard-accessible position slider. Replay starts again after completion; the slider returns to the start without a separate Restart control. Time advances from measured monotonic elapsed time rather than timer callback counts. Replay is user-initiated, stops at the end, and pauses when the page is hidden. Text identifies Not started, In progress, and Succeeded in the historical replay; color is supplemental. Reduced motion disables automatic replay while preserving the static overview and manual slider. Decorative bars are hidden from assistive technology; job labels, outcomes, durations, and slider value text carry the information.

The browser/offline job runs directly on a GitHub Ubuntu runner. The database/Auth job starts disposable local Supabase containers on a separate runner. These responsibilities describe the inspected workflow, not inferred per-step execution: job success alone does not prove every step ran. The first slice intentionally features only a successful execution. Failure fixtures exercise resilience in tests and are never public demonstration evidence.

## Reproduction and checks

Use Node from `.nvmrc` and locked dependencies. For a read-only real-source check, configure the existing history variables in ignored local configuration, then run:

```sh
npm run test:pipeline:live
```

This validates the pinned run against GitHub and saves only sanitized evidence to ignored `.telemetry/pipeline/verified.json` for local inspection. That file is neither served nor a fallback; its verification expires. The command does not dispatch CI or change remote data. Never put credentials in command arguments or paste raw authenticated API responses into a public artifact.

For deterministic checks:

```sh
npm run lint
npm run test:baseline
npm run build:e2e
npm run test:e2e -- src/tests/specs/the-tests/pipeline.spec.ts src/tests/specs/telemetry/history.spec.ts src/tests/specs/the-tests/showcase.spec.ts --workers=2
npm run build
```

Offline checks cover provenance, timestamp normalization, duration/overlap calculations, retry-independent attempt identity, invalid/oversized responses, expiry, and request coalescing. Browser fixtures cover overview/replay transitions, keyboard operation, reduced motion, unavailable/invalid evidence, expiry, deadlines, and cleanup. Replay regressions use the same fixed clock for page time and evidence verification, with automatic clock advancement paused before replay actions. Cover seeking backward as well as forward, and assert that background verification preserves player identity and focus. Browser fixtures do not establish real GitHub availability; run the opt-in read-only command separately. Inspect desktop/mobile renderings and verify the normal server route after a restart when server code changes. Hosted behavior and physical-device compatibility remain separate verification boundaries.

## Browser results

The accepted scope is browser cases only; expanding offline/database/Auth case reporting is deferred. Their existing job summaries remain. No CI configuration, permissions, or artifact publication schema changed.

After checking the pinned attempt and jobs, the server lists that run's artifacts and uses the shared history artifact reader to download the exact `test-evidence-v1-{runId}-{attempt}` ZIP. These additional requests share the ten-second deadline. The signed storage request receives no GitHub token, rejects redirects, and accepts only the existing trusted storage hosts. ZIP and extracted telemetry are bounded to 1 MB; only `telemetry.json` is decoded and its allowlisted fields survive validation. No stdout, SQL, errors, traces, attachments, runner names, or environment values are public. The pipeline's sixty-second cache covers the result; each revalidation checks upstream artifact availability again. Missing, expired, invalid, or unreachable browser evidence clears the case feed while retaining independently verified job timing.

The client revalidates the artifact's run, attempt, commit, GitHub environment, and report/attempt intervals inside the browser job. Results appear at the final attempt's recorded start plus duration, sorted by completion time. Retries keep their original outcome semantics: flaky successes are not clean passes. Cases without attempts remain in the denominator without invented completion times. Empty or unavailable evidence never displays a successful 0/0 counter.

The default view shows a pass counter and the latest four completed cases, with project labels distinguishing desktop/mobile executions. A bounded disclosure exposes every completed case. Pause, replay, and backward seeking derive the list afresh from the shared clock. Fixed-height recent results prevent page movement; there is no animated scrolling or per-row live announcement. Only the concise counter uses a polite status region. The completed overview is the default, and reduced-motion visitors can explore with the existing slider. Test names are repository-authored public labels; provider calls are mocked, and browser results do not prove database authorization or real OAuth-provider behavior.
