import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("production manifest requires pinned alert secrets and keeps private values out of inline environment", () => {
  const root = mkdtempSync(join(tmpdir(), "alert-manifest-"));
  try {
    for (const folder of ["scripts", "deploy"]) mkdirSync(join(root, folder));
    for (const file of ["scripts/render-deployment.mjs", "deploy/production.json"])
      copyFileSync(file, join(root, file));
    const env = {
      ...process.env,
      DEPLOY_IMAGE: "us-west1-docker.pkg.dev/sdet-market-tracker/sdet-market-tracker/app@sha256:" + "a".repeat(64),
      PUBLIC_SUPABASE_PUBLISHABLE: "sb_publishable_fixture",
      SUPABASE_SECRET_VERSION: "1", HISTORY_SECRET_VERSION: "1",
      ALERT_SCHEDULER_SECRET_VERSION: "", ALERT_VAPID_SECRET_VERSION: "",
      ALERT_VAPID_PUBLIC_KEY: "B".repeat(87),
    };
    const render = () => spawnSync(process.execPath, [join(root, "scripts/render-deployment.mjs")], { env, encoding: "utf8", windowsHide: true });
    assert.notEqual(render().status, 0, "missing alert secret versions must block release");
    env.ALERT_SCHEDULER_SECRET_VERSION = "2";
    env.ALERT_VAPID_SECRET_VERSION = "3";
    const result = render();
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(readFileSync(join(root, "output/deployment/service.json"), "utf8"));
    const entries = manifest.spec.template.spec.containers[0].env;
    for (const [name, secret, version] of [
      ["ALERT_SCHEDULER_SECRET", "sdet-alert-scheduler", "2"],
      ["ALERT_VAPID_PRIVATE_KEY", "sdet-alert-vapid", "3"],
    ]) {
      const entry = entries.find((item: any) => item.name === name);
      assert.deepEqual(entry.valueFrom.secretKeyRef, { name: secret, key: version });
      assert.equal(entry.value, undefined);
    }
    assert.equal(entries.find((item: any) => item.name === "ALERT_VAPID_PUBLIC_KEY").value, env.ALERT_VAPID_PUBLIC_KEY);
    assert.equal(entries.find((item: any) => item.name === "ALERT_VAPID_SUBJECT").value, "https://sdet-market-tracker-855618435389.us-west1.run.app");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
