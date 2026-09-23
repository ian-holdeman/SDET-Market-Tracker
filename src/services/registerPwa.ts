export function registerPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  // Natural browser lifecycle: no skipWaiting, clients.claim, or controllerchange reload.
  const register = () => { void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
    // Browser/storage restrictions must not prevent the online application from working.
  }); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
