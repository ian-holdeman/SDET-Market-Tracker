# Recorded test showcase

The Tests page uses one player and four accessible tabs beneath the Automation Dashboard: watchlist re-login, chart session handoff/stale recovery, Settings clear/cancel/failure/recovery, and history pagination/nested details. These are curated local executions of existing browser tests. Their selected outcomes are not current CI status. The separate [pipeline replay](pipeline-replay.md) uses genuine GitHub job timing rather than browser video.

The refreshed lineup and final empty-Watchlist ending are complete and owner-accepted locally on September 12, 2026. Hosted verification for this update remains separate.

## Selection and evidence limits

The watchlist recording uses WebKit with an iPhone 13 viewport; the remaining clips use desktop Chromium. WebKit device emulation is not a physical iPhone. The scenarios and exact test names live in `scripts/showcase-scenarios.mjs`. Browser playback, summaries, readable steps, and limitations live in `src/components/the-tests/RecordedShowcase.tsx` and `showcase.ts`.

All account/provider/history responses are mocked. The browser executes real application code and assertions, but displayed prices, workflow identities, and outcomes inside a clip are fixtures. Shared offline market fixtures supply consistent quotes, charts, and price-activity metrics so the watchlist runs in a populated application. They are synthetic examples, not provider observations. Scenario failures remain intentional. The Settings recording ends on the authenticated empty Watchlist tab after clear succeeds, with the shared Board retained. Settings/history details explain the two-asset AAPL/MSFT fixture. The original cold-start and safe-deletion scenarios remain automated, outside the four-slot recording selection. Chart session dates and clock progression are controlled fixtures. Real Auth/PostgREST registration, RLS, deletion cascades, and recreated-identity isolation belong to the existing local integration suite. Nightly replay represents those checks through the independently verified database job, without claiming individual case evidence from job success.

Clips retain natural speed, loading, and transitions; no sleeps or artificial actions lengthen them. Capture teardown waits for finite page animations and a painted final frame so a passing assertion does not leave the video ending mid-transition. Video duration includes recorder setup/teardown and differs from reported test duration. Visitors may pause, seek, use native fullscreen where available, or choose 0.5×/1×/2× playback. Silent recordings have a readable scenario description and step sequence in **About this test**.

## Capture preparation

Before recording the full lineup, prove one representative clip renders correctly through the real player in desktop Chromium and mobile WebKit. Check decoded dimensions/readiness, on-demand loading, and playback controls; an advancing clock alone is insufficient. This catches codec and delivery incompatibilities before expensive recaptures.

Populate incidental services with coherent test fixtures rather than making every dependency unavailable. Verify that scenario-specific page routes do not shadow the capture fallback: the Auth mock explicitly delegates market requests to the shared capture fixture. Wait for meaningful rendered state and finite transitions, not arbitrary delays. Inspect complete clips and posters for readability as well as private data. A technically passing run can still be a poor demonstration.

Cosmetic changes outside the demonstrated behavior do not require automatic recapture. Keep each recording's actual source provenance intact; regenerate when behavior, fixture assumptions, or explanatory claims materially change.

## Reproduce and review

Use Node 22, locked npm dependencies, installed Playwright Chromium/WebKit binaries, and FFmpeg with the libx264 encoder. No Docker, real account, provider credentials, or additional service is required for capture.

```sh
# Set SHOWCASE_FFMPEG to an FFmpeg executable with libx264.
npm run record:showcase -- --scenario=watchlist
# Prepare and prove this representative clip through the actual player first.
npm run record:showcase:prepare
npm run record:showcase
npm run record:showcase:prepare
# Review the complete clips, posters, and private extracted frames first.
npm run record:showcase:prepare -- --reviewed
npm run build
```

For example, in PowerShell set `$env:SHOWCASE_FFMPEG` to the absolute path to your FFmpeg executable. The minimal encoder shipped with Playwright can capture WebM but cannot encode the public H.264 clips. A project-local full FFmpeg binary is sufficient; no machine-wide installation is needed. Preparation currently labels the capture environment as Windows; update that label when capturing on another OS.

The capture command builds the fake-config browser target, runs only the selected scenarios with one worker and at most one retry, and restores the normal build in `finally`. It requires exclusive access to port 3100 and shared `dist`; never run it alongside another browser suite or build. The dedicated server starts from an empty temporary directory with an allowlist of OS environment variables, preventing personal dotenv configuration from loading. A shared browser fixture blocks external requests and supplies synthetic market responses via `src/tests/fixtures/showcase-market.ts`; unknown APIs remain unavailable. The Auth mock delegates market requests to the same fixture in capture mode. Scenario-specific mocks take precedence. Ordinary browser tests use the same isolated server and default interception; scenario routes override it. Browser diagnostic output is stored in unique run directories, with separate retry paths.

