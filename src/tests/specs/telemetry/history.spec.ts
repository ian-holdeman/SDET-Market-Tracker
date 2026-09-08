import { test, expect } from "@playwright/test";
import { evidence, published, feed } from "../../fixtures/testEvidence";

test("empty history is explicit and visitors have no execution controls", async ({
  page,
}) => {
  await page.route("**/api/test-history", (r) => r.fulfill({ json: feed([]) }));
  await page.goto("/tests");
  await expect(
    page.getByText("No verified runs yet.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /run suite|start execution|simulate/i }),
  ).toHaveCount(0);
  await expect(page.getByText("100% Passing")).toHaveCount(0);
  await expect(
    page.getByText("Recordings are not available yet.", { exact: false }),
  ).toBeVisible();
});

test("flaky evidence preserves both attempts and failed refresh retains the previous run", async ({
  page,
}) => {
  const e = evidence();
  e.tests[0].attempts[0].status = "failed";
  e.tests[0].attempts.push({
    retry: 1,
    status: "passed",
    durationMs: 7,
    startedAt: "2026-09-07T00:00:02.000Z",
  });
  let fail = false;
  await page.route("**/api/test-history", (r) =>
    fail
      ? r.fulfill({ status: 502, json: { error: "offline" } })
      : r.fulfill({ json: feed([published(e)]) }),
  );
  await page.goto("/tests");
  await expect(page.getByText("#3.1 · FLAKY")).toBeVisible();
  await page.getByRole("button", { name: "Inspect evidence" }).click();
  const report = page.getByRole("dialog");
  await expect(report).toContainText("Attempt 1: failed");
  await expect(report).toContainText("Attempt 2: passed");
  await expect(report).toContainText("clean passes: 0");
  await expect(report).toContainText("flaky: 1");
  await report
    .getByRole("button", { name: "Close report", exact: true })
    .first()
    .click();
  fail = true;
  await page.getByRole("button", { name: "Refresh test history" }).click();
  await expect(page.getByRole("alert")).toContainText("previous retrieval");
  await expect(page.getByText("#3.1 · FLAKY")).toBeVisible();
});

test("cancelled run without a report never becomes green telemetry on Tests or Home", async ({
  page,
}) => {
  const run = published(null);
  run.conclusion = "cancelled";
  run.status = "cancelled";
  await page.route("**/api/test-history", (r) =>
    r.fulfill({ json: feed([run]) }),
  );
  await page.goto("/tests");
  await expect(page.getByText("#3.1 · CANCELLED")).toBeVisible();
  await expect(
    page.getByText(
      "Test evidence missing; no success rate can be established.",
    ),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#sdet-test-snapshot-card")).toContainText(
    "cancelled",
  );
  await expect(page.locator("#sdet-test-snapshot-card")).not.toContainText(
    "100%",
  );
});

test("initial retrieval failure is not an empty-success state", async ({
  page,
}) => {
  await page.route("**/api/test-history", (r) =>
    r.fulfill({ status: 502, json: {} }),
  );
  await page.goto("/tests");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText("No verified runs yet.", { exact: true }),
  ).toHaveCount(0);
});
