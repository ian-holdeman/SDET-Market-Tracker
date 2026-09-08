# Locally served fonts

Downloaded 2026-09-08 from the Google Fonts CSS API for the existing JetBrains Mono and Plus Jakarta Sans families, normal weights 400, 500, 600, 700 and 800. The returned TrueType files are served unchanged under semantic filenames by `fonts.css`; the app no longer needs browser requests to Google Fonts.

CSS source: https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..800&family=Plus+Jakarta+Sans:wght@400..800&display=swap

Both families are distributed under SIL Open Font License 1.1. Keep the accompanying copyright/license files with redistributed fonts:

- `JetBrainsMono-OFL.txt`: https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt
- `PlusJakartaSans-OFL.txt`: https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt

No font outlines or family names were modified. Files load on demand; local serving removes a third-party request, not browser caching or hosting metadata.
