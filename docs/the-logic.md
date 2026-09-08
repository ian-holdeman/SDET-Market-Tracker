# The Logic: editorial and evidence guide

## Accepted direction

The owner requested an initial local structure developed through a conversational interview. The page is a personal market tracker and Senior SDET portfolio explanation, ordered as:

1. Why I built this.
2. How the app works, including compact Tools and workflow.
3. How I test it.
4. AI and what comes next.

Use the existing typography, spacing, cards and responsive conventions. Preserve surrounding navigation and other pages. A readable data-flow diagram explains market, account and evidence relationships; compact tool groups and on-demand test evidence support the narrative. No benchmark, tool-logo wall or simulated activity is part of this scope.

The Tools and workflow subsection includes the owner's stated mobile-first design approach and invites visitors to inspect both mobile and desktop layouts. This describes design intent, not physical-device certification.

The Board and The Tests navigation buttons sit at the end of How the app works, beneath Tools and workflow.

Personal experience, project implementation and future interests must remain distinct. GitHub Actions is the implemented CI system; do not imply demonstrated GitLab expertise. Discuss AI assistance through owner direction, judgment and verification without implying unaided authorship. Each section requires owner approval before its copy is accepted for publication.

Preserve the owner's original wording and voice. Apply light grammar and flow edits rather than rewriting answers into portfolio language or adding a professional narrative the owner did not supply. The owner permits more technical polishing of the backend/data-integrity answer, while preserving its principles and separating intended accuracy from demonstrated validation.

## Implementation and evidence references

`src/components/TheLogic.tsx` owns the static page, semantic sections, ordered text data-flow paths and native evidence disclosure. No additional data fetching, animation, execution controls or dependency is introduced. Evidence links point to repository source on main and explicitly do not establish current passing results.

| Explanation | Implementation / evidence | Boundary |
| --- | --- | --- |
| Market validation and provenance | `server/market.ts`, `src/services/yahooMarket.ts`, [market guide](market-data.md) | Provider observations are not independently reconciled prices |
| Calendar returns and unavailable history | `scripts/tests/price-activity.test.ts` | Deterministic inputs check calculation rules, not provider accuracy |
| Failed refresh presentation | `src/tests/specs/board/market-data.spec.ts` | Browser API mocks establish UI behavior |
| Failed asset validation prevents saving | `src/tests/specs/auth/auth.spec.ts`, [registration guide](symbol-registration.md) | Browser scenario checks the error and absence of a watchlist write; SQL/Auth authorization is separate |
| Private watchlists and curation | `supabase/tests/authorization.test.sql`, [account guide](../supabase/README.md) | Real SQL policy checks are separate from external OAuth |
| Deletion and recreated identities | `scripts/auth-tests/deletion.test.ts` | Real disposable local password Auth and database; not Google or hosted verification |
| Trusted results and retry semantics | `scripts/tests/telemetry.test.ts`, [telemetry guide](test-telemetry.md) | Browser case results exclude database case counts; local ingestion is not publication |
| Parallel CI responsibilities | `.github/workflows/playwright.yml`, [pipeline guide](pipeline-replay.md) | Historical timing is not application performance or current suite health |
| Recorded demonstrations | [recordings guide](test-recordings.md) | Curated local captures with mocked dependencies, separate from CI results |

Documented engineering decisions can be explained as project behavior. Personal reasons for choosing a technology or workflow require an interview answer; do not infer them from code.

## Accepted editorial scope and deferred work

Status: initial version complete and owner-accepted. The owner accepted all personal narrative passages, supporting technical copy, evidence details and responsive layout. The editorial notice and interview placeholders are removed. This milestone does not establish deployment, current CI health or production verification.

- Motivation: use two paragraphs with a practical, understated tone. The first starts “I wanted a market tracker that” and describes relevant assets, readable information, sorting and watchlists. The approved closing sentence acknowledges financial constraints and existing per-asset Google Finance links for deeper research. The earlier investing backstory and Yahoo UI comparison are removed; preserve the portfolio-purpose paragraph below it.
- The approved additional motivation paragraph explains the portfolio purpose, renewed interest in engineering, and continued development. The one-month initial build timeline is owner-reported personal history, not an independently measured productivity benchmark. Preserve the owner's aside “(and more financially responsible)” with parentheses; AI assistance remains disclosed in the closing section.
- Architecture: keep this section factual and focused on how the app works. At the owner's request, the personal backend-development backstory and rationale are removed. Preserve the technical overview, data-flow diagram, validation/provenance, database ownership, GitHub evidence, and tools/workflow details. The owner wants a future independent-source comparison test highlighted instead of a personal anecdote about informal comparisons; see the pre-launch requirement in [the roadmap](roadmap.md). Do not describe that test as implemented until evidence exists.
- Testing: the approved narrative includes unsuccessful asset validation preventing a watchlist write. Market failure, registration failure and retry reporting support the owner's definition of valuable tests. Approved source references and coverage limits remain available in the disclosure.
- AI and future: the owner-approved workflow passage and team-adoption closing are implemented. The requested phrase “visual regression check of the site” describes manual review, not an automated screenshot-comparison suite. Team adoption is a future contribution, not a claim of professional rollout experience. Keep tool comparisons grounded in the owner's experience and avoid disparagement or endorsement language. No quantified productivity claim is supported.

No interview topics remain open for this initial version. Independent-source market comparison is deferred implementation work, not an unanswered personal section or existing coverage. Future copy changes should retain the distinction between owner experience, repository behavior and future interests.

## Verification

Use Node 22 and the locked dependencies:

```sh
npm run lint
npm run test:baseline
npm run build:e2e
npm run test:e2e -- src/tests/specs/logic/logic.spec.ts src/tests/specs/navigation/navigation.spec.ts --workers=2
npm run build
```

The Logic page object contains scoped locators. Browser tests exercise public navigation and native keyboard disclosure under reduced motion, check content width, and capture desktop/mobile layouts on the isolated production server at port 3100. Inspect those captures for readability. Local checks cannot establish hosted behavior or current CI health. No database/Auth implementation is changed by this editorial work.
