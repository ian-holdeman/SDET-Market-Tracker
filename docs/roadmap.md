# Development roadmap

Owner-provided roadmap, recorded 2026-09-08. This roadmap tracks accepted work and future scope; it is not authorization to implement every item. Start each substantial feature with a focused prompt, acceptance criteria, evidence requirements and review boundaries.

Home, The Board, The Tests, The Logic, Privacy, Settings/application themes, and Contact are initial version complete and owner-accepted. Feature development for this version is complete; hosting and deployment are the next phase. This is a feature milestone, not deployment, current CI success, security/compliance certification or production verification.

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
- Contact: initial version complete and owner-accepted, including the main resume and editable source, browser PDF preview, optional download, concise header subtitle and removal of the two badges. Update the pending resume application URL once the hosting destination is approved. See [Contact behavior and source paths](contact.md).
- Settings and application themes: complete and owner-accepted, with Delete Account, confirmed owner-scoped Clear Watchlist, a browser-only Light/Dark choice (device default until an explicit selection), and the full public notice link. Settings stays behind sign-in in the user dropdown. Local browser/database evidence and limits are documented in [Settings](settings.md); hosted verification remains separate.
- Hosting solution selected: Google Cloud Run for the application, Supabase for database/Auth (initial Free plan subject to availability review), and private Google Cloud Storage for snapshots and archived test evidence. Start Cloud Run at zero minimum instances. Provider selection does not authorize provisioning; review the implementation prompt and exact resource plan first.
- Verify production functionality: after an explicitly authorized deployment, verify public pages, market data, OAuth, private watchlists, registration/deletion, published test evidence and failure behavior on the actual production origin. Local checks do not complete this item.

## Deployment planning constraints

- Target zero additional monthly hosting cost. Cold starts are acceptable to save money, with immediate response preferred when affordable. The owner reports an existing Google AI Pro subscription, a Google Cloud trial and $300 of available Cloud credits. Confirm credit eligibility, expiry and ongoing costs in the account before choosing resources; promotional credit is not a permanent free tier.
- Preserve all accepted functionality. Optimize idle infrastructure cost without removing features, reducing evidence integrity or weakening security. If a requirement needs additional spend, explain the least-cost viable options rather than silently reducing scope. Review Supabase's independent inactivity/availability limits; Google credits do not cover Supabase charges.
- Start production with fresh accounts and watchlists, using the reviewed schema and shared Board data. Do not reset the local environment or migrate local test identities as part of this decision.
- Preserve existing trusted GitHub history within its normal 90-day retention. Permanent retention of every run is unnecessary; retain at least one verified, sanitized run and its job/replay evidence independently of artifact expiry so a demonstration remains available after months of inactivity. The explicit archive mechanism is implemented locally with separated publication authority, integrity/generation checks, revocation and historical labelling. Actual hosted publication/recovery remain acceptance requirements. Live cache expiry semantics remain unchanged.
- The featured timeline now pins reviewed run #30 with both actual jobs, real overlap and complete sanitized case evidence. Its commit precedes hardening; keep release verification separate and publish this archive during rollout.
- Include a final production hardening review and remediation in the launch prompt: known maintenance, dependencies, configuration/secrets, authorization, request/resource limits, shutdown/restart behavior, evidence durability, deployment/rollback and hosted verification. Resolve launch blockers and record justified remaining maintenance; do not promise zero defects or zero technical debt.
- The implementation prompt was accepted and local hardening is underway. The owner created the Supabase Free project. Remaining work is the concrete release approval, hosted provisioning/migrations, exact-commit CI, deployment and production acceptance in [deployment.md](deployment.md). Do not restart feature design.

## Maintenance and launch considerations

These are known considerations, not additions to the owner's feature priority order:

- Hosting selection and production verification are explicit todos above. Include exact OAuth URLs, configuration boundaries, provider access rights and costs in their acceptance criteria.
- Clipboard feedback is fixed locally with deferred success, rejected/unavailable handling and timer cleanup regression coverage.
- Pipeline and recording-catalog retry fixtures now wait for and assert each intermediate response before changing modes. Preserve original failure/retry evidence; local fixes do not establish future CI outcomes.
- Shared registration limits are database-enforced across instances; public market capacity limits remain per process. Extend the U.S. trading calendar before its current 2026–2028 coverage expires.
- Duplicate MU/SNDK cases and actionable bundle warnings are resolved locally. CI actions use Node 24 while the app remains on Node 22. Recheck dependency advisories and transitive package deprecations when dependencies change; do not equate an advisory report with a security audit.
- Private quote comparison and a bounded local container workload are implemented; full corporate-action reconciliation and real-origin load/cold-start evidence remain distinct limitations.
- Future alerts, simulated portfolios and personal investment/net-worth tracking are deferred product ideas, outside the current launch scope.

## Continuing in a new task

Read `AGENTS.md`, `README.md`, `docs/project-overview.md`, this roadmap, and the relevant domain guide. Follow the feature workflow in `AGENTS.md`: inspect and check feasibility, resolve initial questions, agree on a feature prompt, implement with behavior-driven tests, validate, review and polish, then document acceptance. Inspect git status and the actual code; preserve current changes. Record accepted new decisions in the appropriate guide and update this roadmap when scope is completed or changed. Do not append test totals or transient browser/process state as lasting project facts.
