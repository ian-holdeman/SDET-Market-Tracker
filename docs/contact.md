# Contact

## Status and agreed direction

Contact is the remaining small feature before hosting, pending the owner's resume upload and assembled review. Settings, application themes and Privacy are complete and owner-accepted; their acceptance does not complete Contact or production verification.

Keep the established three-option design, spacing, fonts and shared light/dark palette. The full-time hiring subtext is now: “View my experience in test automation and quality engineering.” Preserve the third-option joke: “Don't ask me! I'm just a guy who likes finance.” Keep the existing email address and custom-development option unless the owner requests a change.

## Resume scope

The owner requested a light review and clean update, not a wholesale rewrite. Preserve their factual experience, dates, roles and personal voice. Improve clarity, grammar, consistency and concise professional phrasing; do not invent achievements, metrics, credentials or responsibilities. Review the uploaded source before deciding formatting changes. Use the relevant document/PDF workflow, render the final artifact and check readability and links.

The existing modal links to `/resume.pdf`; there is currently no file at `public/resume.pdf`. Do not treat an SPA fallback or HTTP 200 as a working PDF. After the owner supplies the resume, prepare the intended artifact under the public client assets for local review and verify PDF content type, decoded pages and the actual link in both browser projects. Publication remains part of separately authorized deployment.

## Remaining modal checks

`src/components/ContactModal.tsx` currently uses a custom animated overlay. Finish keyboard/modal semantics, focus containment and restoration, mobile scrolling and reduced-motion behavior using the shared `Dialog` where appropriate. Reuse existing Footer page-object controls and fixtures.

The copy-email handler currently reports success before its clipboard promise resolves and does not clean up its feedback timer. Cover success, rejected/unavailable clipboard and closure before adding reliable feedback. Email actions must remain user-initiated; tests inspect destinations without sending mail. Do not send emails as part of verification.

Keep this work focused on Contact and the resume. Hosting choice, remote configuration, deployment and production verification remain separate authorized steps. Maintain [roadmap](roadmap.md) and [privacy/security launch requirements](privacy-security.md).
