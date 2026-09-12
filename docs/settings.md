# Settings and appearance

## Status and scope

Settings was completed and owner-accepted on September 8, 2026, including both palettes, typography and page integration. Final polish removes the redundant account-retention sentence from the Clear Watchlist row. Settings is reached only from the signed-in user dropdown. A direct `/settings` visit waits for initial Auth verification, then shows either the account panel or the existing sign-in boundary. Guests have no Settings navigation or account controls. Sign-out remains in the dropdown.

The public header appearance control is complete and owner-accepted locally on September 12, 2026, including the immediate palette switch requested during review. Guests and signed-in users can switch palettes with a compact sun/moon button immediately beside Sign In/profile. The existing Settings selector remains available and synchronized. The button has a 44px touch target, an action label of “Switch to light mode” or “Switch to dark mode,” and a visible keyboard focus ring. Header heights and navigation placement are retained; the compact brand is also used at 768–1023px, and long profile names truncate more narrowly below 375px to prevent crowding. The subsequent Light-mode visibility corrections are complete and owner-accepted locally on September 12, 2026.

One compact panel places the Google display name at its top left and contains Appearance, Clear Watchlist, Delete Account and Privacy. The Privacy row links to the existing public `/privacy` page in the same tab. The footer modal and sign-in notice link remain public, with Operator last. The owner accepted this integration and the appearance disclosure, completing the local Privacy feature. Local checks do not imply deployment, current CI success or legal certification.

## Appearance contract

- Without a saved choice, appearance follows the device’s light/dark preference, including device changes while the page is open. Native Light/Dark radio controls support keyboard selection; there is no third device-theme pill. Selecting either pill, including the currently active one, saves an explicit override. Dark is the fallback only when the device preference API is unavailable.
- The only appearance storage is localStorage `imt_appearance`, containing exactly `light` or `dark` after an explicit selection. Initial rendering does not write a default. Missing or invalid values use the device preference.
- The preference belongs to this browser, not an account. It survives navigation, reload, sign-out and account deletion; another account in this browser inherits it. Clearing site storage makes the next load follow the device. Removing the key or clearing storage in another tab resets receiving tabs to their device preference.
- Blocked storage does not prevent rendering or current-tab selection. Without successful storage writes, a new load follows the device. An explicit current-tab choice still overrides device changes for that page’s lifetime. Storage events synchronize other tabs without echo writes; unrelated storage events do not alter appearance.
- No preference is sent to Supabase or the application server. No cookies, analytics, telemetry, providers or dependencies were added for appearance.

`public/appearance.js` runs synchronously from the document head before the application module and first rendered content. It is a self-hosted asset permitted by the existing production `script-src 'self'`; CSP was not weakened. Both Header and Settings use `useAppearance`, which subscribes to the script's local change event. Neither control adds a preference store. The root theme attribute selects the palette; charts, dialogs, focus and playback do not remount for a preference change.

Palette changes are immediate, following owner feedback on distracting color/gradient interpolation. During a change, the shared script temporarily suppresses CSS transitions, commits the new palette through a synchronous style/layout flush, and removes the suppression before returning. This also applies to device and cross-tab updates. No overlay, fade, timeout or animation-frame cleanup is used; normal hover transitions resume immediately, and CSS animations and media playback are not reset. `appearance-transition.spec.ts` checks that palette changes emit no intermediate color/gradient transitions and that desktop hover feedback still works.

`src/theme.css` defines shared semantic palette tokens for canvas/panels, nested surfaces, text, borders, actions, focus, status and chart colors. Components consume those tokens directly through Tailwind utilities or SVG variables. Dark retains the established palette; Light uses coordinated pale surfaces and darker foregrounds. Keep typography, layout and chart semantics independent of palette changes. Brand artwork and recorded demonstration files retain their original colors; video controls inherit the page theme while footage remains unchanged.

## Targeted Light-mode visibility

The September 12 visibility update is complete and owner-accepted locally. The Google action retains its dark body label and full-width placement. Light mode pairs it with `info-surface-950`, then a 25% informational-blue tint on hover. Connecting uses `ink-muted` on `surface-800` at full opacity, with the existing disabled semantics and progress label. Its existing keyboard focus outline remains visible. Touch WebKit does not apply desktop hover colors.

Review of Home, Board, Tests, Logic, Privacy, Settings and dialogs found several additional low-contrast combinations. Corrections are confined to these consumers through the shared `light:` variant; no palette token values, typography, spacing or dimensions changed:

