import { HomePage } from "../../pages/home.page";
import { TheTestsPage } from "../../pages/the-tests.page";
import { test, expect } from "../../fixtures/showcase-test";
import { evidence, published, feed } from "../../fixtures/testEvidence";
import { RunReportComponent } from '../../pages/components/run-report.component';
function varied(
  number: number,
  status: "passed" | "flaky" | "failed" | "incomplete" = "passed",
) {
  const e = evidence();
  e.runId = String(100 + number);
  if (status === "flaky") {
    e.tests[0].attempts[0].status = "failed";
    e.tests[0].attempts.push({
      retry: 1,
      status: "passed",
      durationMs: 7,
      startedAt: "2026-09-07T00:00:02.000Z",
    });
  }
  if (status === "failed") {
    e.tests[0].attempts[0].status = "failed";
    e.runnerStatus = "failed";
  }
  const r = published(status === "incomplete" ? null : e);
  r.id = String(100 + number);
  r.number = number;
  r.url = `https://github.com/owner/repo/actions/runs/${r.id}/attempts/1`;
  return r;
}
test("empty and failed retrieval states remain distinct", async ({ page }) => {
  let fail = false;
  await page.route("**/api/test-history**", (r) =>
    fail ? r.fulfill({ status: 502, json: {} }) : r.fulfill({ json: feed([]) }),
  );
  await page.goto("/tests");
  await expect(
    page.getByText("No verified runs yet.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /run suite|start execution|simulate/i }),
  ).toHaveCount(0);
  fail = true;
  await page.getByRole("button", { name: "Refresh test history" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
test("flaky report, focus restoration and stale data preserve accurate metrics", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/api/test-history**", (r) =>
    fail
      ? r.fulfill({ status: 502, json: {} })
      : r.fulfill({ json: feed([varied(3, "flaky")]) }),
  );
  await page.goto("/tests");
  const dashboardMetrics = new TheTestsPage(page).results;
  const dashboard = dashboardMetrics.root;
  await expect(dashboardMetrics.value("pass-rate")).toContainText("0%");
  await expect(dashboardMetrics.value("flaky-tests")).toContainText("1");
  await expect(dashboardMetrics.value("duration")).toContainText("5.0s");
  await expect(dashboard).not.toContainText("Clean");
  await expect(dashboard).not.toContainText("main");
  const open = page.getByRole("button", { name: "View Report", exact: true });
  await open.click();
  const report = page.getByRole("dialog");
  await new RunReportComponent(report).expandResults();
  await expect(report.getByText(/Attempt 1: failed/)).toBeVisible();
  await expect(report.getByText(/Attempt 2: passed/)).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(await report.evaluate((e) => e.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await expect(report).toHaveCount(0);
  await expect(open).toBeFocused();
  fail = true;
  await page.getByRole("button", { name: "Refresh test history" }).click();
  await expect(page.getByRole("alert")).toContainText("saved results");
  await expect(dashboardMetrics.value("pass-rate")).toContainText("0%");
  await page.route("**/api/test-history**", (r) =>
    r.fulfill({ json: feed([varied(3, "flaky")]) }),
  );
  await page.goto("/");
  const homeMetrics = new HomePage(page).results;
  const home = homeMetrics.root;
  await expect(homeMetrics.value("pass-rate")).toContainText("0%");
  await expect(homeMetrics.value("flaky-tests")).toContainText("1");
});
test("recent results hides empty runs while history paginates and nested details restore focus", async ({
  page,
}) => {
  const first = feed([
    varied(9, "incomplete"),
    ...Array.from({ length: 5 }, (_, i) => varied(8 - i)),
  ]);
  first.nextCursor = "older";
  let older = 0,
    fail = true;
  await page.route("**/api/test-history**", (r) => {
    if (new URL(r.request().url()).searchParams.has("cursor")) {
      older++;
      return fail
        ? r.fulfill({ status: 502, json: {} })
        : r.fulfill({ json: feed([varied(3, "failed")]) });
    }
    return r.fulfill({ json: first });
  });
  await page.goto("/tests");
  const dashboardMetrics = new TheTestsPage(page).results;
  const dashboard = dashboardMetrics.root;
  await expect(
    dashboard.getByText("Showing previous results below."),
  ).toBeVisible();
  await expect(dashboard.locator("tbody tr")).toHaveCount(5);
  await expect(dashboard.locator("tbody")).not.toContainText("#9");
  const open = page.getByRole("button", { name: "Show run history" });
  await open.click();
  const history = page.getByRole("dialog", {
    name: "Run history",
    exact: true,
  });
  await expect(history.locator("tbody tr")).toHaveCount(6);
  await expect(history).toContainText("Incomplete");
  await history.getByRole("button", { name: "Load older runs" }).click();
  await expect(history.getByRole("alert")).toContainText("Retry");
  fail = false;
  await history.getByRole("button", { name: "Retry older runs" }).click();
  await expect(history.locator("tbody tr")).toHaveCount(7);
  expect(older).toBe(2);
  const detail = history.getByRole("button", {
    name: "Details for run #9",
    exact: true,
  });
  await detail.click();
  const report = page.getByRole("dialog", { name: "Run #9", exact: true });
  await expect(report).toContainText("No test results were recorded.");
  await expect(new RunReportComponent(report).results).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('incomplete-details.png') });
  await page.keyboard.press("Escape");
  await expect(report).toHaveCount(0);
  await expect(detail).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(history).toHaveCount(0);
  await expect(open).toBeFocused();
  await page.goto("/");
  const homeMetrics = new HomePage(page).results;
  const home = homeMetrics.root;
  await expect(home).toContainText("Incomplete");
  await expect(homeMetrics.value("pass-rate")).toContainText("100%");
  await expect(home).toContainText("Previous results · #8");
});
test("mobile and desktop results fit the viewport and failures remain prominent", async ({
  page,
}) => {
  await page.route("**/api/test-history**", (r) =>
    r.fulfill({ json: feed([varied(3, "failed")]) }),
  );
  await page.goto("/tests");
  await expect(page.getByText("1 failed", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Show run history" }).click();
  const dialog = page.getByRole("dialog");
  expect(
    await dialog.evaluate(
      (e) => e.getBoundingClientRect().width <= window.innerWidth,
    ),
  ).toBe(true);
});

test("completed results appear automatically without reloading", async ({
  page,
}) => {
  await page.clock.install();
  let completed = false,
    requests = 0;
  await page.route("**/api/test-history**", async (route) => {
    requests++;
    const r = varied(3, completed ? "passed" : "incomplete");
    await route.fulfill({ json: feed([r]) });
  });
  await page.goto("/");
  const home = new HomePage(page);
  await expect(home.results.root).toContainText("Incomplete");
  completed = true;
  await page.clock.runFor(15000);
  await expect(home.results.value("pass-rate")).toHaveText("100%");
  expect(requests).toBe(2);
});

test("navigation keeps cached metrics visible while revalidating a slow response", async ({
  page,
}) => {
  let delay = false;
  let release: (() => void) | undefined;
  await page.route("**/api/test-history**", async (route) => {
    if (delay)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    await route.fulfill({ json: feed([varied(3, "passed")]) });
  });
  await page.goto("/");
  const home = new HomePage(page);
  await expect(home.results.value("pass-rate")).toHaveText("100%");
  delay = true;
  await home.testsCard.click();
  const dashboard = new TheTestsPage(page);
  await expect(dashboard.results.value("pass-rate")).toHaveText("100%");
  await expect(
    dashboard.results.root.getByText("Loading results…"),
  ).toHaveCount(0);
  await expect.poll(() => Boolean(release)).toBe(true);
  release!();
  delay = false;
  await expect(
    page.getByRole("button", { name: "Refresh test history" }),
  ).toBeEnabled();
});

test("cold skeleton and saved snapshot stay mounted until a verified refresh arrives", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  let state = 0;
  await page.route("**/api/test-history**", (route) =>
    route.fulfill({
      json: {
        ...feed(
          state === 0 ? [] : [varied(3, state === 1 ? "failed" : "passed")],
        ),
        refreshing: state < 2,
        snapshot: state === 1,
      },
    }),
  );
  await page.goto("/");
  const root = new HomePage(page).results.root;
  await expect(root.getByTestId("metric-skeleton")).toHaveCount(4);
  const tile = root.getByTestId("run-metric-pass-rate");
  const before = await tile.boundingBox();
  await tile.evaluate((el) => el.setAttribute("data-mounted", "yes"));
  state = 1;
  await expect(root.getByTestId("metric-value").first()).toContainText("0%");
  await expect(root.getByTestId("result-refresh-status")).toContainText(
    "Checking for updates.",
  );
  state = 2;
  await expect(root.getByTestId("metric-value").first()).toContainText("100%");
  await expect(tile).toHaveAttribute("data-mounted", "yes");
  const after = await tile.boundingBox();
  expect(after!.width).toBe(before!.width);
  expect(Math.abs(after!.height - before!.height)).toBeLessThan(2);
  expect(
    await tile
      .locator(".metric-reveal")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
