import { test, expect } from "../../fixtures/showcase-test";
import { mockApp } from "../../fixtures/auth";
import { mockAlerts } from "../../fixtures/alerts";
import { mockNotificationDevice } from "../../fixtures/notifications";
import { AlertsPage } from "../../pages/alerts.page";
import { HeaderComponent } from "../../pages/components/header.component";

test("permission granted while away completes opt-in without reopening", async ({ page }) => {
  await mockNotificationDevice(page);
  await mockApp(page, true, false);
  await mockAlerts(page);
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await alerts.notificationSwitch.click();
  await expect.poll(() => page.evaluate(() => (window as any).notificationDevice.pendingPermission)).toBe(true);
  await page.evaluate(() => {
    (window as any).notificationDevice.permission = "granted";
    window.dispatchEvent(new Event("focus"));
  });
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
  await expect(alerts.notificationSwitch).toBeEnabled();
  await alerts.testNotification.click();
  await expect.poll(() => page.evaluate(() => (window as any).notificationDevice.displayed)).toBe(1);
  // A late browser result cannot undo successful recovery.
  await page.evaluate(() => (window as any).notificationDevice.resolvePermission("denied"));
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a stalled permission prompt expires and its late result cannot enable delivery", async ({ page }) => {
  await mockNotificationDevice(page);
  await mockApp(page, true, false);
  await mockAlerts(page);
  await page.goto("/settings");
  await expect(new HeaderComponent(page).username).toHaveText("Test Member");
  await page.clock.install();
  const alerts = new AlertsPage(page);
  await alerts.notificationSwitch.click();
  await expect.poll(() => page.evaluate(() => (window as any).notificationDevice.pendingPermission)).toBe(true);
  await page.clock.fastForward(30001);
  await expect(page.getByRole("alert")).toContainText("Permission request timed out");
  await expect(alerts.notificationSwitch).toBeEnabled();
  await page.evaluate(() => {
    (window as any).notificationDevice.permission = "granted";
    (window as any).notificationDevice.resolvePermission("granted");
    window.dispatchEvent(new Event("focus"));
  });
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "false");
  await alerts.notificationSwitch.click();
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
});

test("leaving settings during permission setup does not enable notifications later", async ({ page }) => {
  await mockNotificationDevice(page);
  await mockApp(page, true, false);
  await mockAlerts(page);
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await alerts.notificationSwitch.click();
  await expect.poll(() => page.evaluate(() => (window as any).notificationDevice.pendingPermission)).toBe(true);
  await new HeaderComponent(page).navBoardBtn.click();
  await expect(page).toHaveURL(/\/board$/);
  await expect(alerts.notificationSwitch).toHaveCount(0);
  await page.evaluate(() => {
    (window as any).notificationDevice.permission = "granted";
    (window as any).notificationDevice.resolvePermission("granted");
    window.dispatchEvent(new Event("focus"));
  });
  await page.goto("/settings");
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "false");
});

for (const status of [403, 410]) {
  test(`expired push installation (${status}) reconnects once through the same transport`, async ({ page }) => {
    await mockNotificationDevice(page, true);
    await mockApp(page, true, false);
    await mockAlerts(page);
    await page.route("**/api/alerts/config", route => route.fulfill({ json: { enabled: true, pushKey: "AQID" } }));
    const registrations: any[] = [], tests: any[] = [];
    await page.route("**/api/alerts/subscribe", route => {
      registrations.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: true } });
    });
    await page.route("**/api/alerts/revoke", route => route.fulfill({ json: { data: true } }));
    let alwaysGone = false;
    await page.route("**/api/alerts/test", route => {
      tests.push(route.request().postDataJSON());
      return route.fulfill(tests.length === 1 || alwaysGone
        ? { status, json: { code: "installation_unavailable", error: "This notification installation is unavailable." } }
        : { json: { data: true } });
    });
    await page.goto("/settings");
    const alerts = new AlertsPage(page);
    await alerts.notificationSwitch.click();
    await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
    await alerts.testNotification.click();
    await expect(page.getByRole("status")).toHaveText("Test notification requested.");
    expect(registrations).toHaveLength(2);
    expect(tests).toHaveLength(2);
    expect(tests[1].installationId).toBe(registrations[1].installationId);
    expect(tests[1].installationId).not.toBe(tests[0].installationId);
    expect(await page.evaluate(() => (window as any).notificationDevice.displayed)).toBe(0);
    alwaysGone = true;
    await alerts.testNotification.click();
    await expect(page.getByRole("alert")).toContainText("Push connection expired");
    await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "false");
    await expect(alerts.notificationSwitch).toBeEnabled();
    expect(tests).toHaveLength(4);
    expect(registrations).toHaveLength(3);
  });
}
