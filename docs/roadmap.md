# Development roadmap

This roadmap tracks accepted work and deferred scope. Completion records describe the stated local or hosted milestone; future items require their own scope and authorization. Engineering and validation standards are maintained in [AGENTS.md](../AGENTS.md).

Home, The Board, The Tests, The Logic, Privacy, Settings/application themes, and Contact are initial version complete and owner-accepted. The application is deployed on Cloud Run; completed release checks and their limits are recorded in [deployment and operation](deployment.md). Initial-version acceptance does not establish current CI success or verification of subsequent updates.

## First post-production update: polish backlog

Items 1–7 are complete and owner-accepted locally on September 12, 2026, including the final recording review. Item 8 remains deferred. Deployment of these updates and genuine scheduled-publication verification remain separate release work.

| Order | Task | Status and result |
| --- | --- | --- |
| 1 | Correct resume course names and wording | Complete and owner-accepted locally on September 12, 2026. Corrected Google course titles without expanding credential claims, updated the canonical HTML and synchronized both PDFs. Both pages, extracted text and matching public/download bytes were reviewed. See [Contact and canonical sources](contact.md). |
| 2 | Document nightly CI in The Logic | Complete and owner-accepted locally with item 6 on September 12, 2026. The brief existing CI/CD explanation describes the nightly schedule, parallel responsibilities and trusted publication, with limits in the existing disclosure. Corrected Cloud Run hosting and dated verification limits; retained the four-section flow, typography, palettes and AI disclosure. Test execution/publication remains separate from deployment. See [The Logic](the-logic.md). |
| 3 | Make the Light/Dark toggle available without sign-in | Complete and owner-accepted locally on September 12, 2026, including immediate palette changes without color/gradient fading. A compact accessible sun/moon button beside Sign In/profile shares the existing appearance mechanism with Settings. Preserves device defaults, browser-only persistence, cross-tab synchronization and mounted chart/player/dialog state; account actions remain protected. Local Chromium/mobile WebKit evidence and responsive captures are recorded in [Settings](settings.md). Light-mode contrast corrections are recorded in item 4; release verification remains separate. |
| 4 | Improve dark-text visibility in Light mode | Complete and owner-accepted locally on September 12, 2026. The Google action keeps its dark label on pale blue, with readable connecting/disabled feedback. Targeted corrections also cover Settings disabled actions, Contact's resume link, Home's positive mover badges, Board dollar-change text and the selected recording tab. Shared token values, Dark mode, typography/layout, recorded footage and immediate synchronized switching are preserved. Chromium/mobile WebKit contrast measurements, before/after captures, regression failures and validation limits are recorded in [Settings](settings.md). No release is included. |
| 5 | Audit and strengthen automated suites | Complete and owner-accepted locally on September 12, 2026. F1–F14 remediation covers core Board/Home workflows, diagnostics, fixture isolation, race synchronization, retained accessibility/geometry assertions and lower-cost offline boundaries. SQL/RLS and disposable Auth integration remain distinct from browser mocks. See the [finding-to-assertion mapping and evidence limits](test-audit-implementation.md). |
| 6 | Add nightly pipeline runs that populate The Tests | Complete and owner-accepted locally with item 2 on September 12, 2026. Native GitHub scheduling targets 2:17 a.m. America/Denver every night, including weekends and unchanged already-passing commits; spring-forward advances to 3:00 a.m. The complete existing baseline and opt-in live-provider boundary are preserved. Scheduled publication, ingestion and history/activity readers retain provenance, PR/fork exclusion, incomplete evidence and retry semantics; the selected historical archive is unchanged. Public runner/artifact estimates support zero additional spend, subject to the documented account-wide pre-activation check. Genuine scheduled publication to Home/The Tests still requires authorized release verification. See [scope and operational limits](test-telemetry.md) and [header activity](header-activity.md). |
| 7 | Refresh recordings and automate nightly replay | Complete and owner-accepted locally on September 12, 2026. Four reviewed recordings show watchlist re-login, chart session handoff, Settings clear/recovery ending on the empty Watchlist, and nested history recovery. Brief details disclose the mocked AAPL/MSFT Board. Replay selects genuine scheduled run/attempt identity, including failures and incomplete evidence, while retaining the existing older archive without rotation. See [recordings](test-recordings.md) and [pipeline replay](pipeline-replay.md). |
| 8 | Reduce initial-visit test-card loading friction | Large / investigation first. Reproduce and measure first usable evidence on Home and The Tests, separating client discovery, GitHub retrieval, snapshot reads and Cloud Run cold starts. Inspect the existing shared browser cache and request-scoped snapshot refresh before selecting a fix. Improve measured latency and loading presentation while preserving layout, provenance, stale/error visibility, expiry/removal checks and request-bounded persistence. Define a measurable target from the baseline; verify warm/cold and failed-upstream behavior without assuming paid always-on capacity. See [snapshot and refresh behavior](test-telemetry.md) and [Cloud Run constraints](deployment.md). |

