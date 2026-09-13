# Contact and resume

Contact provides engineering inquiries, SDET opportunities and custom-development options, alongside a two-page resume.

## Resume experience

The resume opens in a separate browser view, preserving the original page. Visitors can read selectable text and use an explicit PDF download. Viewing does not automatically download the document.

The paper stays white in both appearance modes, while the surrounding interface follows the browser's selected palette. Missing or unreadable documents show an error with recovery options.

The resume retains employment information, education, course names and the AI-assistance disclosure. Course-provider references establish the official course names; they do not independently verify completion records or imply a full professional certificate.

## Accessibility and evidence

The Contact dialog supports keyboard navigation, Escape/close and focus restoration. Browser checks cover decoded PDF pages, selectable text, matching download bytes, appearance modes and recovery from document or viewer failures.

These checks establish behavior in the tested desktop Chromium and mobile WebKit environments. They do not establish physical-device compatibility or current hosted availability. See [test coverage](test-audit-implementation.md).

Email actions are visitor-initiated. Contact does not submit an in-application message form; an email uses the visitor's mail provider. See [privacy](privacy-security.md).
