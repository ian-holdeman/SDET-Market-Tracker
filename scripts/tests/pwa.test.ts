import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('production manifest provides stable same-origin standalone identity and Android icons', async () => {
  const manifest = JSON.parse(await readFile('dist/client/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  for (const [size, purpose] of [[192, 'any'], [512, 'any'], [512, 'maskable']] as const) {
    const icon = manifest.icons.find((item: any) => item.sizes === `${size}x${size}` && item.purpose === purpose);
    assert.ok(icon);
    const bytes = await readFile('dist/client' + icon.src);
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
  }
});

import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';

async function workerHarness() {
  const source = (await readFile('pwa/sw.js', 'utf8')).replace('__VERSION__', 'aaaaaaaaaaaaaaaa');
  const events = new Map<string, (event: any) => void>();
  const store = new Map<string, Map<string, Response>>();
  const calls: Request[] = [];
  let fail = false;
  let status = 200;
  let incorrectType = false;
  let hang = false;
  const origin = 'https://local.invalid';
  const normalize = (input: string | Request) => new URL(typeof input === 'string' ? input : input.url, origin).href;
  const cacheStorage = {
    keys: async () => [...store.keys()],
    delete: async (key: string) => store.delete(key),
    open: async (key: string) => {
      if (!store.has(key)) store.set(key, new Map());
      const cache = store.get(key)!;
      return {
        put: async (input: string | Request, response: Response) => { cache.set(normalize(input), response.clone()); },
        match: async (input: string | Request) => cache.get(normalize(input))?.clone(),
      };
    },
  };
  const registration: { active: any; waiting: any; installing?: any } = { active: null, waiting: null };
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>();
  vm.runInNewContext(source, {
    self: { location: { origin }, registration, addEventListener: (type: string, callback: any) => events.set(type, callback) },
    caches: cacheStorage, Request, Response, URL, AbortController, MessageChannel,
    setTimeout: (callback: () => void, delay: number) => { const id = setTimeout(callback, delay); timers.set(id, callback); return id; },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => { clearTimeout(id); timers.delete(id); },
    fetch: async (request: Request, options: RequestInit) => {
      calls.push(request);
      if (hang) return new Promise((_, reject) => options.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
      if (fail) throw Error('offline');
      return new Response(request.url.endsWith('offline.html') ? '<h1>Connection needed</h1>' : '/* static */', {
        status, headers: { 'Content-Type': incorrectType ? 'text/plain' : request.url.endsWith('.html') ? 'text/html' : 'text/javascript' },
      });
    },
  });
  const lifecycle = (type: string) => { let promise!: Promise<void>; events.get(type)!({ waitUntil: (value: Promise<void>) => { promise = value; } }); return promise; };
  const fetchEvent = (url: string, mode = 'navigate', method = 'GET', destination = 'document') => {
    let promise: Promise<Response> | undefined;
    const request = new Request(new URL(url, origin), { method });
    Object.defineProperties(request, { mode: { value: mode }, destination: { value: destination } });
    events.get('fetch')!({ request, respondWith: (value: Promise<Response>) => { promise = value; } });
    return promise;
  };
  return { lifecycle, fetchEvent, calls, store, cacheStorage, registration, timers,
    fail: () => { fail = true; }, httpFailure: () => { status = 503; }, badMime: () => { incorrectType = true; }, hang: () => { hang = true; } };
}

test('worker falls back only for application navigations and never caches fetched application data', async () => {
  const h = await workerHarness();
  await h.lifecycle('install');
  await h.lifecycle('activate');
  const before = [...h.store.values()][0].size;
  assert.equal((await h.fetchEvent('/board/AAPL'))?.status, 200);
  h.fail();
  const offline = await h.fetchEvent('/board?symbol=AAPL');
  assert.equal(offline?.status, 503);
  assert.match(await offline!.text(), /Connection needed/);
  for (const url of ['/api/account', '/api/quotes', '/api/test-history', '/auth/callback', '/auth/callback?code=secret', '/resume', '/resume.pdf', '/recordings/a.mp4', '/?code=secret', '/?error=denied', 'https://supabase.invalid/rest/v1/watchlist_items', '/unknown']) {
    assert.equal(h.fetchEvent(url), undefined, url);
  }
  assert.equal(h.fetchEvent('/board', 'cors'), undefined);
  assert.equal(h.fetchEvent('/board', 'navigate', 'POST'), undefined);
  assert.equal(h.fetchEvent('/appearance.js?private=1', 'cors', 'GET', 'script'), undefined);
  assert.equal((await h.fetchEvent('/appearance.js', 'cors', 'GET', 'script'))?.status, 200);
  assert.equal([...h.store.values()][0].size, before);
  assert.ok(h.calls.slice(0, 3).every(request => request.credentials === 'omit'));
});

test('HTTP failure and network deadline remain honest; cache eviction cannot fabricate fallback', async () => {
  const h = await workerHarness();
  await h.lifecycle('install');
  h.httpFailure();
  assert.equal((await h.fetchEvent('/logic'))?.status, 503);
  h.hang();
  const pending = h.fetchEvent('/logic');
  for (const callback of h.timers.values()) callback();
  assert.match(await (await pending)!.text(), /Connection needed/);
  h.store.clear();
  const missing = h.fetchEvent('/logic');
  for (const callback of h.timers.values()) callback();
  assert.equal((await missing)?.type, 'error');
});

test('failed resource validation preserves old and unrelated caches', async () => {
  for (const reason of ['network', 'MIME', 'HTTP']) {
    const h = await workerHarness();
    await h.cacheStorage.open('imt-pwa-offline-bbbbbbbbbbbbbbbb');
    await h.cacheStorage.open('unrelated');
    if (reason === 'network') h.fail(); else if (reason === 'MIME') h.badMime(); else h.httpFailure();
    await assert.rejects(h.lifecycle('install'));
    assert.deepEqual([...h.store.keys()], ['imt-pwa-offline-bbbbbbbbbbbbbbbb', 'unrelated']);
  }
});

test('repeated installations retain active and waiting workers with bounded caches; activation cleans only feature caches', async () => {
  const h = await workerHarness();
  const active = 'imt-pwa-offline-bbbbbbbbbbbbbbbb';
  const waiting = 'imt-pwa-offline-cccccccccccccccc';
  for (const key of [active, waiting, 'imt-pwa-offline-dddddddddddddddd', 'unrelated']) await h.cacheStorage.open(key);
  const worker = (name: string) => ({ postMessage: (_: unknown, ports: MessagePort[]) => ports[0].postMessage(name) });
  h.registration.active = worker(active);
  h.registration.waiting = worker(waiting);
  await h.lifecycle('install');
  assert.deepEqual([...h.store.keys()].sort(), ['imt-pwa-offline-aaaaaaaaaaaaaaaa', active, waiting, 'unrelated'].sort());
  h.registration.waiting = null;
  await h.lifecycle('activate');
  assert.deepEqual([...h.store.keys()].sort(), ['imt-pwa-offline-aaaaaaaaaaaaaaaa', 'unrelated']);
});


test('activation preserves a concurrent installer cache and unrelated storage', async () => {
  const h = await workerHarness();
  await h.lifecycle('install');
  const installing = 'imt-pwa-offline-eeeeeeeeeeeeeeee';
  await h.cacheStorage.open(installing);
  await h.cacheStorage.open('imt-pwa-offline-ffffffffffffffff');
  await h.cacheStorage.open('unrelated');
  h.registration.installing = { postMessage: (_: unknown, ports: MessagePort[]) => ports[0].postMessage(installing) };
  await h.lifecycle('activate');
  assert.deepEqual([...h.store.keys()].sort(), ['imt-pwa-offline-aaaaaaaaaaaaaaaa', installing, 'unrelated'].sort());
});
