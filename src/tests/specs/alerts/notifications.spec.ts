import { test, expect } from "../../fixtures/showcase-test";
import { mockApp, id } from "../../fixtures/auth";
import { mockAlerts, alertEvent, alertState } from "../../fixtures/alerts";
import { AlertsPage } from "../../pages/alerts.page";

test("a regular member can test the same browser notification channel without creating history", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    (window as any).displayed = [];
    Object.defineProperty(window, "Notification", {
      value: class {
        static permission = "granted";
        static async requestPermission() {
          return "granted";
        }
        constructor(title: string, options: any) {
          (window as any).displayed.push({ title, options });
        }
        close() {}
      },
    });
  });
  await mockApp(page, true, false);
  const state = await mockAlerts(page);
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await expect(alerts.testNotification).toBeDisabled();
  await alerts.notificationSwitch.click();
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await alerts.testNotification.click();
  await expect
    .poll(() => page.evaluate(() => (window as any).displayed.length))
    .toBe(1);
  const notification = await page.evaluate(() => (window as any).displayed[0]);
  expect(notification.title).toBe("Test price alert");
  expect(notification.options.tag).toMatch(/^imt-alert-/);
  expect(state.events).toEqual([]);
  expect(state.rules).toEqual([]);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.screenshot({
      path: testInfo.outputPath(`notification-settings-${theme}.png`),
    });
  }
  await page.evaluate(() => {
    (Notification as any).permission = "denied";
  });
  await alerts.testNotification.click();
  await expect(page.getByRole("alert")).toContainText(
    "Notifications are blocked",
  );
  expect(await page.evaluate(() => (window as any).displayed.length)).toBe(1);
  await alerts.notificationSwitch.click();
  await expect(alerts.testNotification).toBeDisabled();
});

test("installed push tests use the server transport and expose failure without a local notification fallback", async ({
  page,
}) => {
  const installationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await page.addInitScript(
    ({ owner, installationId }) => {
      (window as any).displayed = [];
      Object.defineProperty(window, "Notification", {
        value: class {
          static permission = "granted";
          constructor(title: string) {
            (window as any).displayed.push(title);
          }
        },
      });
      localStorage.setItem(
        "imt_alert_notifications",
        JSON.stringify({ owner, mode: "push", since: Date.now() }),
      );
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          getRegistration: async () => ({
            active: {
              postMessage: (_: unknown, ports: MessagePort[]) =>
                ports[0].postMessage(2),
            },
            pushManager: { getSubscription: async () => ({}) },
          }),
        },
      });
      (window as any).notificationSetup = new Promise<void>(
        (resolve, reject) => {
          const request = indexedDB.open("imt-alert-delivery", 1);
          request.onupgradeneeded = () =>
            request.result.createObjectStore("installation");
          request.onerror = () => reject();
          request.onsuccess = () => {
            const db = request.result,
              tx = db.transaction("installation", "readwrite");
            tx.objectStore("installation").put(
              {
                owner,
                installationId,
                capability: "A".repeat(43),
                enabled: true,
              },
              "current",
            );
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
          };
        },
      );
    },
    { owner: id, installationId },
  );
  await mockApp(page, true, false);
  await mockAlerts(page);
  const requests: any[] = [];
  let failed = true;
  await page.route("**/api/alerts/test", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      status: failed ? 503 : 200,
      json: failed
        ? { error: "Test notification could not be sent." }
        : { data: true },
    });
  });
  await page.goto("/settings");
  await page.evaluate(() => (window as any).notificationSetup);
  const alerts = new AlertsPage(page);
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await alerts.testNotification.click();
  await expect(page.getByRole("alert")).toContainText(
    "Test notification could not be sent.",
  );
  expect(requests[0]).toMatchObject({
    installationId,
    capability: "A".repeat(43),
  });
  failed = false;
  await alerts.testNotification.click();
  await expect(page.getByRole("status")).toHaveText(
    "Test notification requested.",
  );
  expect(requests).toHaveLength(2);
  expect(await page.evaluate(() => (window as any).displayed)).toEqual([]);
});