Remaining boundaries: item 8 requires a measured loading baseline before selecting a fix. The accepted nightly update does not authorize deployment, archive publication, keep-alive traffic or paid infrastructure. Release checks must observe genuine scheduled runs, including a later run at an unchanged SHA, and verify the account-wide zero-additional-spend controls. See [deployment](deployment.md).

## Home / Landing

- Initial version complete and owner-accepted.

- Maintain code quality, monitor for bugs, and add focused regression coverage when defects warrant it.

## The Board

- Initial version complete and owner-accepted, including dated intraday progression, previous-session handoffs and exchange-aware Google Finance links for curated and searched assets. See [market behavior and evidence limits](market-data.md).

- Monitor for bugs and add more sophisticated tests where meaningful coverage gaps are found.
- Implemented locally: opt-in private Yahoo/Finnhub comparison for three US stocks, with bounded access, dated-session/timestamp alignment, predeclared tolerance and private retention. The Logic links its method without publishing provider results. See [scope and limitations](market-comparison.md); this is not universal accuracy coverage.

## The Tests

Initial version complete and owner-accepted. The details below describe implemented scope and deferred coverage.

1. One recorded-execution monitor with four tabs: watchlist re-login, chart session handoff, Settings clear/recovery and nested history. Reviewed local captures use populated fixtures, accessible 0.5×/1×/2× playback, concise descriptions and disclosed mocks/provenance. The cold-start and safe-deletion scenarios remain automated. See [recording workflow and limits](test-recordings.md).
2. A shared-time replay follows genuine completed nightly attempts, including failed/cancelled outcomes and incomplete evidence. Job timing and sanitized browser cases remain independent; the explicitly older archive retains its original provenance and is excluded from rolling metrics. The timeline supports user-initiated 20× playback, keyboard/reduced-motion access and bounded revalidation that preserves active interaction. Individual all-suite case reporting remains deferred. See [pipeline evidence and limits](pipeline-replay.md).

For both features, preserve visitor access and use real, attributable evidence. No visitor-triggered execution or fake live status. Define recording selection, artifact handling, playback/accessibility, and the source of pipeline evidence when scoping each feature. Do not assume a public display requires new paid execution infrastructure.

## The Logic

- Initial version complete and owner-accepted: four sections cover motivation, architecture/tools, testing, and AI/future perspective. Includes approved personal copy, a responsive data-flow diagram, compact tool groups, and expandable repository evidence with coverage limits. Unsupported zero-flakiness and instant-telemetry copy is removed. See [architecture and test evidence](the-logic.md). Acceptance covers the local initial version, not deployment or current CI health. The Logic now also links the verified private comparison method with its limited coverage.

## Overall

- Privacy/security: public notice copy owner-approved; local modal/direct-page implementation, local fonts, Auth cleanup and response-header controls are implemented and locally verified. Complete and owner-accepted, including the Settings full-notice link and narrow browser-appearance disclosure. See [scope, evidence and launch requirements](privacy-security.md). This does not establish hosted readiness or legal certification.
- Maintain the [data inventory](data-inventory.md) with processing changes. Existing direct Parqet logo delivery is retained by owner decision pending provider permission. Provider retention and access rights remain explicit limits; dated production OAuth evidence is recorded in the deployment guide.
- Contact: initial version complete and owner-accepted, including the main resume and editable source, browser PDF preview, optional download, concise header subtitle and removal of the two badges. The canonical resume and synchronized PDFs now contain the verified Cloud Run URL. See [Contact behavior and source paths](contact.md).
- Settings and application themes: complete and owner-accepted, with Delete Account, confirmed owner-scoped Clear Watchlist, a browser-only Light/Dark choice (device default until an explicit selection), and the full public notice link. Settings stays behind sign-in in the user dropdown. Local browser/database evidence and limits are documented in [Settings](settings.md); hosted verification remains separate.
- Hosting solution selected: Google Cloud Run for the application, Supabase for database/Auth (initial Free plan subject to availability review), and private Google Cloud Storage for snapshots and archived test evidence. Start Cloud Run at zero minimum instances. The named release plan was approved and its resources are provisioned; new paid services still require separate authorization.
- Verify production functionality: after an explicitly authorized deployment, verify public pages, market data, OAuth, private watchlists, registration/deletion, published test evidence and failure behavior on the actual production origin. Local checks do not complete this item.

