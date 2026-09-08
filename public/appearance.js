/* Runs before first paint. Device appearance is read locally; only explicit choices are stored. */
(() => {
  const key = 'imt_appearance';
  const valid = value => value === 'light' || value === 'dark' ? value : null;
  const device = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: light)') : null;
  let preference = null;
  const apply = () => {
    document.documentElement.dataset.theme = preference ?? (device?.matches ? 'light' : 'dark');
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
