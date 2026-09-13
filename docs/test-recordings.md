# Recorded test demonstrations

The Tests page includes four curated recordings of actual local browser-test executions. They demonstrate application behavior and are separate from published CI results and the [nightly pipeline replay](pipeline-replay.md).

## Demonstrations

| Recording | Behavior shown |
| --- | --- |
| Watchlist re-login | Saved assets across an authentication journey |
| Chart session handoff | Session transitions, stale data and recovery |
| Settings clear/recovery | Failed and successful watchlist clearing, ending on the empty personal watchlist |
| Nested history | Pagination, error recovery and nested result details |

The watchlist clip uses mobile WebKit with an iPhone viewport; the other clips use desktop Chromium. Device emulation is not physical-device testing.

## Provenance and playback

The browser executes application code and assertions, while account, market and history responses are mocked. Prices, workflow identities and outcomes inside the recordings are synthetic fixtures. The Settings/history examples disclose the small AAPL/MSFT Board; clearing a personal watchlist does not remove shared assets.

Clips retain natural speed and visible transitions. They are silent and provide scenario descriptions, pause/seek controls, selectable playback speed and fullscreen where supported. Media loads on visitor intent rather than autoplaying.

Source identity, capture metadata and attempt history distinguish a clean pass from a successful retry. Missing or failed evidence is not replaced with an invented success state.

## Limits

These recordings do not establish current CI health, live market accuracy or real OAuth/database authorization. Browser playback depends on device and codec support. Automated checks validate decoded media and failure recovery in the tested environments, not every physical device.
