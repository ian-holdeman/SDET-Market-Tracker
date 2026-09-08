# Development roadmap

Owner-provided roadmap, recorded 2026-09-08. These are future tasks, not authorization to implement every item. Start each substantial feature with a focused prompt, acceptance criteria, evidence requirements and review boundaries.

## Home / Landing

- Maintain code quality, monitor for bugs, and add focused regression coverage when defects warrant it.

## The Board

- Monitor for bugs and add more sophisticated tests where meaningful coverage gaps are found.

## The Tests

1. Completed: one recorded-execution monitor with four featured-test tabs (watchlist re-login, cold-start recovery, history recovery, and safe deletion), real local captures with populated market fixtures, accessible 0.5×/1×/2× playback, concise scenario details, and disclosed provenance/mocks. See [recording workflow and limits](test-recordings.md).
2. Second feature beneath the monitor: replace the current section with a demonstration of parallel containerized pipeline execution without headed browser playback.

For both features, preserve visitor access and use real, attributable evidence. No visitor-triggered execution or fake live status. Define recording selection, artifact handling, playback/accessibility, and the source of pipeline evidence when scoping each feature. Do not assume a public display requires new paid execution infrastructure.

## The Logic

- Revise the initial draft gradually with the owner. Explain actual decisions, tradeoffs, test evidence and limitations in interview-defensible terms; do not invent claims or personal experience.

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

Read AGENTS.md, README.md, project-overview.md and the relevant domain guide. Inspect git status and the actual code; preserve current changes. Record accepted new decisions in the appropriate guide and update this roadmap when scope is completed or changed. Do not append test totals or transient browser/process state as lasting project facts.
