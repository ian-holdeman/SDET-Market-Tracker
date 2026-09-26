# App icons

`app.svg` reuses the Header's Lucide TrendingUp silhouette with its existing dark/green branding. The glyph fits inside the central 80% diameter safe circle; the maskable PNG has a full-bleed background. Branding stays fixed across appearance palettes.

`notification-badge.svg` uses the same glyph in white on transparency. Its 96px PNG supplies the small monochrome notification badge on supporting browsers; notifications also supply the full-color app icon. Browser and OS attribution may remain visible.

Regenerate the committed PNGs with Node 22 and the locked development dependencies:

```sh
node scripts/generate-pwa-icons.mjs
```

Uses the repository's Playwright Chromium; no runtime icon dependency.
