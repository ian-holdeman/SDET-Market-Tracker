# Contact

## Status and interface

Contact and the main two-page resume are complete and owner-accepted for the local initial version. Hosting and production verification remain separate.

Keep the established three-option design, fonts and shared light/dark palette. The header subtitle is exactly “Engineering inquires and SDET opportunities”. The Custom Build and Open to Roles badges are removed. The full-time hiring subtext remains “View my experience in test automation and quality engineering.” Preserve the third-option joke: “Don't ask me! I'm just a guy who likes finance.” The existing email address and custom-development option remain.

## Resume scope

The canonical editable source is `docs/resume/ian-holdeman-resume.html`; its approved PDF is `docs/resume/ian-holdeman-resume.pdf`. `public/resume.pdf` is the identical public copy. Earlier drafts are local artifacts, not maintained sources. The resume has two pages with selectable text, professional and personal experience, education and a compact certificates section.

The project's live-application link is [https://sdet-market-tracker-855618435389.us-west1.run.app](https://sdet-market-tracker-855618435389.us-west1.run.app). Only the pending URL was changed; approved wording and credentials were preserved. Both regenerated pages were rendered and inspected, extraction was compared with the approved text, and the canonical/public PDFs match byte for byte. For future authorized edits, update the canonical HTML, then run `node scripts/render-resume.mjs` with Node 22 and the installed Playwright Chromium browser. The script updates the canonical and public PDFs together; it is never run automatically by an application build. Visually inspect every rendered page and verify text extraction after any resume edit. Credential links and award dates are not included in the source.

Contact opens `/resume` in a new tab, preserving the original page and modal. This standalone route mounts `ResumeViewer` without the market/Auth application providers. A lazily loaded, pinned PDF.js dependency and same-origin worker decode `/resume.pdf` into page canvases with selectable text layers. The paper remains white in both palettes, and the surrounding view follows the existing device/browser appearance preference. Rendering uses the PDF itself, not an HTML facsimile or pre-rendered page images. No third-party viewer service, new server endpoint, CSP relaxation, or visitor authentication is needed.

Viewing never triggers a download action. A subtle “Download PDF” link explicitly downloads `Ian-Holdeman-Resume.pdf`. The PDF must have the correct content type and `%PDF-` signature, and downloaded bytes must match the canonical file. Missing files, HTML fallbacks, corrupt PDFs and unavailable workers show an error with a retry and optional download. Fetch/parse and page rendering have bounded deadlines; cancellation, render tasks, workers and resize observers are cleaned up. Retry reloads the standalone page so failed module/worker imports cannot poison later attempts.

## Modal behavior and validation

Contact now uses the shared native `Dialog`, preserving focus containment, Escape/close handling, bounded mobile scrolling and focus restoration. The Footer explicitly focuses the opener for Safari. Shared Dialog additions are optional subtitle and contact-width props; existing consumers retain their defaults.

`src/tests/pages/contact.page.ts` owns Contact/Resume locators, reusing the Footer opener. Focused browser coverage uses an isolated production server on port 3100 and populated synthetic incidental services. It checks the actual popup, decoded page pixels and selectable text, both palettes, keyboard behavior, direct visits/reload, byte-for-byte optional downloads, malformed/missing PDF responses, worker recovery and stalled/late requests. The worker-recovery regression initially failed on both projects, including retries; reloading the preview clears the cached failed worker import. Local browser evidence does not establish physical-device support, hosted availability or current CI success.

```sh
npm run build:e2e
npm run test:e2e -- src/tests/specs/contact/contact.spec.ts src/tests/specs/navigation/navigation.spec.ts src/tests/specs/settings/settings.spec.ts --workers=2
npm run lint
npm run test:baseline
npm run build
```

Email actions remain user-initiated; tests inspect destinations without sending mail. Do not send emails as part of verification.

Keep this work focused on Contact and the resume. Hosting choice, remote configuration, deployment and production verification remain separate authorized steps. Maintain [roadmap](roadmap.md) and [privacy/security launch requirements](privacy-security.md).

Copy-email feedback waits for successful clipboard completion. Rejection/unavailability permits retry with an accessible failure message; pending requests cannot report success after closure and feedback timers are cleaned up. The resume URL is synchronized with the confirmed Cloud Run origin.
