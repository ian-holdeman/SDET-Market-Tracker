import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('worker restart and duplicate hints preserve distinct later events on the same installation', async () => {
  const source = await readFile('pwa/sw.js', 'utf8');
  const consumed = new Set<string>(), shown: any[] = [];
  let enabled = true, stale = false, authorized = true;
  const restart = () => {
    const handlers = new Map<string, (event: any) => void>();
    const sandbox = vm.createContext({ URL, AbortSignal, Number,
      self: { location: { origin: 'https://example.invalid' },
        navigator: { locks: { request: async (_key: string, work: () => Promise<void>) => work() } },
        registration: { showNotification: async (title: string, options: any) => { shown.push({ title, options }); } },
        addEventListener: (name: string, handler: any) => handlers.set(name, handler),
      },
      readState: async () => ({ owner: 'owner', installationId: 'same-device', capability: 'same-capability', enabled }),
      fetch: async (_url: string, init: RequestInit) => {
        const { eventId, installationId, capability } = JSON.parse(init.body as string);
        assert.equal(installationId, 'same-device');
        assert.equal(capability, 'same-capability');
        const data = !authorized || stale || consumed.has(eventId) ? null : {
          id: eventId, user_id: 'owner', symbol: 'AAPL', value: 100, unit: 'USD',
        };
        if (data) consumed.add(eventId);
        return { ok: true, json: async () => ({ data }) };
      },
    });
    vm.runInContext(source + '\nalertInstallation = readState;', sandbox);
    return async (eventId: string) => {
      let done!: Promise<void>;
      handlers.get('push')!({ data: { json: () => ({ eventId, installationId: 'same-device' }) },
        waitUntil: (work: Promise<void>) => { done = work; } });
      await done;
    };
  };
  let push = restart();
  await push('first-crossing');
  await push('first-crossing');
  assert.equal(shown.length, 1);
  push = restart();
  await push('first-crossing');
  await push('second-crossing');
  await push('second-crossing');
  assert.deepEqual(shown.map(item => item.options.tag), ['imt-alert-first-crossing', 'imt-alert-second-crossing']);
  stale = true;
  await push('expired-event');
  stale = false; authorized = false;
  await push('revoked-session');
  authorized = true; enabled = false;
  await push('disabled-installation');
  assert.equal(shown.length, 2);
});