Each invocation writes a new private directory under `.telemetry/showcase/`; `latest.json` points preparation at the newest invocation. Captures retain all attempts, actual statuses, start times, durations, video hashes, a HEAD revision, and whether the worktree had local changes. A SHA-256 fingerprint covers captured source-file hashes; the exact included sources are privately archived as `source.json.gz`, with a tracked diff alongside them. The manifest records the commit and whether there are local changes; it must not be described as an execution of the unmodified commit. Preserve that private capture directory if future audit/reproduction matters. It is not backed up or hosted automatically.

Preparation accepts a successfully completed representative subset; promotion requires all four selected recordings. Preparation checks source/video fingerprints, transcodes the genuine source clips into silent H.264 MP4 files without changing speed, and extracts PNG posters and review frames. A private `poster-times.json` mapping scenario IDs to seconds can select a reviewed, settled source frame without editing the clip. Assertion checkpoints capture the Settings failure and nested history detail so their actual painted states are reviewable; they add no sleeps or UI actions. The public manifest retains both original-capture and MP4 hashes. Promotion revalidates the catalog and asset checksums and copies only reviewed media and allowlisted metadata into `public/recordings`. A passed retry remains **flaky**, retaining its failed first attempt in the details. A failed or incomplete capture is retained privately and cannot silently replace the showcase. Review is a human/agent inspection step; checksums do not detect personal data or certify redaction.

## Public media policy and playback

Public assets are deliberately curated, silent MP4/H.264 clips and PNG posters, named using the video hash. They ship with the ordinary Vite client build; no hosted resource, paid execution service, or CI media upload is introduced. Existing GitHub telemetry still uploads sanitized JSON only. Logs, traces, source snapshots, report attachments, review frames, and raw diagnostics remain ignored/private.

The runtime validates the small manifest, strips unknown fields, requires local media paths, and checks outcome/attempt consistency. Missing, invalid, or unreachable catalogs show explicit unavailable states with retry. Media is fetched only on user intent; there is no initial video source, autoplay, or loop. A cancellable HEAD request validates HTTP status, MP4 content type, and a positive content length capped at 8 MiB before assigning the local URL to the native player. Native playback can then use range requests. Offline checks verify actual file hashes against the manifest; the browser does not claim to verify every native media byte. Native loads are released on tab change, unmount, or timeout; changing tabs resets playback. Catalog requests have a ten-second deadline; media stalls have a twelve-second deadline and explicit retry. Late playback failures cannot replace a newer selection. The player does not fetch GitHub credentials or start execution.

Retain media while it remains an accurate, useful example; it has no live freshness claim. Regenerate when the demonstrated behavior or explanatory claims change materially. Review replacement clips before promotion, then remove unreferenced old public media in the same reviewed change. Never replace media under an existing hash name. Removing local files does not erase earlier Git history, deployments, browser caches, or backups. Keep the small fixed catalog bounded; reassess storage if the lineup grows.

## Validation boundaries

Offline tests validate manifest integrity, actual public-file hashes, unsafe paths, retry semantics, unknown-field stripping, and media-response size/type/status failures. Browser tests decode the actual public clips in Chromium and mobile WebKit, exercise keyboard tab navigation, slower playback, failed-media retry, stalled-load deadlines, and stale-player cleanup. They also verify viewport fit and preserve scenario descriptions when media is unavailable. Native fullscreen and codec support depend on the browser/device; emulated WebKit is not proof of physical iOS compatibility. There is no hosted playback or deployment claim.

MP4 was selected after an isolated codec probe: the Windows WebKit runtime advanced the playback clock for WebM without decoding a frame; H.264 MP4 decoded correctly. Tests require decoded dimensions and readiness, not just an advancing clock. Playwright documents [platform-dependent codecs and the limits of Safari emulation](https://playwright.dev/docs/browsers#webkit). Physical iOS and hosted playback remain separate checks.

The Windows WebKit runtime also rejected blob and data URLs for these MP4 files; the player uses native HTTP URLs after the bounded availability check. This avoids duplicating a full download in JavaScript and preserves native range support. Header validation is an availability check, not a substitute for the offline file-hash check or immutable deployment assets.

The visible details deliberately keep only the scenario, evidence limits, actual outcome/attempts, capture date, and browser viewport. Source paths, revision, fingerprints, and runtime versions remain in the manifest and private provenance rather than crowding the interface. Scenario descriptions use short, varied step sequences rather than a fixed checklist.
