import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

for (const failure of ['network', 'server', 'denied', 'exhausted', 'disabled', 'consumed', 'deadline', 'replaced'] as const) {
  test(`worker payload retrieval handles ${failure} without unbounded retries or duplicate display`, async () => {
    const source = await readFile('pwa/sw.js', 'utf8');
    const handlers = new Map<string, (event: any) => void>();
    const shown: any[] = [];
    let requests = 0, enabled = true, capability = 'secret';
    const deadline = new AbortController();
    const sandbox = vm.createContext({ URL, Number, AbortSignal: { any: AbortSignal.any,
      timeout: (ms: number) => ms === 15000 ? deadline.signal : AbortSignal.timeout(ms) },
      self: { location: { origin: 'https://example.invalid' },
        navigator: { locks: { request: async (_name: string, run: () => Promise<void>) => run() } },
        registration: { showNotification: async (title: string, options: any) => { shown.push({ title, options }); } },
        addEventListener: (name: string, handler: any) => handlers.set(name, handler),
      },
      readState: async () => ({ owner: 'owner', installationId: 'device', capability, enabled }),
      fetch: async (_url: string, init: RequestInit) => {
        requests++;
        assert.ok(init.signal, 'each request has a deadline');
        assert.deepEqual(JSON.parse(init.body as string), { eventId: 'event', installationId: 'device', capability: 'secret' });
        if (failure === 'denied') return { ok: false, status: 403 };
        if (failure === 'exhausted') return { ok: false, status: 503 };
        if (requests === 1) {
          if (failure === 'disabled') enabled = false;
          if (failure === 'replaced') capability = 'replacement';
          if (failure === 'deadline') { deadline.abort(); throw new Error('Request timed out'); }
          if (failure === 'network' || failure === 'consumed') throw new TypeError('Connection lost');
          return { ok: false, status: 503 };
        }
        return { ok: true, status: 200, json: async () => ({ data: failure === 'consumed' ? null : {
          id: 'event', user_id: 'owner', symbol: 'AAPL', value: 101, unit: 'USD',
        } }) };
      },
    });
    vm.runInContext(source + '\nalertInstallation = readState;', sandbox);
    let completion!: Promise<void>;
    handlers.get('push')!({ data: { json: () => ({ eventId: 'event', installationId: 'device' }) },
      waitUntil: (work: Promise<void>) => { completion = work; } });
    await completion;
    assert.equal(requests, ['denied', 'disabled', 'deadline', 'replaced'].includes(failure) ? 1 : 2);
    assert.equal(shown.length, failure === 'network' || failure === 'server' ? 1 : 0);
  });
}