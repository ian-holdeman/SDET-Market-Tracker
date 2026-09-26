import { test, expect } from "../../fixtures/showcase-test";
import { mockApp } from "../../fixtures/auth";
import { mockAlerts, alertEvent } from "../../fixtures/alerts";
import { AlertsPage } from "../../pages/alerts.page";
import { TheBoardPage } from "../../pages/the-board.page";
import { HeaderComponent } from "../../pages/components/header.component";

test("searched assets support alerts without watchlist or curation changes", async ({
  page,
}) => {
  const account = await mockApp(page, true);
  account.populated = true;
  const state = await mockAlerts(page);
  await page.route("**/api/search?**", (route) =>
    route.fulfill({
      json: {
        results: [{ symbol: "MDB", name: "MongoDB, Inc.", assetType: "Stock" }],
      },
    }),
  );
  await page.route("**/api/quotes?symbols=MDB", (route) =>
    route.fulfill({
      json: {
        quotes: [
          {
            symbol: "MDB",
            name: "MongoDB, Inc.",
            assetType: "Stock",
            price: 102,
            change: 2,
            changePercent: 2,
            currency: "USD",
            asOf: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.goto("/board");
  const board = new TheBoardPage(page),
    alerts = new AlertsPage(page);
  await board.searchAsset("MongoDB, Inc.");
  await board.assetRow("MDB").click();
  await alerts.bell("MDB").click();
  await alerts.add("102.50");
  await expect(alerts.rules).toHaveCount(1);
  expect(state.rules[0]).toMatchObject({
    symbol: "MDB",
    target: 102.5,
    unit: "USD",
  });
  expect(account.watchlist).toEqual([]);
  expect(account.curated).toEqual(["AAPL", "MSFT"]);
});

test("opening a history entry marks only that event and restores its asset deep link", async ({
  page,
}) => {
  const account = await mockApp(page, true);
  account.populated = true;
  const state = await mockAlerts(page);
  state.events = [
    alertEvent("open-one"),
    alertEvent("leave-unread", 102, Date.now() - 1000),
  ];
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await alerts.historyBell.click();
  await alerts.events.first().getByRole("button", { name: /AAPL/ }).click();
  await expect(page).toHaveURL(/\/board\/AAPL$/);
  await expect(alerts.bell()).toBeVisible();
  expect(state.reads).toEqual([state.events[0].id]);
});

test(
  "signed-in alert create/delete preserves the watchlist",
  { tag: "@smoke" },
  async ({ page }) => {
    const account = await mockApp(page, true);
    account.populated = true;
    await mockAlerts(page);
    await page.goto("/board/AAPL");
    const alerts = new AlertsPage(page);
    await expect(new HeaderComponent(page).username).toHaveText("Test Member");
    await alerts.bell().click();
    await alerts.add("0");
    await expect(alerts.rules).toHaveCount(1);
    await alerts.rules
      .first()
      .getByRole("button", { name: /^Delete/ })
      .click();
    await expect(alerts.rules).toHaveCount(0);
    expect(account.watchlist).toEqual([]);
  },
);

test("target entry ignores excess digits and invalid characters while keeping the visible value saveable", async ({ page }) => {
  await mockApp(page, true);
  const state = await mockAlerts(page);
  await page.goto('/board/AAPL');
  const alerts = new AlertsPage(page);
  await expect(new HeaderComponent(page).username).toHaveText("Test Member");
  await alerts.bell().click();
  await alerts.target.fill('1.23');
  await alerts.target.pressSequentially('4abc.');
  await expect(alerts.target).toHaveValue('1.23');
  await expect(alerts.modal.getByRole('alert')).toHaveCount(0);
  await expect(alerts.create).toBeEnabled();
  await alerts.target.fill('-12.345');
  await expect(alerts.target).toHaveValue('1.23');
  await expect(alerts.modal.getByRole('alert')).toHaveCount(0);
  await expect(alerts.create).toBeEnabled();
  await alerts.target.press('Enter');
  await expect(alerts.rules).toHaveCount(1);
  expect(state.rules[0].target).toBe(1.23);
  await alerts.add('-12.34');
  await expect(alerts.rules).toHaveCount(2);
  expect(state.rules[1].target).toBe(-12.34);
});
test("asset alerts stay in descending target order after creation, editing and reload", async ({ page }) => {
  await mockApp(page, true);
  await mockAlerts(page);
  await page.goto("/board/AAPL");
  const alerts = new AlertsPage(page);
  await alerts.bell().click();
  for (const [index, target] of ["9.99", "100.10", "-1", "0"].entries()) {
    await alerts.add(target);
    await expect(alerts.rules).toHaveCount(index + 1);
  }
  await expect(alerts.rules).toHaveText(["At or above 100.1 USD", "At or above 9.99 USD", "At or above 0 USD", "At or above -1 USD"]);
  await alerts.rules.last().getByRole("button", { name: /^Edit/ }).click();
  await alerts.below.check();
  await alerts.target.fill("150.25");
  await alerts.save.click();
  await expect(alerts.rules).toHaveText(["At or below 150.25 USD", "At or above 100.1 USD", "At or above 9.99 USD", "At or above 0 USD"]);
  await expect(alerts.rules.first()).toContainText("At or below");
  await page.reload();
  await alerts.bell().click();
  await expect(alerts.rules).toHaveText(["At or below 150.25 USD", "At or above 100.1 USD", "At or above 9.99 USD", "At or above 0 USD"]);
});

test("guest alert action uses sign-in without creating a rule", async ({
  page,
}) => {
  await mockApp(page);
  const state = await mockAlerts(page);
  await page.goto("/board/AAPL");
  const alerts = new AlertsPage(page);
  await alerts.bell().click();
  await expect(page.getByRole("dialog")).toContainText(
    "Sign in to create private price alerts.",
  );
  expect(state.rules).toHaveLength(0);
  await expect(alerts.historyBell).toHaveCount(0);
  await page.getByRole('button', {name:'Continue with Google'}).click();
  await expect(alerts.historyBell).toBeVisible();
  expect(state.rules).toHaveLength(0);
  await expect(alerts.modal).toHaveCount(0);
});
for (const theme of ["dark", "light"] as const)
  test(`four independent targets, recovery and stable chart in ${theme}`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    const account = await mockApp(page, true);
    const state = await mockAlerts(page);
    account.populated = true;
    await page.goto("/board/AAPL");
    const alerts = new AlertsPage(page),
      board = new TheBoardPage(page);
    await board.chart("AAPL").timeframe("1M").click();
    await alerts.bell().click();
    await expect(alerts.target).toBeVisible();
    await alerts.below.check();
    await expect(alerts.below).toBeChecked();
    await alerts.modal.screenshot({ path: testInfo.outputPath(`comparison-selected-${theme}.png`) });
    await alerts.above.check();
    state.failSave = true;
    await alerts.add("-0.01");
    await expect(alerts.modal.getByRole("alert")).toContainText(
      "temporarily unavailable",
    );
    await expect(alerts.target).toHaveValue("-0.01");
    state.failSave = false;
    await alerts.create.click();
    await expect(alerts.rules).toHaveCount(1);
    await alerts.add("0");
    await expect(alerts.rules).toHaveCount(2);
    await alerts.add("100.12");
    await expect(alerts.rules).toHaveCount(3);
    await alerts.add("123456789.12");
    await expect(alerts.rules).toHaveCount(4);
    await expect(alerts.create).toHaveCount(0);
    expect(state.rules.every((r) => r.comparison === "above")).toBe(true);
    await alerts.rules.first().getByRole("button", { name: /^Edit/ }).click();
    await alerts.below.check();
    await alerts.target.fill("-1");
    await alerts.save.click();
    await expect(alerts.rules).toHaveCount(4);
    expect(
      state.rules.some((r) => r.target === -1 && r.comparison === "below"),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`four-alerts-${theme}.png`),
    });
    state.failDelete = true;
    await alerts.rules
      .first()
      .getByRole("button", { name: /^Delete/ })
      .click();
    await expect(alerts.modal.getByRole("alert")).toContainText(
      "Deletion was not confirmed",
    );
    await expect(alerts.rules).toHaveCount(4);
    state.failDelete = false;
    await alerts.rules
      .first()
      .getByRole("button", { name: /^Delete/ })
      .click();
    await expect(alerts.rules).toHaveCount(3);
    await alerts.close.click();
    await expect(alerts.bell()).toBeFocused();
    await expect(board.chart("AAPL").timeframe("1M")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(account.watchlist).toEqual([]);
    await page.reload();
    await alerts.bell().click();
    await expect(alerts.rules).toHaveCount(3);
  });
test("form focus includes input and wraps in both directions; Escape restores opener", async ({
  page,
}) => {
  await mockApp(page, true);
  await mockAlerts(page);
  await page.goto("/board/AAPL");
  const alerts = new AlertsPage(page);
  await alerts.bell().click();
  await expect(alerts.target).toBeVisible();
  await alerts.close.focus();
  await page.keyboard.press("Tab");
  await expect(alerts.above).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(alerts.target).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(alerts.create).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(alerts.close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(alerts.create).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(alerts.modal).toHaveCount(0);
  await expect(alerts.bell()).toBeFocused();
});
test("history opening is not read-all; per-entry persistence, failure and settings remain distinct", async ({
  page,
}) => {
  await mockApp(page, true);
  const state = await mockAlerts(page);
  state.events = [alertEvent("one"), alertEvent("two", 102, Date.now() - 1000)];
  await page.goto("/board");
  const alerts = new AlertsPage(page);
  await expect(page.getByRole("img", { name: "Unread alerts" })).toBeVisible();
  await alerts.historyBell.click();
  await expect(alerts.events).toHaveCount(2);
  expect(state.reads).toEqual([]);
  state.failRead = true;
  await alerts.events
    .first()
    .getByRole("button", { name: "Mark as read" })
    .click();
  await expect(alerts.history.getByRole("alert")).toContainText(
    "Read status was not saved",
  );
  state.failRead = false;
  await alerts.events
    .first()
    .getByRole("button", { name: "Mark as read" })
    .click();
  await expect(
    alerts.history.getByRole("button", { name: "Mark as read" }),
  ).toHaveCount(1);
  expect(state.reads).toEqual([state.events[0].id]);
  await alerts.history
    .getByRole("button", { name: "Notification Settings" })
    .click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
test("permission denial preserves history and a failed opt-in stays off", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      value: class {
        static permission = "denied";
        static async requestPermission() {
          return "denied";
        }
      },
    });
  });
  await mockApp(page, true);
  await mockAlerts(page);
  await page.goto("/settings");
  const alerts = new AlertsPage(page);
  await alerts.notificationSwitch.click();
  await expect(page.getByRole("alert")).toContainText(
    "Notifications are blocked",
  );
  await expect(alerts.notificationSwitch).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
