import { test, expect } from "../../fixtures/showcase-test";
import { mockApp } from "../../fixtures/auth";
import { mockAlerts, alertEvent } from "../../fixtures/alerts";
import { mockNotificationDevice } from "../../fixtures/notifications";
import { AlertsPage } from "../../pages/alerts.page";

for (const boundary of ["history", "count"] as const) {
  test(`one failed ${boundary} poll does not lose a recent notification; long gaps do not replay`, async ({ page }) => {
    await mockNotificationDevice(page);
    await page.addInitScript(() => { (window as any).notificationDevice.permission = "granted"; });
    const now = new Date("2026-11-08T20:00:00Z");
    await page.clock.install({ time: now });
    await mockApp(page, true);
    const state = await mockAlerts(page);
    state.events = [alertEvent("baseline", 100, now.getTime() - 1000)];
    let failed = false;
    await page.route("**/rest/v1/alert_events?**", route => {
      if (!failed || (route.request().method() === "HEAD") !== (boundary === "count")) return route.fallback();
      // A malformed response fails validation immediately. The other half of
      // the history/count pair still succeeds, exercising partial failure.
      return route.fulfill(boundary === "count" ? { body: "" } : { json: null });
    });
    await page.goto("/settings");
    const alerts = new AlertsPage(page);
    await expect(alerts.unreadIndicator).toBeVisible();
    await alerts.notificationSwitch.click();
    await expect(alerts.notificationSwitch).toHaveAttribute("aria-checked", "true");
    await alerts.historyBell.click();
    await expect(alerts.events).toHaveCount(1);
    state.events = [];
    await page.clock.pauseAt(new Date(now.getTime() + 60000));
    await expect(alerts.events).toHaveCount(0);
    await page.evaluate(() => navigator.locks.request("imt-alert-notifications", () => undefined));
    await page.clock.runFor(1000);
    state.events = [alertEvent("brief-outage", 101, await page.evaluate(() => Date.now()))];
    failed = true;
    await page.clock.runFor(15000);
    await expect(alerts.history.getByRole("alert")).toContainText("Alert history could not be refreshed.");
    expect(await page.evaluate(() => (window as any).notificationDevice.displayed)).toBe(0);
    failed = false;
    await page.clock.runFor(15000);
    await expect(alerts.events).toHaveCount(1);
    await page.evaluate(() => navigator.locks.request("imt-alert-notifications", () => undefined));
    expect(await page.evaluate(() => (window as any).notificationDevice.displayed)).toBe(1);
    state.events.push(alertEvent("long-outage", 102, await page.evaluate(() => Date.now())));
    failed = true;
    await page.clock.fastForward(60000);
    await expect(alerts.history.getByRole("alert")).toContainText("Alert history could not be refreshed.");
    failed = false;
    await page.clock.runFor(15000);
    await expect(alerts.events).toHaveCount(2);
    await page.evaluate(() => navigator.locks.request("imt-alert-notifications", () => undefined));
    expect(await page.evaluate(() => (window as any).notificationDevice.displayed)).toBe(1);
  });
}
