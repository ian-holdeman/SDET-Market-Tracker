import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../public/appearance.js', import.meta.url), 'utf8');
function browser(stored?: string, blocked = false, deviceLight = false) {
  const values = new Map(stored === undefined ? [] : [['imt_appearance', stored]]);
  const listeners = new Map<string, (event: any) => void>();
  const document = { documentElement: { dataset: {} as { theme?: string } } };
  const writes: string[] = [];
  const localStorage = {
    getItem(key: string) { if (blocked) throw new Error('Blocked'); return values.get(key) ?? null; },
    setItem(key: string, value: string) { if (blocked) throw new Error('Blocked'); values.set(key, value); writes.push(key); },
  };
  const media = { matches: deviceLight, addEventListener: (_type: string, callback: (event: any) => void) => listeners.set('devicechange', callback) };
  const window = {
    matchMedia: () => media,
    addEventListener(key: string, callback: (event: any) => void) { listeners.set(key, callback); },
    dispatchEvent(event: { type: string }) { listeners.get(event.type)?.(event); },
  };
  runInNewContext(script, { window, document, localStorage, Event: class { constructor(readonly type: string) {} } });
  return { document, localStorage, writes, values, media, emit: (type: string, event: object) => listeners.get(type)?.(event) };
}

test('appearance boot applies validated preference synchronously without writing a default', () => {
  for (const [value, expected] of [[undefined, 'dark'], ['light', 'light'], ['dark', 'dark'], ['auto', 'dark'], ['LIGHT', 'dark']]) {
    const b = browser(value);
    assert.equal(b.document.documentElement.dataset.theme, expected);
    assert.deepEqual(b.writes, []);
  }
});
test('blocked preference storage still permits current-tab switching', () => {
  const b = browser(undefined, true);
  b.emit('appearancepreference', { detail: 'light' });
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.emit('appearancepreference', { detail: 'dark' });
  assert.equal(b.document.documentElement.dataset.theme, 'dark');
});
test('cross-tab preference changes and reset apply without echo writes or unrelated storage effects', () => {
  const b = browser('light');
  b.emit('storage', { key: 'imt_supabase_auth', newValue: null, storageArea: b.localStorage });
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  b.emit('storage', { key: 'imt_appearance', newValue: 'dark', storageArea: {} });
  assert.equal(b.document.documentElement.dataset.theme, 'light');
  for (const key of ['imt_appearance', null]) {
    b.emit('appearancepreference', { detail: 'light' });
    b.emit('storage', { key, newValue: null, storageArea: b.localStorage });
    assert.equal(b.document.documentElement.dataset.theme, 'dark');
  }
  assert.deepEqual(b.writes, ['imt_appearance', 'imt_appearance']);
});

test('without an explicit choice, light and dark devices supply the initial appearance without storage', () => {
  for (const light of [true, false]) {
    const b = browser(undefined, false, light);
    assert.equal(browser('invalid', false, light).document.documentElement.dataset.theme, light ? 'light' : 'dark');
    assert.equal(browser(undefined, true, light).document.documentElement.dataset.theme, light ? 'light' : 'dark');
    assert.equal(b.document.documentElement.dataset.theme, light ? 'light' : 'dark');
    assert.deepEqual(b.writes, []);
    b.media.matches = !light; b.emit('devicechange', {});
    assert.equal(b.document.documentElement.dataset.theme, light ? 'dark' : 'light');
    b.emit('appearancepreference', { detail: light ? 'dark' : 'light' });
    b.media.matches = light; b.emit('devicechange', {});
    assert.equal(b.document.documentElement.dataset.theme, light ? 'dark' : 'light');
    b.emit('storage', { key: 'imt_appearance', newValue: null, storageArea: b.localStorage });
    assert.equal(b.document.documentElement.dataset.theme, light ? 'light' : 'dark');
  }
});
