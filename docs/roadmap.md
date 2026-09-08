# Development roadmap

Owner-provided roadmap, recorded 2026-09-08. This roadmap tracks accepted work and future scope; it is not authorization to implement every item. Start each substantial feature with a focused prompt, acceptance criteria, evidence requirements and review boundaries.

## Home / Landing

- Maintain code quality, monitor for bugs, and add focused regression coverage when defects warrant it.

## The Board

- Monitor for bugs and add more sophisticated tests where meaningful coverage gaps are found.

## The Tests

1. Completed and owner-accepted: one recorded-execution monitor with four featured-test tabs (watchlist re-login, cold-start recovery, history recovery, and safe deletion), real local captures with populated market fixtures, accessible 0.5×/1×/2× playback, concise scenario details, and disclosed provenance/mocks. The Automation Dashboard has its own bold lightning-and-speed-lines mark. See [recording workflow and limits](test-recordings.md).
2. Initial draft complete and owner-accepted: the Execution demonstrations placeholder is replaced by a shared-time replay of the two existing parallel GitHub jobs, using a selected genuine successful run. The dashboard and recording monitor are preserved. Includes a static overview, user-initiated 20× replay, keyboard/reduced-motion support, bounded source revalidation, and a compact sanitized browser-case feed synchronized to actual completion times. All-suite case reporting is deferred. No new containers or featured failure run. See [pipeline evidence, reproduction, and limits](pipeline-replay.md).

For both features, preserve visitor access and use real, attributable evidence. No visitor-triggered execution or fake live status. Define recording selection, artifact handling, playback/accessibility, and the source of pipeline evidence when scoping each feature. Do not assume a public display requires new paid execution infrastructure.

## The Logic

- Next feature to scope: revise the initial draft with the owner. Resolve initial questions and agree on a feature prompt before implementation. Explain actual decisions, tradeoffs, test evidence and limitations in interview-defensible terms; do not invent claims or personal experience. Audit existing absolute claims, including zero flakiness and instant telemetry, against the implementation.

## Overall

- Revise the Privacy modal against actual collection, storage, providers, deletion and retention behavior. Distinguish application deletion from provider logs/backups.
- Revise the Contact modal.
- Revise the Settings draft.

## Maintenance and launch considerations

These are known considerations, not additions to the owner's feature priority order:

- Choose hosting and snapshot durability; verify exact hosted OAuth URLs, configuration, provider access rights and costs before launch.
- Reassess distributed limits if deploying multiple instances. Extend the U.S. trading calendar before its current 2026–2028 coverage expires.
- Existing duplicate MU/SNDK logo cases and bundle-size warnings need scoped attention. Reassess dependency advisories with a current audit instead of treating old audit counts as current.
- Independent market-data reconciliation, corporate-action policy and load testing remain gaps; present their limits honestly.
- Future alerts, simulated portfolios and personal investment/net-worth tracking are deferred product ideas, outside the current launch scope.

## Continuing in a new task

Read `AGENTS.md`, `README.md`, `docs/project-overview.md`, this roadmap, and the relevant domain guide. Follow the feature workflow in `AGENTS.md`: inspect and check feasibility, resolve initial questions, agree on a feature prompt, implement with behavior-driven tests, validate, review and polish, then document acceptance. Inspect git status and the actual code; preserve current changes. Record accepted new decisions in the appropriate guide and update this roadmap when scope is completed or changed. Do not append test totals or transient browser/process state as lasting project facts.
