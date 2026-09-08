# Settings and appearance

## Status and scope

Complete and owner-accepted on September 8, 2026, including both palettes, typography and page integration. Final polish removes the redundant account-retention sentence from the Clear Watchlist row. Settings is reached only from the signed-in user dropdown. A direct `/settings` visit waits for initial Auth verification, then shows either the account panel or the existing sign-in boundary. Guests have no Settings navigation or controls. Sign-out remains in the dropdown.

One compact panel places the Google display name at its top left and contains Appearance, Clear Watchlist, Delete Account and Privacy. The Privacy row links to the existing public `/privacy` page in the same tab. The footer modal and sign-in notice link remain public, with Operator last. The owner accepted this integration and the appearance disclosure, completing the local Privacy feature. Local checks do not imply deployment, current CI success or legal certification.

## Appearance contract

- Without a saved choice, appearance follows the device’s light/dark preference, including device changes while the page is open. Native Light/Dark radio controls support keyboard selection; there is no third device-theme pill. Selecting either pill, including the currently active one, saves an explicit override. Dark is the fallback only when the device preference API is unavailable.
- The only appearance storage is localStorage `imt_appearance`, containing exactly `light` or `dark` after an explicit selection. Initial rendering does not write a default. Missing or invalid values use the device preference.
- The preference belongs to this browser, not an account. It survives navigation, reload, sign-out and account deletion; another account in this browser inherits it. Clearing site storage makes the next load follow the device. Removing the key or clearing storage in another tab resets receiving tabs to their device preference.
- Blocked storage does not prevent rendering or current-tab selection. Without successful storage writes, a new load follows the device. An explicit current-tab choice still overrides device changes for that page’s lifetime. Storage events synchronize other tabs without echo writes; unrelated storage events do not alter appearance.
- No preference is sent to Supabase or the application server. No cookies, analytics, telemetry, providers or dependencies were added for appearance.

`public/appearance.js` runs synchronously from the document head before the application module and first rendered content. It is a self-hosted asset permitted by the existing production `script-src 'self'`; CSP was not weakened. `useAppearance` subscribes to the script's local change event. Only the root theme attribute changes: charts, dialogs, focus and playback do not remount for a preference change.

`src/theme.css` defines shared semantic palette tokens for canvas/panels, nested surfaces, text, borders, actions, focus, status and chart colors. Components consume those tokens directly through Tailwind utilities or SVG variables. Dark retains the established palette; Light uses coordinated pale surfaces and darker foregrounds. Keep typography, layout and chart semantics independent of palette changes. Brand artwork and recorded demonstration files retain their original colors; video controls inherit the page theme while footage remains unchanged.

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
npm run test:baseline
npm run build:e2e
npm run test:e2e -- src/tests/specs/settings src/tests/specs/auth src/tests/specs/privacy --workers=2
npm run db:test
npm run db:lint
npm run test:auth
npm run build
```

Browser checks use the isolated production server on port 3100 and synthetic account, market and test-evidence fixtures. Never rebuild shared `dist` while those tests run. The Settings specs cover auth boundaries, persistence, storage failure/reset, confirmation and duplicate requests, conflicting mutations, account races, uncertain reconciliation, palette contrast, desktop/mobile layout, and preservation of chart/player nodes. Existing public-page and nested-dialog checks cover integration. Visual captures under ignored `.telemetry/settings` are local diagnostics, not published test evidence. The shared synthetic candle fixture uses milliseconds, matching the provider contract; existing recording media was not regenerated.

Offline checks exercise initial synchronous theme application and storage-event handling. Disposable local Auth/REST integration verifies bulk clear preserves another user's watchlist, both identities, the admin assignment and shared assets/curation; existing SQL and deletion integration cover RLS and cascades. These do not prove hosted OAuth, production availability, independent market accuracy or universal accessibility. Sampled contrast and visual checks are not an exhaustive accessibility audit.

Hosting selection, Parqet permission, production OAuth/privacy URL configuration, infrastructure retention and separately authorized production verification remain launch work. No push, deployment, workflow dispatch, provisioning or remote data/configuration change is part of this feature.
