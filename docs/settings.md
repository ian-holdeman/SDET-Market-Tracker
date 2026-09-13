# Settings and appearance

Settings provides appearance preferences, watchlist clearing, account deletion and privacy information. Account controls require sign-in; the public header appearance toggle is available to everyone.

## Appearance

Without an explicit choice, the interface follows the device's Light/Dark preference. A saved choice applies across navigation and synchronizes other open tabs in the same browser.

The preference stays in browser storage. It is not sent to the application server or attached to an account, and it survives sign-out or account deletion. Clearing site storage restores the device default. Blocked storage still permits changing the current tab's appearance.

Palette changes preserve chart state, open dialogs, focus and video playback. Recorded footage retains its original colors. Keyboard labels, focus indicators and touch targets support the public appearance control.

## Watchlist and account controls

Clearing a watchlist requires confirmation and affects only the signed-in account's saved assets. Shared asset identities and Board curation remain available. An empty watchlist is a valid state.

Failed or uncertain operations remain visible. The interface does not claim success from a missing response, and late responses cannot update a different account. Successful account deletion clears the local session; uncertain deletion retains it and explains the failure.

Account deletion does not delete the person's Google account, shared market assets or provider logs/backups. See [account boundaries](../supabase/README.md) and [privacy](privacy-security.md).

## Evidence limits

Browser checks cover appearance persistence, blocked storage, cross-tab changes, keyboard operation, confirmation dialogs, account races, contrast samples and mounted chart/player state. Database integration checks separately cover ownership and deletion effects.

Sampled contrast and viewport checks are not an exhaustive accessibility audit. Local verification does not establish current hosted OAuth or physical-device compatibility.