## Deployment planning constraints

- Target zero additional monthly hosting cost. Cold starts are acceptable; avoid paid always-on capacity without approval. Recheck account eligibility, credit expiry and ongoing costs before changing resources. The [deployment guide](deployment.md) records the dated billing assumptions; promotional credit is not a permanent free tier.
- Preserve all accepted functionality. Optimize idle infrastructure cost without removing features, reducing evidence integrity or weakening security. If a requirement needs additional spend, explain the least-cost viable options rather than silently reducing scope. Review Supabase's independent inactivity/availability limits; Google credits do not cover Supabase charges.
- Start production with fresh accounts and watchlists, using the reviewed schema and shared Board data. Do not reset the local environment or migrate local test identities as part of this decision.
- Preserve existing trusted GitHub history within its normal 90-day retention. Permanent retention of every run is unnecessary; retain at least one verified, sanitized run and its job/replay evidence independently of artifact expiry so a demonstration remains available after months of inactivity. The explicit archive mechanism is implemented locally with separated publication authority, integrity/generation checks, revocation and historical labelling. The selected run is published in private GCS, with hosted publication/recovery and simulated source expiry verified. Live cache expiry semantics remain unchanged.
- The retained historical archive pins reviewed run #30 with both actual jobs, real overlap and complete sanitized case evidence; the local timeline update selects genuine nightly runs separately. Its commit precedes hardening; keep release verification separate. Its historical archive was published and independently verified during rollout.
- Include a final production hardening review and remediation in the launch prompt: known maintenance, dependencies, configuration/secrets, authorization, request/resource limits, shutdown/restart behavior, evidence durability, deployment/rollback and hosted verification. Resolve launch blockers and record justified remaining maintenance; do not promise zero defects or zero technical debt.
- The release plan was approved; hardening, resources, migrations, initial exact-commit CI, deployment, real Google OAuth and hosted checks are complete. The final resume/privacy release uses its own exact-commit CI and hosted artifact verification, recorded in [deployment.md](deployment.md). Do not restart feature design.

## Maintenance and launch considerations

These are known considerations, not additions to the owner's feature priority order:

- Hosting is selected and the initial release has a [hosted acceptance record](deployment.md). Subsequent releases still require their own verification, including affected OAuth URLs, configuration boundaries, provider access rights and costs.
- Clipboard feedback is fixed locally with deferred success, rejected/unavailable handling and timer cleanup regression coverage.
- Pipeline and recording-catalog retry fixtures now wait for and assert each intermediate response before changing modes. Preserve original failure/retry evidence; local fixes do not establish future CI outcomes.
- Shared registration limits are database-enforced across instances; public market capacity limits remain per process. Extend the U.S. trading calendar before its current 2026–2028 coverage expires.
- Duplicate MU/SNDK cases and actionable bundle warnings are resolved locally. CI actions use Node 24 while the app remains on Node 22. Recheck dependency advisories and transitive package deprecations when dependencies change; do not equate an advisory report with a security audit.
- Private quote comparison and a bounded local container workload are implemented; full corporate-action reconciliation and real-origin load/cold-start evidence remain distinct limitations.
- Investigate the Google Storage SDK/teeny-request stream listener warning during maintenance. Actual bounded read/recovery checks passed; do not suppress the warning or claim a leak without resource evidence.
- Future alerts, simulated portfolios and personal investment/net-worth tracking are deferred product ideas, outside the current launch scope.

## Maintenance guidance

Inspect the current source and git status before starting work. Keep accepted behavior and reproduction in domain guides, update this roadmap when scope changes, and preserve original failure evidence privately. Avoid treating historical test totals or prior release checks as current status.