| Sampled Light-mode label | Finding and correction | Before → after contrast |
| --- | --- | --- |
| Continue with Google | Saturated blue behind inherited dark text; use the existing pale informational surface | 2.83 → 11.99 at rest/focus; 2.18 → 10.22 on desktop hover |
| Connecting | Half-opacity text and background; use explicit muted foreground and neutral surface | 1.43 → 5.21; disabled desktop hover 1.29 → 5.21 |
| Settings empty/pending actions | Half-opacity labels faded with their surfaces; use the same readable muted/neutral pairing while retaining disabled semantics | 2.31–2.45 → 5.21 |
| Contact resume link | Dark green foreground over a translucent dark green fill; use `positive-surface-950` at 50%, 80% on hover | 3.76 → 4.88 at rest; 3.23 → 4.86 on desktop hover |
| Home positive mover badges | Green tint compounded with the inset surface; use the pale positive surface at 50% | 4.40 → 4.93 |
| Board period dollar change | Secondary 90% opacity reduced small-label contrast; retain full label opacity in Light mode | 4.10 → 4.74 |
| Selected recording tab | Dark green tint reduced label contrast on its surrounding surface; use the pale positive surface at 50% | 4.35 → 4.89 |

The remaining sampled default page/dialog text did not require a global foreground change. Negative chart strokes, hover labels and unavailable messages retain their existing palette semantics. Dark action foregrounds/backgrounds and sampled ratios are unchanged, as are recorded footage and immediate switching through Header/Settings. This is targeted Light-mode evidence, not universal accessibility conformance: for example, the retained desktop Dark Google hover label measures 3.43:1.

`src/tests/pages/components/contrast.ts` now shares measurement across theme specs. It composites foreground alpha, transparent ancestor surfaces and nested opacity groups, and waits for finite entrance/hover animations before sampling. It rejects background images for assertions; its diagnostic text inventory does not model overlapping siblings, gradients, pseudo-elements, video or glyph antialiasing. Those require visual review. Measurements use rendered CSS colors converted to sRGB; the 4.5:1 target also applies to the specifically corrected disabled Light labels as a product readability choice.

`action-contrast.spec.ts` exercises Google default, hover, keyboard focus, connecting/disabled, disabled hover and provider-unavailable recovery, plus Settings pending/empty actions and duplicate-request prevention. `themes.spec.ts` adds reusable page-object locators for mover/dollar-change labels and checks Contact and the selected recording tab. Before/after captures and measurements live under ignored `.telemetry/light-visibility`, with Google and Settings failing regressions retained separately. The first opacity-aware chart run exposed entrance-animation sampling failures that passed on retry; the helper now waits for the animation instead of weakening contrast thresholds. Browser mocks establish local UI behavior only, not hosted OAuth, database authorization or production readiness.

The wider browser validation also recorded a mobile WebKit no-fade test flake. An isolated diagnostic identified the header's normal focus/blur `outline-color` event before the palette changed. The test now settles focus feedback before observing keyboard activation of the Settings radio; the no-intermediate-transition assertion and appearance implementation are unchanged. Repeated Chromium/WebKit verification passed without retries after this correction. Original first attempts, retries and diagnostic output remain in the ignored evidence directory.

Local lint, the fixture build and the offline baseline passed. The final focused action-contrast, theme and appearance-transition specs passed in desktop Chromium and mobile WebKit without retries; before/after captures were visually reviewed in both palettes. The wider Settings/Auth/Privacy/Contact run had the single retry-success noted above. The normal build was restored after browser verification. Database/Auth integration and hosted OAuth were not rerun for these presentation changes; owner acceptance covers this local update; release verification remains separate.

## Watchlist clearing and account deletion

`authService.clearUserWatchlist` performs one Supabase `watchlist_items` DELETE filtered by authenticated UUID, returning and validating the affected-symbol response. Existing grants/RLS remain authoritative. Empty results are valid because the owner may already have an empty watchlist. No schema, privileged operation or symbol-by-symbol loop was added. Shared assets, curation, Auth identities and admin assignments are untouched by clear.

The panel shows only the saved-asset count and disables Clear for an empty watchlist. Account-retention detail belongs in the confirmation, not the option row. AuthContext excludes simultaneous clear/add/remove/delete requests using one synchronous mutation lock; conflicting writes receive an explicit wait message. Board stars/counts update only from confirmed writes or a subsequent verified read. Auth event generations prevent old requests from updating a different or signed-out account, and profile-read ordering prevents a stale refresh from restoring pre-clear items.

