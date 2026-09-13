export const scenarios = [
  { id: 'watchlist', project: 'mobile-webkit', file: 'src/tests/specs/auth/auth.spec.ts', title: 'A saved watchlist does not reopen a card after card collapse and Google re-login' },
  { id: 'chart', project: 'desktop-chromium', file: 'src/tests/specs/board/chart-session.spec.ts', title: 'holiday handoff and premarket transition keep a partial day chart; failure stops the pulse' },
  { id: 'settings', project: 'desktop-chromium', file: 'src/tests/specs/settings/settings.spec.ts', title: 'Clear requires confirmation, traps focus, preserves state on failure and sends one owner-scoped delete' },
  { id: 'history', project: 'desktop-chromium', file: 'src/tests/specs/telemetry/history.spec.ts', title: 'recent results hides empty runs while history paginates and nested details restore focus' },
];
