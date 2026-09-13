import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import {
  TestSnapshotStore,
  snapshotHistoryRouter,
} from "../../server/test-snapshot";
import { feed, published } from "../../src/tests/fixtures/testEvidence";
const config = {
  repository: "owner/repo",
  branch: "main",
  token: "never-persist-this",
};
async function settled(url: string) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const response = await fetch(url);
    if (response.status === 502 || !(await response.json()).refreshing) return;
    await new Promise<void>(resolve => setImmediate(resolve));
  }
  throw Error('Snapshot refresh/persistence did not settle');
}
async function fixture(t: any) {
  const directory = await mkdtemp(path.join(tmpdir(), "test-snapshot-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new TestSnapshotStore(directory, {
    repository: config.repository,
    branch: config.branch,
  });
  return store;
}
async function serve(t: any, router: any) {
  const server = express().use(router).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return (
    "http://127.0.0.1:" + (server.address() as any).port + "/api/test-history"
  );
}
const fresh = () => ({ ...feed(), fetchedAt: new Date().toISOString() });

test('snapshot storage starts only within an active request', async () => {
  let reads = 0;
  snapshotHistoryRouter(config,{read:async()=>{reads++;return null;},beginRefresh:async()=>async()=>{}},async()=>fresh(),Date.now,{requestScoped:true});
  assert.equal(reads,0,'Creating a Cloud Run router must not start background storage work');
});

test('request-scoped refresh holds the response until persistence completes', async (t) => {
  const store = await fixture(t);
  let finishWrite!: () => void;
  let writing!: () => void;
  const writeStarted = new Promise<void>(resolve => { writing = resolve; });
  const writeGate = new Promise<void>(resolve => { finishWrite = resolve; });
  const original = store.write.bind(store);
  store.write = async (value, generation) => { writing(); await writeGate; await original(value, generation); };
  let response: express.Response | undefined;
  const wrapper = express.Router().use((_req, res, next) => { response = res; next(); });
  wrapper.use((snapshotHistoryRouter as any)(config, store, async () => fresh(), Date.now, { requestScoped: true }));
  const url = await serve(t, wrapper);
  const request = fetch(url);
  await writeStarted;
  try {
    assert.equal(response?.writableEnded, false, 'CPU must remain allocated while the required write is pending');
  } finally { finishWrite(); await request; }
  const body = await (await request).json();
  assert.equal(body.refreshing, false);
  assert.deepEqual((await store.read())?.runs, body.runs);
});
test("snapshots validate scope/schema/size, strip extras and replace atomically in generation order", async (t) => {
  const store = await fixture(t);
  assert.equal(await store.read(), null);
  for (const raw of [
    "garbage",
    JSON.stringify({ version: 2 }),
    "x".repeat(4_000_001),
  ]) {
    await writeFile(store.file, raw);
    assert.equal(await store.read(), null);
  }
  const first = fresh(),
    second = fresh();
  second.runs = [];
  await Promise.all([
    store.write(first, 1),
    store.write(second, 2),
    store.write(first, 1),
  ]);
  assert.deepEqual((await store.read())?.runs, []);
  assert.equal((await readdir(store.directory)).length, 1);
  const extra = { ...fresh(), token: config.token };
  await store.write(extra, 3);
  assert.ok(!(await readFile(store.file, "utf8")).includes(config.token));
  assert.throws(() =>
    store.write({ ...fresh(), runs: [{ ...published(), branch: "other" }] }, 4),
  );
  const old = fresh();
  old.fetchedAt = "2000-01-01T00:00:00.000Z";
  await store.write(old, 5);
  assert.equal(await store.read(), null);
});
test("cold server serves persisted snapshot during slow refresh, deduplicates and honors removal", async (t) => {
  const store = await fixture(t),
    saved = fresh();
  await store.write(saved, 1);
  let release: () => void = () => {},
    calls = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const restarted = new TestSnapshotStore(store.directory, store.scope);
  const url = await serve(
    t,
    snapshotHistoryRouter(config, restarted, async () => {
      calls++;
      await gate;
      return { ...fresh(), runs: [] };
    }),
  );
  const pages = await Promise.all([
    fetch(url).then((r) => r.json()),
    fetch(url).then((r) => r.json()),
  ]);
  assert.equal(calls, 1);
  for (const page of pages) {
    assert.equal(page.refreshing, true);
    assert.equal(page.snapshot, true);
    assert.equal(page.fetchedAt, saved.fetchedAt);
    assert.equal(page.runs[0].status, "passed");
  }
  release();
  await settled(url);
  const updated = await (await fetch(url)).json();
  assert.deepEqual(updated.runs, []);
  assert.equal(updated.snapshot, false);
});
test("missing snapshot gives pending empty evidence; refresh failure keeps saved timestamp honestly", async (t) => {
  const store = await fixture(t);
  let reject: (e: Error) => void = () => {};
  const gate = new Promise<never>((_, r) => {
    reject = r;
  });
  const url = await serve(
    t,
    snapshotHistoryRouter(config, store, () => gate),
  );
  const empty = await (await fetch(url)).json();
  assert.equal(empty.refreshing, true);
  assert.deepEqual(empty.runs, []);
  reject(Error());
  await settled(url);
  assert.equal((await fetch(url)).status, 502);
  const saved = fresh();
  await store.write(saved, 1);
  const failed = await serve(
    t,
    snapshotHistoryRouter(
      config,
      new TestSnapshotStore(store.directory, store.scope),
      async () => {
        throw Error();
      },
    ),
  );
  await fetch(failed);
  await settled(failed);
  const result = await (await fetch(failed)).json();
  assert.equal(result.stale, true);
  assert.equal(result.fetchedAt, saved.fetchedAt);
  assert.equal(result.runs[0].status, "passed");
});
