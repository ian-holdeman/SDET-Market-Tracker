import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

test("worker rechecks private authorization, owner, opt-out races and duplicate hints before display", async () => {
  const source = await readFile("pwa/sw.js", "utf8");
  const events = new Map<string, (event: any) => void>(),
    shown: any[] = [],
    requests: any[] = [];
  let state: any = {
      owner: "owner",
      installationId: "device",
      capability: "secret",
      enabled: true,
    },
    consumed = false,
    revoked = false,
    isTest = false;
  const sandbox = vm.createContext({
    URL,
    AbortSignal,
    Number,
    self: {
      navigator: {
        locks: {
          request: async (_name: string, work: () => Promise<void>) => work(),
        },
      },
      location: { origin: "https://example.invalid" },
      registration: {
        showNotification: async (title: string, options: any) =>
          shown.push({ title, options }),
      },
      addEventListener: (name: string, callback: any) =>
        events.set(name, callback),
    },
    readState: async () => state,
    fetch: async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(init.body as string));
      if (revoked) state = { ...state, enabled: false };
      const data = consumed
        ? null
        : isTest ? {id:'event',user_id:'owner',kind:'test'} : {
            id: "event",
            user_id: "owner",
            symbol: "AAPL",
            value: 101,
            unit: "USD",
          };
      consumed = true;
      return { ok: true, json: async () => ({ data }) };
    },
  });
  vm.runInContext(source + "\nalertInstallation = readState;", sandbox);
  const push = async (
    hint = { eventId: "event", installationId: "device" },
  ) => {
    let done: Promise<void> = Promise.resolve();
    events.get("push")!({
      data: { json: () => hint },
      waitUntil: (p: Promise<void>) => {
        done = p;
      },
    });
    await done;
  };
  await push();
  assert.equal(shown.length, 1);
  assert.deepEqual(requests[0], {
    eventId: "event",
    installationId: "device",
    capability: "secret",
  });
  await push();
  assert.equal(shown.length, 1, "consumed event never displays twice");
  consumed = false;
  state = { ...state, enabled: false };
  await push();
  assert.equal(
    requests.length,
    2,
    "disabled installation does not request private payload",
  );
  state = { ...state, enabled: true, owner: "different" };
  await push();
  assert.equal(shown.length, 1, "different owner payload rejected");
  consumed = false;
  state = { ...state, owner: "owner" };
  revoked = true;
  await push();
  assert.equal(shown.length, 1, "off during consume prevents late display");
  consumed = false; revoked = false; isTest = true;
  state = {...state, enabled:true};
  await push();
  assert.equal(shown.length,2);
  assert.equal(shown[1].title,'Test price alert');
  assert.equal(shown[1].options.tag,'imt-alert-event');
  assert.equal(shown[1].options.data.path,'/settings');
  await push();
  assert.equal(shown.length,2,'test hints share one-use consumption');
});
