import { test, expect } from "../../fixtures/showcase-test";
import { mockApp, id } from "../../fixtures/auth";
import { mockAlerts } from "../../fixtures/alerts";
import { mockNotificationDevice } from "../../fixtures/notifications";
import { AlertsPage } from "../../pages/alerts.page";
import { HeaderComponent } from "../../pages/components/header.component";

test("installed app upgrades tab delivery only on request and preserves it when setup fails", async ({ page }) => {
  await mockNotificationDevice(page, true);
  await page.addInitScript(owner => {
    localStorage.setItem("imt_alert_notifications", JSON.stringify({ owner, mode: "tab", since: Date.now() }));
  }, id);
  await mockApp(page, true);
  await mockAlerts(page);
  let unavailable = true;
  await page.route("**/api/alerts/config", route => route.fulfill(unavailable
    ? { status: 503, json: { error: "Unavailable" } }
    : { json: { enabled: true, pushKey: "AQID" } }));
  const registrations: unknown[] = [];
  await page.route("**/api/alerts/subscribe", route => {
    registrations.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: true } });
  });
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
  await alerts.testNotification.click();
  await expect.poll(() => page.evaluate(() => (window as any).notificationDevice.displayed)).toBe(1);
  await page.evaluate(() => navigator.locks.request("imt-alert-device", () => undefined));
  expect(registrations).toEqual([]);
  await alerts.backgroundPush.click();
  await expect(page.getByRole("alert")).toHaveText("Background push is unavailable.");
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("imt_alert_notifications") || "null").mode)).toBe("tab");
  unavailable = false;
  await alerts.backgroundPush.click();
  await expect(alerts.backgroundPush).toHaveCount(0);
  await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("imt_alert_notifications") || "null").mode)).toBe("push");
  expect(registrations).toHaveLength(1);
  expect(await page.evaluate(() => (window as any).notificationDevice.subscriptions)).toBe(1);
});

test("leaving Settings cancels a pending upgrade and keeps the existing tab choice", async ({ page }) => {
  await mockNotificationDevice(page, true);
  await page.addInitScript(owner => {
    localStorage.setItem("imt_alert_notifications", JSON.stringify({ owner, mode: "tab", since: Date.now() }));
  }, id);
  await mockApp(page, true);
  await mockAlerts(page);
  let release: () => void = () => {}, started = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/alerts/config", async route => {
    started = true;
    await gate;
    await route.fulfill({ json: { enabled: true, pushKey: "AQID" } });
  });
  const registrations: unknown[] = [];
  await page.route("**/api/alerts/subscribe", route => {
    registrations.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: true } });
  });
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await expect(alerts.backgroundPush).toBeVisible();
  await alerts.backgroundPush.click();
  await expect.poll(() => started).toBe(true);
  await new HeaderComponent(page).navBoardBtn.click();
  await expect(page).toHaveURL(/\/board$/);
  release();
  await page.evaluate(() => navigator.locks.request("imt-alert-device", () => undefined));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("imt_alert_notifications") || "null").mode)).toBe("tab");
  expect(registrations).toEqual([]);
  expect(await page.evaluate(() => (window as any).notificationDevice.subscriptions)).toBe(0);
});
