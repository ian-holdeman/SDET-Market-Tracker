import { test, expect } from "../../fixtures/showcase-test";
import { mockApp, id, identity } from "../../fixtures/auth";
import { mockSavedPushInstallation } from "../../fixtures/notifications";
import { AuthModalComponent } from "../../pages/components/auth-modal.component";
import { HeaderComponent } from "../../pages/components/header.component";

for (const boundary of ["identity", "profile"] as const) {
  test(`temporary ${boundary} failure on startup preserves push; explicit sign-out still revokes it`, async ({ page }) => {
    await mockSavedPushInstallation(page, id);
    const app = await mockApp(page, true);
    let failIdentity = boundary === "identity";
    app.failWatchlistRead = boundary === "profile";
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/auth/v1/user", async route => {
      await gate;
      return route.fulfill(failIdentity
        ? { status: 503, json: { message: "Temporarily unavailable" } }
        : { json: identity });
    });
    const revocations: unknown[] = [];
    await page.route("**/api/alerts/revoke", route => {
      revocations.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: true } });
    });
    await page.goto("/board");
    await page.evaluate(() => (window as any).notificationSetup);
    release();
    const auth = new AuthModalComponent(page), header = new HeaderComponent(page);
    await expect(auth.error).toContainText(boundary === "identity"
      ? "Your session could not be verified" : "Your watchlist or permissions could not be loaded", { timeout: 20000 });
    // The error establishes completed auth settlement; fence its notification cleanup.
    await page.evaluate(() => navigator.locks.request("imt-alert-device", () => undefined));
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("imt_alert_notifications") || "null")))
      .toMatchObject({ owner: id, mode: "push" });
    expect(await page.evaluate(() => (window as any).notificationDevice.unsubscribe)).toBe(0);
    expect(revocations).toEqual([]);
    failIdentity = false;
    app.failWatchlistRead = false;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(header.username).toHaveText("Test Member");
    await page.keyboard.press("Escape");
    await expect(auth.dialog).toHaveCount(0);
    await header.profileButton.click();
    await header.logoutButton.click();
    await expect(header.loginButton).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("imt_alert_notifications"))).toBeNull();
    expect(await page.evaluate(() => (window as any).notificationDevice.unsubscribe)).toBe(1);
    expect(revocations).toHaveLength(1);
  });
}

for (const authenticated of [false, true]) {
  test(`confirmed ${authenticated ? "different account" : "signed-out state"} revokes the previous push installation`, async ({ page }) => {
    await mockSavedPushInstallation(page, authenticated ? "55555555-5555-4555-8555-555555555555" : id);
    await mockApp(page, authenticated);
    const revocations: unknown[] = [];
    await page.route("**/api/alerts/revoke", route => {
      revocations.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: true } });
    });
    await page.goto("/board");
    const header = new HeaderComponent(page);
    if (authenticated) await expect(header.username).toHaveText("Test Member");
    else await expect(header.loginButton).toBeVisible();
    await expect.poll(() => revocations.length).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("imt_alert_notifications"))).toBeNull();
    expect(await page.evaluate(() => (window as any).notificationDevice.unsubscribe)).toBe(1);
  });
}

test("a different locally selected account revokes the previous push before online verification settles", async ({ page }) => {
  await mockSavedPushInstallation(page, "55555555-5555-4555-8555-555555555555");
  await mockApp(page, true);
  let started = false, release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/auth/v1/user", async route => {
    started = true;
    await gate;
    await route.fulfill({ status: 503, json: { message: "Temporarily unavailable" } });
  });
  const revocations: unknown[] = [];
  await page.route("**/api/alerts/revoke", route => {
    revocations.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: true } });
  });
  await page.goto("/board");
  await page.evaluate(() => (window as any).notificationSetup);
  await expect.poll(() => started).toBe(true);
  try {
    // The local account selection is enough to revoke A, never to authorize B.
    await expect.poll(() => revocations.length).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem("imt_alert_notifications"))).toBeNull();
    expect(await page.evaluate(() => (window as any).notificationDevice.unsubscribe)).toBe(1);
  } finally { release(); }
  await expect(new AuthModalComponent(page).error).toContainText("Your session could not be verified");
  await expect(new HeaderComponent(page).username).toHaveCount(0);
});
