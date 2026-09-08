# Engineering instructions

## Purpose and starting context

This is a personal market tracker and a Senior SDET portfolio. Favor understandable, defensible engineering and evidence of complex core-workflow coverage. Preserve the sleek, minimalist UI unless the task authorizes a visual change. Budget-conscious infrastructure and accessible visitor access are product requirements.

Start with git status and the relevant implementation; preserve staged and unstaged work. Read [README](README.md) for commands, [project overview](docs/project-overview.md) for architecture and decisions, and [roadmap](docs/roadmap.md) for scope. Read only the domain guides needed for the task. Treat repository code and current evidence as authoritative over historical chat claims. Check configuration presence without printing secrets.

## Feature workflow across sessions

- For substantial new features, inspect the existing implementation and relevant tests first. Complete useful feasibility checks, then ask focused questions about unresolved product choices. Propose scope, design, evidence limits, and acceptance criteria before drafting the implementation prompt. Wait for agreement on those choices; do not restart approval for already accepted work or routine polish.
- The agreed prompt should name the affected surface, preserved behavior, test scenarios, evidence source, validation commands, and delivery boundaries. Use repository guides to carry these decisions across sessions; do not rely on chat memory. Carry accepted changes to earlier decisions into those guides and remove temporary feature prompts once their decisions are preserved. Do not reopen accepted product choices.
- For behavior changes, start with a meaningful failing test or regression reproduction, confirm it fails for the intended reason, implement the smallest coherent change, then refactor with the checks passing. Prioritize externally observable behavior and boundary failures. Pure copy/icon changes need proportionate visual verification, not tests that assert implementation details.
- Validate and present a reviewable local result, incorporate design feedback, then update the roadmap and relevant guide when the owner accepts the feature. Preserve the owner’s stated milestone (for example, initial draft complete); acceptance does not imply CI success, deployment, or production readiness. Carry deferred scope forward explicitly without treating it as the next authorized task.

## Scope and implementation

- Work in focused, reviewable slices. Resolve the requested behavior end to end; avoid unrelated cleanup, speculative abstractions or dependencies.
- Use TypeScript types and runtime validation at external boundaries. Keep calculations, parsing and selection logic independently testable; inject time and external requests where useful.
- Share genuinely repeated domain and presentation logic. Prefer small components/functions and existing utilities over parallel implementations or a new framework.
- Preserve legitimate zero and negative values; distinguish unavailable values from zero. Never invent market data, successful operations, test results, activity or freshness.
- Handle asynchronous races: late responses cannot overwrite newer state, requests have deadlines, duplicate work is coalesced, caches are bounded, and resource cleanup is explicit.
- Keep provider observation time separate from retrieval time. Cached data retains its provenance and original timestamps; refresh failure must remain visible.
- Preserve asset identity metadata through the full provider-to-UI path. External finance links need explicit provider identifier/venue translation; never guess a venue or rely on a bare ticker redirect. Cover newly searched assets as well as curated assets, and label unresolved destinations as searches.
- Document material decisions and limits with the implementation. Do not claim production readiness, financial accuracy, compliance or CI success without evidence supporting that specific claim.
- Keep public documentation focused on product behavior, architecture, technical tradeoffs, reproduction and evidence limits. Exclude career coaching, suggested talking points, drafting transcripts and instructions about presenting the project to an evaluator. Keep the real AI-assistance disclosure and factual limitations; removing coaching must not conceal provenance or unsupported claims.

## UX and accessibility

- Keep layout, dimensions and styling stable outside authorized changes. Use existing card, typography, spacing, currency and status conventions; verify desktop and mobile. Consume the shared semantic tokens in src/theme.css and check both palettes, including negative charts, hover labels and unavailable states. Follow docs/settings.md for device defaults and browser-only overrides; preserve recorded media colors and mounted chart/player/dialog state.
- Use plain, scenario-specific copy and only useful detail; avoid formulaic step counts and repeated explanations. Keep audit identifiers in evidence artifacts when they do not help the visitor. Small icons need bold, simple silhouettes checked at actual mobile size; decorative graphics must not imply live activity.
- Prefer literal headings, concise labels and prominent useful metrics. Let bars, icons and state labels carry information without repeating it in captions; omit redundant controls. Put technical evidence in details, not default product views. No fabricated live activity, loading theatrics or count-up metrics.
- Distinguish initial loading, empty, unavailable, stale and failure states. Preserve usable evidence, focus and playback during bounded background verification; do not remount a view merely because its retrieval timestamp changes. Apply the domain’s stale/expiry policy when verification fails. Skeletons reserve real layout space; respect reduced motion.
- Use semantic elements, accessible names and keyboard operation. Dialogs must close reliably, keep focus inside, and restore focus to the opener, including nested dialogs and Safari.
- Prefer role/name locators for interactive controls. Use stable, scoped data-testid values for repeated data or nonsemantic elements; do not derive test identity from CSS or display copy. Scope duplicate Home/dashboard/report metrics to their containing view.
- Keep selectors and reusable interactions in existing page objects/components under src/tests/pages. Share repeated locator logic; keep assertions and scenario intent in tests. Avoid arbitrary sleeps and structural selectors when semantic ones exist. Use locator actions that wait for scrolling/layout stability, and inspect the current route and state before repeating an action after reload: Board asset URLs already restore an expanded card. Control device color scheme explicitly when a scenario depends on its default.
- Configure appearance independently in popup/new-tab tests; a page-level media override does not establish the popup's palette. Verify the resulting theme before taking captures.

