# The Logic: architecture and test evidence

## Page structure

The Logic explains the market tracker and its engineering approach in four sections:

1. Why I built this.
2. How the app works, including Tools and workflow.
3. How I test it.
4. AI and what comes next.

The initial version is complete and owner-accepted. The page uses the shared typography, spacing, cards and responsive layout. A data-flow diagram shows market, account and test-evidence relationships. The Board and The Tests navigation buttons follow Tools and workflow. Native disclosures expose source references and coverage limits without adding execution controls or simulated activity.

The interface was designed for mobile and desktop layouts. Browser viewport checks do not establish physical-device compatibility. GitHub Actions is the implemented CI system. Development used AI assistance, with feature design, code review and verification directed by the project owner.

## Implementation and evidence references

The combined nightly CI update is complete and owner-accepted locally on September 12, 2026. The brief Tools and workflow paragraph describes 2:17 a.m. Denver checks, parallel browser/offline and SQL/Auth responsibilities, trusted evidence and Cloud Run hosting, explicitly separating nightly execution from deployment. The existing evidence disclosure contains DST/scheduler limits and the telemetry source link; no section, layout, typography or palette was added. AI provenance and factual limits remain. See [nightly scope and release limits](test-telemetry.md#nightly-execution).

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
| Nightly schedule and trusted publication | `scripts/tests/nightly.test.ts`, [telemetry guide](test-telemetry.md) | Local fixtures and manual dispatch cannot prove a genuine scheduled run reaches Home/The Tests |
| Recorded demonstrations | [recordings guide](test-recordings.md) | Curated local captures with mocked dependencies, separate from CI results |

## Coverage limits and future work

- Market validation checks response structure, asset identity, timestamps and calculation rules. The opt-in private Yahoo/Finnhub comparison covers a limited dated sample; broad price reconciliation remains unimplemented.
- Failed asset validation leaves the watchlist unchanged. Browser tests cover that workflow; local SQL and Auth integration tests separately cover ownership and permissions.
- The dashboard distinguishes first-attempt passes, successful retries, failures and missing evidence. Recorded demonstrations use disclosed local fixtures and are separate from published CI outcomes.
- The page's visual regression review refers to manual inspection, not an automated screenshot-comparison suite. The reported build timeline is personal history, not a measured productivity benchmark.
- AI assistance remains disclosed. Future team adoption is an interest, not evidence of an existing professional rollout.

Broader market reconciliation and verification of subsequent releases remain in the [roadmap](roadmap.md). The [private comparison](market-comparison.md) and [hosted acceptance record](deployment.md) describe existing dated evidence. Feature acceptance does not establish current CI health, production availability or independent financial accuracy.

## Verification

Use Node 22 and the locked dependencies:

```sh
npm run lint
npm run build:e2e
npm run test:baseline
npm run test:e2e -- src/tests/specs/logic/logic.spec.ts src/tests/specs/navigation/navigation.spec.ts --workers=2
npm run build
```

The Logic page object contains scoped locators. Browser tests exercise public navigation and native keyboard disclosure under reduced motion, check content width, and capture both palettes on desktop Chromium/mobile WebKit using the isolated production server at port 3100. Inspect those captures for readability. Local checks cannot establish hosted behavior, current CI health or scheduled publication. These page checks do not validate database authorization or external OAuth.
