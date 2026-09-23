# Android installation

Market Tracker includes a web app manifest, an **Install app** entry beside Contact and Privacy, and a small offline connection-help page. Installation is available without signing in. Google sign-in continues to enable private watchlists.

## Install

Open the site in Brave or Chrome on Android, then choose **Install app** in the footer. If the browser offers an installation prompt, choose **Install** and complete the browser's confirmation. Otherwise, open the browser menu and look for **Install app** or **Add to Home screen**. Wording and availability vary; Chrome is an alternative when Brave does not offer installation.

Launch Market Tracker from the resulting home-screen or app-list icon. The manifest requests a standalone window. A browser shortcut may still open in a normal tab; the website cannot verify installations in other browsers.

## Connection and updates

Market data, private watchlists and test evidence require a connection. After a successful online worker installation, an offline navigation to an application page shows connection help with **Try again**. Reconnecting and choosing that button retries the requested page. A first-ever offline visit, cleared storage or browser cache eviction can prevent this fallback from appearing.

The service worker caches only that static help page and its two supporting scripts. It does not cache APIs, account data, prices, test evidence, recordings or PDFs. OAuth callbacks and API errors do not receive the offline HTML fallback. Existing open pages retain their ordinary stale and failure behavior.

Worker updates wait for existing controlled windows to close. The app does not force a reload or request notification permission. Browser-managed storage and installation behavior remain browser-dependent.

## Evidence limits

Local automated coverage includes real Chromium workers with Android emulation, offline recovery, cache exclusions, failed and waiting updates, mocked Google sign-in/watchlists, and installation-help interaction in Chromium and mobile WebKit. Synthetic installation events and standalone emulation do not establish actual installation.

Physical Galaxy S26 Ultra testing in Brave and Chrome, standalone browser controls, Android Back/resume, and real Google sign-in/cancellation and return to the installed app remain unverified. This source-level implementation does not establish availability on the hosted release.