## Security and domain invariants

- Visitors can browse Board, Tests and Logic without an account. Google sign-in enables private watchlists; employers receive no special privileges.
- Watchlist ownership is the authenticated Supabase UUID. Enforce grants and RLS in the database; UI visibility is not authorization. Admins may curate the shared Board but cannot access other users' watchlists or self-assign roles.
- Editable profile metadata never grants authority. Provision admin assignments only through a trusted owner procedure. Use versioned migrations, explicit grants, constraints and deny-by-default policies.
- Asset identity and curated membership are separate. Removing curation must preserve watchlists. Searched-asset registration verifies the caller and provider symbol, and grants no curation or role privileges.
- Account deletion verifies the caller server-side and uses Auth admin deletion. Clear sessions only on confirmed success; explain uncertain failures. Personal records and roles cascade; shared assets remain. A fresh UUID inherits nothing. Do not promise erasure from provider logs/backups.
- Keep secrets server-side or in CI secrets, never VITE variables, tracked files, logs or report attachments. Only dist/client is public in production; server artifacts and snapshot storage stay private.
- Firebase is retired. Do not restore it or connect to the old database. Use the configured project only after verifying the target; local fixtures must never reach a hosted database.
- Published telemetry comes from trusted GitHub Actions evidence. Local runs cannot overwrite it; ingestion success is not test success. At most one retry: first-attempt success is passed, retry success is flaky, retry failure is failed. Preserve attempts, missing cases and infrastructure failures. Pass Rate excludes flaky successes and uses all collected test-project cases as its denominator; empty evidence is never 100%.
- Visitors never trigger execution. Demonstrations use recordings or genuine recorded CI evidence, not simulated live runs. Reuse validated evidence readers before extending publication or permissions. Identify which suites a result feed actually covers; independently available job metadata cannot establish missing case outcomes. Snapshots are validated caches, not publication authorities; revalidation must honor upstream removals/expiry.

## Validation workflow

Use Node from .nvmrc and the locked npm dependencies. Choose checks appropriate to the changed boundary:

| Change | Checks |
| --- | --- |
| TypeScript or application behavior | npm run lint; relevant npm run test:baseline checks; npm run build |
| UI, navigation or browser integration | npm run build:e2e; focused npm run test:e2e -- <spec> --workers=2; restore npm run build afterwards |
| Grants, RLS, schema or trusted account operations | Local Docker/Supabase; npm run db:test; npm run db:lint; npm run test:auth where applicable |
| Provider behavior | Deterministic offline tests first; opt-in npm run test:market:live or npm run test:market:coverage separately |
| Documentation only | Check referenced commands, paths, links and contradictions; no application suite solely for prose changes |

- Browser tests use an isolated production server on port 3100 and mocked external APIs; do not point them at the interactive development server. Do not rebuild shared dist while browser tests are running. Finish builds before starting lint or baseline checks too: the current TypeScript configuration includes generated JavaScript, so cleaning dist concurrently can produce missing-file failures.
- Prioritize boundary failures, ownership, retry history, race conditions and meaningful financial calculations. Avoid tests that merely mirror implementation or assert styling classes.
- Exercise external-boundary feasibility early: for media, verify decoded frames and dimensions in the target browsers, not merely a moving playback clock. Reuse deterministic, populated fixtures for incidental services in demonstrations; keep the scenario’s intended failures and disclose simulated dependencies. Never improve appearance by hiding failed assertions or substituting a success state.
- For document previews, verify MIME type, decoded pages, selectable text and downloaded bytes against the canonical artifact. Viewing must not trigger a download; test the explicit download action separately. Keep one canonical editable source and synchronize its public PDF after reviewed edits.
- Test recovery after a failed module or worker load, not just the initial error. Failed imports can remain cached for the page lifetime; an isolated preview may need a reload to recover. Retain unaffected application state and clean up requests, workers and observers.
- Browser mocks cannot prove RLS, OAuth-provider behavior, or independent market accuracy. Use real disposable local integration tests for database/Auth boundaries. Keep live provider checks outside the offline CI gate.
- Report failed attempts and flakes honestly, investigate them, and rerun only when a change or unresolved concern justifies it. Never loosen assertions or hide retries to obtain green results. For replay and expiry tests, align the browser clock and fixture verification timestamps, then explicitly control time before timing-sensitive actions; do not let click latency decide the expected result.
- Do not reset a database containing accounts the owner wants to retain. Prefer migration up --local for existing local data; reset only disposable fixtures with understood consequences. See supabase/README.md.
- Restart the local server after server/config changes when verifying runtime behavior. State unavailable checks and exact prerequisites. Local checks do not establish hosted publication or deployment behavior.

## Delivery and authorization

Continue routine edits and validation within the authorized task. Do not add unnecessary confirmation steps. Do not push, deploy, purchase services, create hosted resources, change machine settings or mutate remote data unless the user authorized that action; do not treat a previous slice's permission as blanket future authorization.

Finish with a concise PR-style account of behavior changed, rationale, checks passed, remaining risks and unverified boundaries. Open the local changes for review when available. Keep documentation current; store durable decisions in domain guides and future work in the roadmap rather than appending conversational transcripts or evergreen test counts. Preserve UTF-8 explicitly when scripting text edits and inspect diffs for encoding damage.

Keep generated drafts and QA artifacts in ignored local directories. Preserve canonical sources and useful failure evidence; remove obsolete task-specific builders only after their maintained replacement exists. Do not delete another task's files or erase evidence to make the workspace appear clean.
