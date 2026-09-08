# Privacy and security feature prompt

Status: draft for owner approval. No implementation authorized by this document alone.

## Purpose

Finalize the Privacy modal and review the controls supporting its statements. Use concise, neutral administrative language. No slogans, decorative assurances, legal jargon where plain wording works, or claims of universal compliance.

## Operator and policy

- Operator: Ian Holdeman, an individual based in Utah.
- Contact: ianrholdeman@gmail.com.
- Audience: general public, primarily U.S. visitors; not directed at children under 13.
- Hosting: U.S. public hosting planned; provider undecided.
- Function: public market browsing, optional Google sign-in and private watchlists.
- Prohibited additions: analytics, advertising, subscriptions, behavioral tracking and secondary use of personal data.

## Required work

Read AGENTS.md, README.md, the roadmap, [privacy scope](privacy-security.md) and [data inventory](data-inventory.md). Inspect git status and preserve all existing changes.

1. Verify the inventory. Review relevant U.S. requirements using current official sources. Distinguish applicable requirements, threshold-dependent rules and unresolved questions. Utah residence alone does not settle applicability.
2. Draft a short notice covering: information processed; purposes; service providers; browser storage; retention and deletion; external links; privacy requests; children; and policy updates. State actual tracking-signal behavior. Use the operator's contact and a policy date. Do not claim that sign-in collects no personal data or that deletion removes provider logs and backups. Obtain one approval of the assembled public copy.
3. Reduce unnecessary browser requests. Proposed approach: serve the existing fonts locally where licensing permits; deliver ticker logos through a bounded same-origin cache using an allowlisted provider. Do not forward visitor credentials, cookies or client-IP headers. Preserve searched assets and existing logo fallbacks. Verify provider terms. Present an alternative if this cannot preserve coverage. These changes are proposed scope, not completed work.
4. Review Auth scopes, redirects, session/PKCE cleanup, account deletion, watchlist ownership, admin separation, trusted endpoints, public file exposure, request limits, response headers, logs and dependency advisories. Reproduce identified defects before fixing them. Keep unrelated work separate.
5. Reuse established dialog components and page objects. Provide semantic labeling, keyboard operation, Escape/close behavior, focus trapping/restoration, mobile scrolling and reduced-motion support. Keep the notice publicly accessible. Use one copy source if a direct privacy URL is needed for OAuth.
6. Document request handling and retention decisions. Do not invent deadlines, backup policies or host settings. Keep hosting-dependent commitments open until confirmed. Do not add age collection by default.

## Acceptance and verification

- Preserve the accepted Home, Board, Tests and Logic behavior and appearance.
- The notice matches observed processing. No new personal-data collection is introduced.
- Verify browser request destinations, including newly searched assets, without recording real tokens or account contents.
- Test relevant failure cases using synthetic/disposable identities. Preserve retained local accounts.
- Run npm run lint and relevant npm run test:baseline checks. For UI changes, run npm run build:e2e and focused npm run test:e2e -- <specs> --workers=2 against the isolated production server on port 3100. Verify desktop/mobile and restore npm run build.
- For affected database/Auth boundaries, run local npm run db:test, npm run db:lint and npm run test:auth as applicable. Report unavailable checks and failures accurately.
- Update the inventory, domain guide and roadmap. Deliver approved copy, local changes, verification evidence and remaining launch requirements.

## Limits

No push, deployment, workflow dispatch, provisioning, remote configuration changes or remote data mutation without explicit authorization. Hosting selection and production verification remain separate tasks. A completed notice or local test run is not legal certification.

## Review references

Starting references checked 2026-09-08; verify current requirements during implementation:

- [Utah Consumer Privacy Act applicability](https://le.utah.gov/xcode/Title13/Chapter61/C13-61-S102_2024050120240501.pdf).
- [California Attorney General: privacy-policy disclosures](https://oag.ca.gov/sites/all/files/agweb/pdfs/cybersecurity/making_your_privacy_practices_public.pdf).
- [FTC: COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).
