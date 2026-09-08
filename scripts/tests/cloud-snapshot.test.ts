import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CloudSnapshotStore } from '../../server/test-snapshot';
import { MemoryObjects } from '../test-support/memory-objects';
import { feed } from '../../src/tests/fixtures/testEvidence';

const scope = { repository: 'owner/repo', branch: 'main' };
const fresh = () => ({ ...feed(), fetchedAt: new Date().toISOString() });

test('overlapping instances cannot restore evidence removed by a newer writer', async () => {
  const objects = new MemoryObjects();
  const first = new CloudSnapshotStore(objects, scope), second = new CloudSnapshotStore(objects, scope);
  const late = await first.beginRefresh(), current = await second.beginRefresh();
  await current({ ...fresh(), runs: [] });
  await assert.rejects(late(fresh()), /precondition/);
  assert.deepEqual((await new CloudSnapshotStore(objects, scope).read())?.runs, []);
});

test('cloud snapshots retain timestamps, reject invalid scopes/expired/corrupt data and recover', async () => {
  const objects = new MemoryObjects(), store = new CloudSnapshotStore(objects, scope);
  assert.equal(await store.read(), null);
  const original = fresh();
  await (await store.beginRefresh())({ ...original, token: 'never-store-this' } as any);
  assert.equal((await store.read())?.fetchedAt, original.fetchedAt);
  assert.ok(!objects.objects.get(store.name)!.bytes.includes('never-store-this'));
  await assert.rejects((await store.beginRefresh())({ ...fresh(), runs: fresh().runs.map(r => ({ ...r, branch: 'foreign' })) }));
  await (await store.beginRefresh())({ ...fresh(), fetchedAt: '2000-01-01T00:00:00Z' });
  assert.equal(await store.read(), null);
  await objects.put(store.name, Buffer.from('{invalid'), objects.objects.get(store.name)!.generation);
  assert.equal(await store.read(), null);
  await (await store.beginRefresh())(original);
  assert.ok(await store.read());
  objects.denied = true;
  assert.equal(await store.read(), null);
  await assert.rejects(store.beginRefresh());
  objects.denied = false;
  assert.ok(await store.read());
});
