# Development roadmap

Owner-provided roadmap, initially recorded 2026-09-08; first post-production polish backlog added 2026-09-12. This roadmap tracks accepted work and future scope; it is not authorization to implement every item. Start each substantial feature with a focused prompt, acceptance criteria, evidence requirements and review boundaries.

Home, The Board, The Tests, The Logic, Privacy, Settings/application themes, and Contact are initial version complete and owner-accepted. The application is deployed on Cloud Run; completed release checks and their limits are recorded in [deployment and operation](deployment.md). Initial-version acceptance does not establish current CI success or verification of subsequent updates.

## First post-production update: polish backlog

Planned work for September 12, 2026, ordered from least to most estimated complexity based on the current implementation. Item 1 is complete and owner-accepted locally; items 2–8 are pending. Deployment of the resume update remains separate. This is a planning order, not a promise that every item fits into one day. Dependencies below adjust execution order. Preserve the minimalist layout and existing public access; agree on unresolved choices when each task is scoped.

| Order | Task | Complexity and intended result |
| --- | --- | --- |
| 1 | Correct resume course names and wording | Complete and owner-accepted on September 12, 2026. Small. Add the missing AI wording to the Google courses using verified credential titles, and review the resume for miswording without expanding unsupported claims. Update the canonical HTML and synchronize both PDFs; inspect both pages, extracted text and matching public/download bytes. See [Contact and canonical sources](contact.md). |
| 2 | Document nightly CI in The Logic | Small, after item 6. Explain the actual schedule, job responsibilities, sanitized publication, failure/retry semantics and evidence limits, with repository references. Describe implemented GitHub Actions and CI/CD behavior accurately, distinguishing test execution/publication from application deployment. Preserve the existing disclosures and page layout; keep the explanation factual rather than evaluator coaching. See [The Logic](the-logic.md). |
| 3 | Make the Light/Dark toggle available without sign-in | Small–medium. Expose an accessible public appearance control using the existing preference mechanism. Preserve device defaults, browser-only persistence, cross-tab synchronization and mounted chart/player/dialog state; account actions remain protected. Choose control placement during scoping and verify guest use on desktop/mobile. This intentionally extends the current signed-in-only control access in [Settings](settings.md). |
| 4 | Improve dark-text visibility in Light mode | Medium. Identify low-visibility text and affected states, then tune shared semantic tokens or their usage. Check body/secondary text, links, chart labels, hover/focus and unavailable states on desktop/mobile; preserve Dark mode and recorded-media colors. Use measured contrast plus visual review, not a blanket typography/layout redesign. See [appearance contract](settings.md). |
| 5 | Break down and audit automated test suites | Medium. Inventory offline, browser, SQL/RLS, local Auth integration and opt-in provider checks; map important workflows and boundary failures to actual assertions. Report meaningful coverage, duplication, gaps, flake/race risks, runtime costs and what CI/public telemetry actually includes. Distinguish case evidence from job status and mocks from integration proof. Deliver a repository-backed audit with prioritized follow-up work; remediation beyond this batch is separately scoped. Start from [verification commands](../README.md) and [telemetry semantics](test-telemetry.md). |
| 6 | Add nightly pipeline runs that populate The Tests | Medium–large. Reuse the Application baseline workflow and extend scheduled-event support through workflow publication, ingestion and relevant history/activity readers, with regression coverage of trusted versus rejected sources. Preserve PR exclusion, repository/branch/workflow checks, incomplete results and honest retry outcomes. Decide run time/time zone, suite scope and Actions cost budget before implementation. Verify a real scheduled run reaches The Tests after authorized release; a local fixture or manual dispatch alone cannot establish scheduled publication. See [telemetry](test-telemetry.md) and [header activity](header-activity.md). |
| 7 | Refresh test replay videos and the historical run | Large. Review which of the four curated recordings need replacement after the polish changes; capture and inspect genuine executions, posters, provenance and decoded playback in Chromium/WebKit. Deliberately select a newer suitable GitHub attempt for the historical timeline, verify its job topology/timing and sanitized case evidence, and prepare its separately authorized archive publication. Preserve original attempts, historical labels, integrity/revocation rules and exclusion from rolling metrics. Recording fixtures and historical CI remain distinct evidence sources. See [recordings](test-recordings.md) and [pipeline replay](pipeline-replay.md). |
| 8 | Reduce initial-visit test-card loading friction | Large / investigation first. Reproduce and measure first usable evidence on Home and The Tests, separating client discovery, GitHub retrieval, snapshot reads and Cloud Run cold starts. Inspect the existing shared browser cache and request-scoped snapshot refresh before selecting a fix. Improve measured latency and loading presentation while preserving layout, provenance, stale/error visibility, expiry/removal checks and request-bounded persistence. Define a measurable target from the baseline; verify warm/cold and failed-upstream behavior without assuming paid always-on capacity. See [snapshot and refresh behavior](test-telemetry.md) and [Cloud Run constraints](deployment.md). |

Execution dependencies: complete item 6 before finalizing item 2; use item 5 to inform nightly suite scope and loading regression coverage. Complete relevant UI/loading changes before recapturing affected videos in item 7, and use a reviewed post-update CI attempt for the historical selection. Item 8 can begin with read-only diagnosis earlier, but its solution and complexity depend on measured causes. Nightly test execution does not authorize nightly deployment, keep-alive traffic or new paid infrastructure. Pushes, deployment and remote archive/configuration changes retain the release authorization boundaries in AGENTS.md.

## Home / Landing

- Initial version complete and owner-accepted.

- Maintain code quality, monitor for bugs, and add focused regression coverage when defects warrant it.

## The Board

- Initial version complete and owner-accepted, including dated intraday progression, previous-session handoffs and exchange-aware Google Finance links for curated and searched assets. See [market behavior and evidence limits](market-data.md).

