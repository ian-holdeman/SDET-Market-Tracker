export const scenarios = [
  { id: 'watchlist', project: 'mobile-webkit', file: 'src/tests/specs/auth/auth.spec.ts', title: 'A saved watchlist does not reopen a card after card collapse and Google re-login' },
  { id: 'cold-start', project: 'desktop-chromium', file: 'src/tests/specs/telemetry/history.spec.ts', title: 'cold skeleton and saved snapshot stay mounted until a verified refresh arrives' },
  { id: 'history', project: 'desktop-chromium', file: 'src/tests/specs/telemetry/history.spec.ts', title: 'recent results hides empty runs while history paginates and nested details restore focus' },
  { id: 'deletion', project: 'desktop-chromium', file: 'src/tests/specs/auth/auth.spec.ts', title: 'Deletion errors retain the account; confirmed deletion clears the browser session' },
];
