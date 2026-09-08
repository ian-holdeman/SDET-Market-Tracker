# Development roadmap

Owner-provided roadmap, recorded 2026-09-08. This roadmap tracks accepted work and future scope; it is not authorization to implement every item. Start each substantial feature with a focused prompt, acceptance criteria, evidence requirements and review boundaries.

Home, The Board, The Tests, The Logic, Privacy, and Settings/application themes are initial version complete and owner-accepted. This is a feature milestone, not deployment, current CI success, security/compliance certification or production verification.

## Home / Landing

- Initial version complete and owner-accepted.

- Maintain code quality, monitor for bugs, and add focused regression coverage when defects warrant it.

## The Board

- Initial version complete and owner-accepted, including dated intraday progression, previous-session handoffs and exchange-aware Google Finance links for curated and searched assets. See [market behavior and evidence limits](market-data.md).

- Monitor for bugs and add more sophisticated tests where meaningful coverage gaps are found.
- Owner-requested before launch: add an opt-in market-data comparison test against an independent external source. Scope provider access, symbol/session/timestamp alignment, tolerances and evidence retention before implementation; keep live checks outside the deterministic CI gate. Once implemented and verified, feature the test on The Logic. This is not existing accuracy coverage.

## The Tests

Initial version complete and owner-accepted. The details below describe implemented scope and deferred coverage.

1. Completed and owner-accepted: one recorded-execution monitor with four featured-test tabs (watchlist re-login, cold-start recovery, history recovery, and safe deletion), real local captures with populated market fixtures, accessible 0.5×/1×/2× playback, concise scenario details, and disclosed provenance/mocks. The Automation Dashboard has its own bold lightning-and-speed-lines mark. See [recording workflow and limits](test-recordings.md).
2. Initial version complete and owner-accepted: the Execution demonstrations placeholder is replaced by a shared-time replay of the two existing parallel GitHub jobs, using a selected genuine successful run. The dashboard and recording monitor are preserved. Includes a static overview, user-initiated 20× replay, keyboard/reduced-motion support, bounded source revalidation, and a compact sanitized browser-case feed synchronized to actual completion times. All-suite case reporting is deferred. No new containers or featured failure run. See [pipeline evidence, reproduction, and limits](pipeline-replay.md).

For both features, preserve visitor access and use real, attributable evidence. No visitor-triggered execution or fake live status. Define recording selection, artifact handling, playback/accessibility, and the source of pipeline evidence when scoping each feature. Do not assume a public display requires new paid execution infrastructure.

## The Logic

- Initial version complete and owner-accepted: four interview-developed sections cover motivation, architecture/tools, testing, and AI/future perspective. Includes approved personal copy, a responsive data-flow diagram, compact tool groups, and expandable repository evidence with coverage limits. Unsupported zero-flakiness and instant-telemetry copy is removed. See [editorial direction and evidence](the-logic.md). Acceptance covers the local initial version, not deployment or current CI health. The independent-source market comparison remains separate pre-launch work.

## Overall

- Privacy/security: public notice copy owner-approved; local modal/direct-page implementation, local fonts, Auth cleanup and response-header controls are implemented and locally verified. Complete and owner-accepted, including the Settings full-notice link and narrow browser-appearance disclosure. See [scope, evidence and launch requirements](privacy-security.md). This does not establish hosted readiness or legal certification.
- Maintain the [data inventory](data-inventory.md) with processing changes. Existing direct Parqet logo delivery is retained by owner decision pending provider permission. Hosting/provider retention and production OAuth verification remain launch requirements.
- Contact is the remaining small feature before hosting: concise full-time hiring subtext is prepared; preserve the third-option joke. Await the owner’s resume upload for a light editorial cleanup and verified PDF integration, then review the assembled modal. See [Contact scope and readiness](contact.md).
- Settings and application themes: complete and owner-accepted, with Delete Account, confirmed owner-scoped Clear Watchlist, a browser-only Light/Dark choice (device default until an explicit selection), and the full public notice link. Settings stays behind sign-in in the user dropdown. Local browser/database evidence and limits are documented in [Settings](settings.md); hosted verification remains separate.
- Determine hosting solution: choose application hosting, database/Auth arrangement and private snapshot durability within the owner's budget. Selection does not authorize provisioning.
- Verify production functionality: after an explicitly authorized deployment, verify public pages, market data, OAuth, private watchlists, registration/deletion, published test evidence and failure behavior on the actual production origin. Local checks do not complete this item.

## Maintenance and launch considerations

These are known considerations, not additions to the owner's feature priority order:

- Hosting selection and production verification are explicit todos above. Include exact OAuth URLs, configuration boundaries, provider access rights and costs in their acceptance criteria.
- Investigate retry synchronization in the pipeline unavailable/invalid-evidence browser case; it produced a retry-only pass during privacy verification. Keep this separate from privacy feature acceptance.
- Reassess distributed limits if deploying multiple instances. Extend the U.S. trading calendar before its current 2026–2028 coverage expires.
- Existing duplicate MU/SNDK logo cases and bundle-size warnings need scoped attention. Reassess dependency advisories with a current audit instead of treating old audit counts as current.
- Independent market-data reconciliation, corporate-action policy and load testing remain gaps; present their limits honestly.
- Future alerts, simulated portfolios and personal investment/net-worth tracking are deferred product ideas, outside the current launch scope.

## Continuing in a new task

Read `AGENTS.md`, `README.md`, `docs/project-overview.md`, this roadmap, and the relevant domain guide. Follow the feature workflow in `AGENTS.md`: inspect and check feasibility, resolve initial questions, agree on a feature prompt, implement with behavior-driven tests, validate, review and polish, then document acceptance. Inspect git status and the actual code; preserve current changes. Record accepted new decisions in the appropriate guide and update this roadmap when scope is completed or changed. Do not append test totals or transient browser/process state as lasting project facts.