- Monitor for bugs and add more sophisticated tests where meaningful coverage gaps are found.
- Implemented locally: opt-in private Yahoo/Finnhub comparison for three US stocks, with bounded access, dated-session/timestamp alignment, predeclared tolerance and private retention. The Logic links its method without publishing provider results. See [scope and limitations](market-comparison.md); this is not universal accuracy coverage.

## The Tests

Initial version complete and owner-accepted. The details below describe implemented scope and deferred coverage.

1. Completed and owner-accepted: one recorded-execution monitor with four featured-test tabs (watchlist re-login, cold-start recovery, history recovery, and safe deletion), real local captures with populated market fixtures, accessible 0.5×/1×/2× playback, concise scenario details, and disclosed provenance/mocks. The Automation Dashboard has its own bold lightning-and-speed-lines mark. See [recording workflow and limits](test-recordings.md).
2. Initial version complete and owner-accepted: the Execution demonstrations placeholder is replaced by a shared-time replay of the two existing parallel GitHub jobs, using a selected genuine successful run. The dashboard and recording monitor are preserved. Includes a static overview, user-initiated 20× replay, keyboard/reduced-motion support, bounded source revalidation, and a compact sanitized browser-case feed synchronized to actual completion times. All-suite case reporting is deferred. No new containers or featured failure run. See [pipeline evidence, reproduction, and limits](pipeline-replay.md).

For both features, preserve visitor access and use real, attributable evidence. No visitor-triggered execution or fake live status. Define recording selection, artifact handling, playback/accessibility, and the source of pipeline evidence when scoping each feature. Do not assume a public display requires new paid execution infrastructure.

## The Logic

- Initial version complete and owner-accepted: four sections cover motivation, architecture/tools, testing, and AI/future perspective. Includes approved personal copy, a responsive data-flow diagram, compact tool groups, and expandable repository evidence with coverage limits. Unsupported zero-flakiness and instant-telemetry copy is removed. See [architecture and test evidence](the-logic.md). Acceptance covers the local initial version, not deployment or current CI health. The Logic now also links the verified private comparison method with its limited coverage.

## Overall

- Privacy/security: public notice copy owner-approved; local modal/direct-page implementation, local fonts, Auth cleanup and response-header controls are implemented and locally verified. Complete and owner-accepted, including the Settings full-notice link and narrow browser-appearance disclosure. See [scope, evidence and launch requirements](privacy-security.md). This does not establish hosted readiness or legal certification.
- Maintain the [data inventory](data-inventory.md) with processing changes. Existing direct Parqet logo delivery is retained by owner decision pending provider permission. Hosting/provider retention and production OAuth verification remain launch requirements.
- Contact: initial version complete and owner-accepted, including the main resume and editable source, browser PDF preview, optional download, concise header subtitle and removal of the two badges. The canonical resume and synchronized PDFs now contain the verified Cloud Run URL. See [Contact behavior and source paths](contact.md).
- Settings and application themes: complete and owner-accepted, with Delete Account, confirmed owner-scoped Clear Watchlist, a browser-only Light/Dark choice (device default until an explicit selection), and the full public notice link. Settings stays behind sign-in in the user dropdown. Local browser/database evidence and limits are documented in [Settings](settings.md); hosted verification remains separate.
- Hosting solution selected: Google Cloud Run for the application, Supabase for database/Auth (initial Free plan subject to availability review), and private Google Cloud Storage for snapshots and archived test evidence. Start Cloud Run at zero minimum instances. The named release plan was approved and its resources are provisioned; new paid services still require separate authorization.
- Verify production functionality: after an explicitly authorized deployment, verify public pages, market data, OAuth, private watchlists, registration/deletion, published test evidence and failure behavior on the actual production origin. Local checks do not complete this item.

## Deployment planning constraints

- Target zero additional monthly hosting cost. Cold starts are acceptable to save money, with immediate response preferred when affordable. The owner reports an existing Google AI Pro subscription, a Google Cloud trial and $300 of available Cloud credits. Confirm credit eligibility, expiry and ongoing costs in the account before choosing resources; promotional credit is not a permanent free tier.
- Preserve all accepted functionality. Optimize idle infrastructure cost without removing features, reducing evidence integrity or weakening security. If a requirement needs additional spend, explain the least-cost viable options rather than silently reducing scope. Review Supabase's independent inactivity/availability limits; Google credits do not cover Supabase charges.
- Start production with fresh accounts and watchlists, using the reviewed schema and shared Board data. Do not reset the local environment or migrate local test identities as part of this decision.
- Preserve existing trusted GitHub history within its normal 90-day retention. Permanent retention of every run is unnecessary; retain at least one verified, sanitized run and its job/replay evidence independently of artifact expiry so a demonstration remains available after months of inactivity. The explicit archive mechanism is implemented locally with separated publication authority, integrity/generation checks, revocation and historical labelling. The selected run is published in private GCS, with hosted publication/recovery and simulated source expiry verified. Live cache expiry semantics remain unchanged.
- The featured timeline now pins reviewed run #30 with both actual jobs, real overlap and complete sanitized case evidence. Its commit precedes hardening; keep release verification separate. Its historical archive was published and independently verified during rollout.
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

## Continuing in a new task

Read `AGENTS.md`, `README.md`, `docs/project-overview.md`, this roadmap, and the relevant domain guide. Follow the feature workflow in `AGENTS.md`: inspect and check feasibility, resolve initial questions, agree on a feature prompt, implement with behavior-driven tests, validate, review and polish, then document acceptance. Inspect git status and the actual code; preserve current changes. Record accepted new decisions in the appropriate guide and update this roadmap when scope is completed or changed. Do not append test totals or transient browser/process state as lasting project facts.