A failed or missing response remains visibly uncertain. AuthContext reloads the owner's watchlist using the normal Supabase read boundary. A verified read can show that an uncertain clear actually completed, without relabeling its response as confirmed. If verification also fails, displayed items remain, the error explains the limit, and further watchlist writes are blocked until a successful profile reload. Watchlist REST operations have a 15-second deadline; existing asset registration and account deletion keep their separate deadlines.

Account deletion reuses the server-verified `DELETE /api/account` path and success-only session cleanup. Failure preserves the account and explains uncertainty. The service checks that the session UUID still matches the confirmed account before sending deletion. Cleanup accepts token refresh for that same account, while late completion cannot clear a newer account's session. Deletion does not erase Google accounts, shared assets, provider logs/backups or the appearance preference.

Settings confirmations reuse `Dialog`, extracted from the existing test-result dialog. Native modal semantics, explicit Tab wrapping, Escape/close, opener restoration, bounded scrolling and no entry animation support keyboard, mobile and reduced-motion use. Closing an in-flight confirmation does not cancel its request: the Settings panel continues to show progress and disables repeat operations. When successful clear disables its opener, focus returns to the Settings heading.

## Privacy amendment

The shared Browser storage paragraph adds:

> The browser also stores your light or dark appearance preference when you choose one. Otherwise, the application uses your device’s appearance. This setting stays in this browser and is not sent to the application server. It remains after sign-out or account deletion; clearing site storage removes it.

The notice date remains September 8, 2026, the date of this amendment and the earlier notice review. All other approved notice wording and provider/log/backup limits remain. See [data inventory](data-inventory.md) and [privacy/security guide](privacy-security.md).

## Reproduction and evidence limits

Use Node from `.nvmrc` and the locked dependencies:

```sh
npm run lint
npm run build:e2e
npm run test:baseline
npm run test:e2e -- src/tests/specs/settings src/tests/specs/auth src/tests/specs/privacy src/tests/specs/contact --workers=2
npm run db:test
npm run db:lint
npm run test:auth
npm run build
```

Browser checks use the isolated production server on port 3100 and synthetic account, market and test-evidence fixtures. Never rebuild shared `dist` while those tests run. The Settings specs cover auth boundaries, persistence, storage failure/reset, confirmation and duplicate requests, conflicting mutations, account races, uncertain reconciliation, palette contrast, desktop/mobile layout, and preservation of chart/player nodes. Existing public-page and nested-dialog checks cover integration. Visual captures under ignored `.telemetry/settings` are local diagnostics, not published test evidence. The shared synthetic candle fixture uses milliseconds, matching the provider contract; existing recording media was not regenerated.

The public-control regression starts with a guest looking for the header action and switching both ways; before implementation it failed because the button was absent in Chromium and mobile WebKit, including the configured retry. `header-appearance.spec.ts` covers guest navigation/reload, device changes before and after selection, protected account controls, Settings and cross-tab synchronization, Tab/Enter/Space and retained focus, and both palettes at narrow/intermediate/desktop widths with long profile names. `persistence.spec.ts` also exercises public switching with completely blocked storage and a cross-tab header change during a pending account dialog. `themes.spec.ts` verifies direct header switching preserves chart nodes/path and decoded video playback position/speed, while cross-tab changes preserve focus. Recordings retain their original files and unfiltered colors. Header captures and failure artifacts are under ignored `.telemetry/header-appearance`; these fixtures establish local UI behavior only.

The header update passed local lint, the fixture build, offline checks and focused Chromium/mobile WebKit verification after corrections. The final header/persistence run passed without retries, and the normal build was restored. Earlier missing-control, responsive-fit, repeated-resize and pending-dialog locator failures and their configured retries are retained in the diagnostic directory. Desktop/mobile captures were inspected in both palettes. Database/Auth integration was not rerun for this UI-only update.

Offline checks exercise initial synchronous theme application and storage-event handling. Disposable local Auth/REST integration verifies bulk clear preserves another user's watchlist, both identities, the admin assignment and shared assets/curation; existing SQL and deletion integration cover RLS and cascades. These do not prove hosted OAuth, production availability, independent market accuracy or universal accessibility. Sampled contrast and visual checks are not an exhaustive accessibility audit.

Hosted verification of this header update remains separate under the [deployment guide](deployment.md). No push, deployment, workflow dispatch, provisioning or remote data/configuration change is part of this feature.
