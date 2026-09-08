# Privacy and security review preparation

## Status and scope

Next owner-requested feature; preparation only. The implementation scope and public privacy copy are not yet approved. Initial-version acceptance of Home, Board, Tests and Logic does not establish security certification, regulatory compliance or hosted readiness.

Proposed scope: inventory data flows and browser storage; reconcile the notice with actual behavior; review authentication, authorization, trusted endpoints, public asset exposure and dependency/configuration risks; fix evidenced issues with regression coverage; verify the modal's keyboard, focus, mobile and reduced-motion behavior. Hosting-dependent controls and legal applicability must remain explicit open items until their prerequisites are known. No hosted mutations, deployment or resource provisioning are authorized by this preparation.

## Repository starting points

The [application data inventory](data-inventory.md) now records source-backed processing, recipients, storage lifetimes, deletion limits and a fresh anonymous browser observation. Use it as the starting evidence for notice wording and minimization decisions; findings are not yet remediated or approved public copy.

- `src/components/PrivacyModal.tsx`: existing notice discusses Google sign-in, Supabase, browser sessions and account deletion. The broad Zero Tracking heading needs reconciliation with external requests and provider policies. The component currently lacks dialog semantics and explicit focus trapping/restoration and Escape handling; reuse the application's existing accessible dialog approach after inspecting it.
- `src/components/TickerLogo.tsx`: some logos are loaded directly from assets.parqet.com in the browser, including preload requests. Review this alongside other external browser requests; absence of advertising code does not establish absence of provider logs.
- `src/lib/supabase.ts`, `src/lib/supabaseConfig.ts` and `src/context/AuthContext.tsx`: inspect session persistence, identity fields, OAuth redirects and sign-out/deletion behavior without exposing credentials.
- `supabase/README.md`, versioned migrations and `supabase/tests/authorization.test.sql`: established ownership/grants model and local verification. Database-owner privileges differ from ordinary app admin permissions.
- `server.ts`, `server/`, `scripts/auth-tests/` and [registration](symbol-registration.md): inspect server boundary validation, privileged operations, errors, request limits and account deletion. Verify actual handling rather than relying on notice claims.
- [Market data](market-data.md) and [telemetry](test-telemetry.md): server-side provider access, private evidence snapshots and retention/expiry boundaries. Google Finance links leave the app when followed.

These are source-review observations and review targets, not completed security findings or a comprehensive audit. No dependency audit or new database/Auth verification was performed for this documentation closeout.

## Owner direction

The owner plans public hosting in the United States and prioritizes U.S. visitors, particularly prospective employers. Review U.S. obligations first; this is not a decision to block international access or proof that other obligations cannot apply. The operator is Ian Holdeman, acting personally from Utah. The app is for a general audience and is not directed at children under 13. The hosting vendor remains unspecified.

## Decisions required before implementation

Public privacy/deletion contact: ianrholdeman@gmail.com (owner's personal/professional address, authorized for this purpose).

The owner requires a minimal-data product: public market browsing, optional sign-in and a private saved watchlist. No analytics, advertising, email subscriptions, behavioral tracking or secondary use of user information is planned or authorized. Do not add data collection to simplify implementation. Inventory and minimize information required by authentication, watchlist storage, operational security and provider requests; this policy must not be rewritten as a claim that authentication processes no personal data or that third parties keep no logs.

- Approve the proposed minimization and review scope in [the feature prompt](privacy-feature-prompt.md). General-audience intent is established; do not introduce birth-date collection or age verification without a demonstrated need.
- Hosting and database/Auth regions, provider retention/log settings and operational access once a hosting solution is chosen. Do not invent retention periods or promise deletion from provider backups.

Determine applicable obligations using current authoritative sources after the operating context is known. Separate verified technical controls, owner policy decisions and any remaining legal review; do not claim blanket compliance.

## Proposed verification boundaries

Use offline regressions for server/data handling changes, isolated production browser tests for notice/navigation/accessibility, and disposable local Supabase/Auth checks for ownership and account operations. Preserve existing accounts; do not reset retained data. Recheck affected dependencies/configuration as appropriate and record actionable evidence without secrets. Hosted OAuth, transport/security configuration, provider retention and production functionality require separate authorized verification on the chosen environment. Follow the commands and environment boundaries in [AGENTS.md](../AGENTS.md) and [README](../README.md).