test("ordinary tabs display one notification per installation", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    (window as any).displayed = [];
    Object.defineProperty(window, "Notification", {
      value: class {
        static permission = "granted";
        static async requestPermission() {
          return "granted";
        }
        constructor(title: string) {
          (window as any).displayed.push(title);
        }
        close() {}
      },
    });
  });
  const now = new Date("2026-09-25T19:00:00Z");
  await page.clock.install({ time: now });
  await mockApp(page, true);
  const state = await mockAlerts(page);
  await page.goto("/settings");
  const first = new AlertsPage(page);
  await first.notificationSwitch.click();
  await expect(first.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "true",
  );
  const other = await context.newPage();
  await other.clock.install({ time: now });
  await mockApp(other, true);
  await mockAlerts(other, state);
  await other.goto("/settings");
  await expect(new AlertsPage(other).notificationSwitch).toHaveAttribute(
    "aria-checked",
    "true",
  );
  // Let Auth and route loading settle before freezing timers. Keep the event
  // newer than both clients' opt-in/resumption baselines, independent of latency.
  const settled = new Date(now.getTime() + 60000);
  await Promise.all([page.clock.pauseAt(settled), other.clock.pauseAt(settled)]);
  await Promise.all([page.clock.runFor(1000), other.clock.runFor(1000)]);
  state.events = [alertEvent("shared-notification", 103, settled.getTime() + 1000)];
  await Promise.all([page.clock.runFor(15000), other.clock.runFor(15000)]);
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => (window as any).displayed.length)) +
        (await other.evaluate(() => (window as any).displayed.length)),
    )
    .toBe(1);
  await other.close();
});

test("history paginates without duplicates and refreshes read state beyond the first page", async ({
  page,
}) => {
  await page.clock.install();
  await mockApp(page, true);
  const state = await mockAlerts(page);
  const now = await page.evaluate(() => Date.now());
  state.events = Array.from({ length: 65 }, (_, i) =>
    alertEvent(`page-${i}`, 100 + i, now - i * 1000),
  );
  await page.goto("/board");
  const alerts = new AlertsPage(page);
  await alerts.historyBell.click();
  await expect(alerts.events).toHaveCount(30);
  await alerts.older.click();
  await expect(alerts.events).toHaveCount(60);
  await alerts.older.click();
  await expect(alerts.events).toHaveCount(65);
  await expect(alerts.older).toHaveCount(0);
  state.events[64].read_at = new Date(now).toISOString();
  await page.clock.runFor(15000);
  await expect(
    alerts.events.last().getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(0);
  await expect(alerts.events).toHaveCount(65);
});

test("ordinary notifications opt in explicitly and never replay on reopen or resumption", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).displayed = [];
    Object.defineProperty(window, "Notification", {
      value: class {
        static permission = "granted";
        static async requestPermission() {
          return "granted";
        }
        constructor(title: string) {
          (window as any).displayed.push(title);
        }
        close() {}
      },
    });
  });
  await page.clock.install({ time: new Date("2026-09-25T19:00:00Z") });
  await mockApp(page, true);
  const state = await mockAlerts(page);
  state.events = [alertEvent("old", 101, Date.parse("2026-09-25T18:59:00Z"))];
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await alerts.notificationSwitch.click();
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(await page.evaluate(() => (window as any).displayed)).toEqual([]);
  await page.clock.runFor(1000);
  state.events.unshift(
    alertEvent("new", 102, await page.evaluate(() => Date.now())),
  );
  await page.clock.runFor(15000);
  await expect
    .poll(() => page.evaluate(() => (window as any).displayed.length))
    .toBe(1);
  await page.clock.runFor(15000);
  expect(await page.evaluate(() => (window as any).displayed.length)).toBe(1);
  await page.reload();
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.clock.runFor(15000);
  expect(await page.evaluate(() => (window as any).displayed)).toEqual([]);
  state.events.unshift(
    alertEvent("suspended", 103, await page.evaluate(() => Date.now())),
  );
  await page.clock.fastForward(90000);
  expect(await page.evaluate(() => (window as any).displayed)).toEqual([]);
  await alerts.notificationSwitch.click();
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "false",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("imt_alert_notifications")),
  ).toBeNull();
});

test("history read state synchronizes between two clients without opening the list marking it read", async ({
  page,
  context,
}) => {
  await page.clock.install();
  await mockApp(page, true);
  const state = alertState();
  await mockAlerts(page, state);
  state.events = [alertEvent("shared")];
  await page.goto("/board");
  const first = new AlertsPage(page);
  const secondPage = await context.newPage();
  await secondPage.clock.install();
  await mockApp(secondPage, true);
  await mockAlerts(secondPage, state);
  await secondPage.goto("/board");
  const second = new AlertsPage(secondPage);
  await first.historyBell.click();
  await second.historyBell.click();
  expect(state.reads).toEqual([]);
  await first.events
    .first()
    .getByRole("button", { name: "Mark as read" })
    .click();
  await secondPage.clock.runFor(15000);
  await expect(
    second.history.getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(0);
  await secondPage.close();
});
