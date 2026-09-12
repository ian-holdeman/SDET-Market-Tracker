/* Runs before first paint. Device appearance is read locally; only explicit choices are stored. */
(() => {
  const key = 'imt_appearance';
  const valid = value => value === 'light' || value === 'dark' ? value : null;
  const device = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : null;
  let preference = null;
  const apply = () => {
    const root = document.documentElement;
    const theme = preference ?? (device?.matches ? 'light' : 'dark');
    const switching = root.dataset.theme && root.dataset.theme !== theme;
    if (switching) root.dataset.appearanceChanging = '';
    try {
      root.dataset.theme = theme;
      // Commit every surface and gradient together before restoring hover transitions.
      // This is synchronous: no timer/frame can leave transitions disabled in a hidden tab.
      if (switching) void root.offsetWidth;
    } finally {
      if (switching) delete root.dataset.appearanceChanging;
    }
    window.dispatchEvent(new Event('appearancechange'));
  };
  try { preference = valid(localStorage.getItem(key)); } catch { /* Storage can be blocked. */ }
  apply();
  device?.addEventListener('change', () => { if (preference === null) apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      try { if (event.storageArea !== localStorage) return; } catch { return; }
      preference = valid(event.newValue);
      apply();
    }
  });
  window.addEventListener('appearancepreference', event => {
    const value = valid(event.detail);
    if (value === null) return;
    preference = value;
    try { localStorage.setItem(key, value); } catch { /* Current-tab choice still works. */ }
    apply();
  });
})();
