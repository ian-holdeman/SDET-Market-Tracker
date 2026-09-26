/* Built with a content-derived version. No takeover, reload, or application cache. */
const CACHE = 'imt-pwa-offline-__VERSION__';
const RESOURCES = ['/offline.html', '/offline.js', '/appearance.js'];
const MIME = ['text/html', 'javascript', 'javascript'];
const NETWORK_TIMEOUT = 12000;
const ownedCache = name => /^imt-pwa-offline-[a-f0-9]{16}$/.test(name);

// Identify active/waiting caches without storing account data or extra metadata.
self.addEventListener('message', event => {
  if (event.data === 'offline-cache-name') event.ports[0]?.postMessage(CACHE);
  if (event.data === 'alert-delivery-version') event.ports[0]?.postMessage(2);
});
function workerCache(worker) {
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const finish = () => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); };
    const timer = setTimeout(() => { finish(); reject(new Error('Existing worker did not respond')); }, 3000);
    channel.port1.onmessage = event => {
      finish();
      if (typeof event.data === 'string' && ownedCache(event.data)) resolve(event.data);
      else reject(new Error('Unrecognized offline cache'));
    };
    worker.postMessage('offline-cache-name', [channel.port2]);
  });
}

async function network(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
  try { return await fetch(request, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Fetch everything before writing. A failed update cannot damage the active cache.
    const responses = await Promise.all(RESOURCES.map(async (url, index) => {
      const response = await network(new Request(new URL(url, self.location.origin), { cache: 'reload', credentials: 'omit' }));
      if (!response.ok || response.redirected || !response.headers.get('Content-Type')?.includes(MIME[index])) {
        throw new Error('Offline resources unavailable');
      }
      return response;
    }));
    try {
      const retained = new Set([CACHE, ...await Promise.all([
        workerCache(self.registration.active), workerCache(self.registration.waiting),
      ])]);
      const cache = await caches.open(CACHE);
      await Promise.all(RESOURCES.map((url, index) => cache.put(url, responses[index])));
      // At most active + previous waiting + this candidate. A waiting worker that
      // activates during installation is still retained. Activation reduces this to one.
      await Promise.all((await caches.keys()).filter(name => ownedCache(name) && !retained.has(name)).map(name => caches.delete(name)));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Snapshot keys before querying lifecycle state: a later installer may be
    // writing its own cache, which this activation must not remove.
    const keys = await caches.keys();
    const retained = new Set([CACHE, ...await Promise.all([
      workerCache(self.registration.installing), workerCache(self.registration.waiting),
    ])]);
    await Promise.all(keys.filter(key => ownedCache(key) && !retained.has(key)).map(key => caches.delete(key)));
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode !== 'navigate') {
    // Only the offline page's two static scripts; no other requests are intercepted.
    if (request.destination === 'script' && !url.search && RESOURCES.slice(1).includes(url.pathname)) {
      event.respondWith(network(request).catch(async () => (await (await caches.open(CACHE)).match(url.pathname)) || Response.error()));
    }
    return;
  }
  // Explicit application routes. Auth, APIs, documents and unknown paths bypass us.
  if (!/^\/(?:board(?:\/[^/]+)?|tests|logic|privacy|settings)?\/?$/.test(url.pathname) ||
      [...url.searchParams.keys()].some(key => /^(?:code|state|error(?:_.*)?|access_token|refresh_token|token_hash)$/i.test(key))) return;
  event.respondWith(network(request).catch(async () => {
    const cached = await (await caches.open(CACHE)).match('/offline.html');
    if (!cached) return Response.error();
    return new Response(await cached.arrayBuffer(), {
      status: 503, statusText: 'Connection needed', headers: cached.headers,
    });
  }));
});

// Separate, minimal private delivery storage. Nothing here enters Cache Storage.
function alertInstallation() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('imt-alert-delivery', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('installation');
    request.onerror = () => reject(new Error('Notification storage unavailable'));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('installation', 'readonly');
      const read = tx.objectStore('installation').get('current');
      tx.oncomplete = () => { db.close(); resolve(read.result); };
      tx.onerror = () => { db.close(); reject(new Error('Notification storage unavailable')); };
    };
  });
}
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    try {
      const hint = event.data?.json();
      if (!hint || typeof hint.eventId !== 'string' || typeof hint.installationId !== 'string') return;
      const display = async () => {
        const state = await alertInstallation();
        if (!state?.enabled || state.installationId !== hint.installationId) return;
        const response = await fetch('/api/alerts/consume', { method: 'POST', credentials: 'omit', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ eventId: hint.eventId, installationId: state.installationId, capability: state.capability }) });
        if (!response.ok) return;
        const { data } = await response.json();
        if (!data || data.id !== hint.eventId || data.user_id !== state.owner) return;
        const test = data.kind === 'test';
        if (!test && (typeof data.symbol !== 'string' || !/^[A-Z0-9^][A-Z0-9.^=-]{0,31}$/.test(data.symbol) ||
            !Number.isFinite(data.value) || typeof data.unit !== 'string')) return;
        const current = await alertInstallation();
        if (!current?.enabled || current.capability !== state.capability) return;
        await self.registration.showNotification(test ? 'Test price alert' : `${data.symbol} price alert`, {
          body: test ? 'This is a test notification.' : `${data.value} ${data.unit}`, tag: 'imt-alert-' + data.id,
          data: { path: test ? '/settings' : '/board/' + encodeURIComponent(data.symbol) },
          icon: '/icons/app-192.png',
        });
      };
      // The same lock is used during sign-out/opt-out, including notification close.
      if (self.navigator.locks) await self.navigator.locks.request('imt-alert-device', display);
    } catch { /* Fail closed; genuine price history remains available. */ }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.path;
  if (typeof path !== 'string' || !(path === '/settings' || /^\/board\/[A-Za-z0-9%_.=^-]+$/.test(path))) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (target) { await target.navigate(path); await target.focus(); }
    else await self.clients.openWindow(path);
  })());
});
