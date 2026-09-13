import { test, expect } from "../../fixtures/showcase-test";
import { HeaderComponent } from "../../pages/components/header.component";
test("header indicators follow sessions and verified activity, then clear on failure", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-08T08:00:00Z") });
  let active = true,
    fail = false;
  await page.route("**/api/test-activity", (r) =>
    fail
      ? r.fulfill({ status: 502, json: {} })
      : r.fulfill({ json: { active, checkedAt: "2026-09-08T08:00:00.000Z" } }),
  );
  await page.goto("/");
  const header = new HeaderComponent(page);
  await expect(header.boardActivity).toBeVisible();
  await expect(header.testsActivity).toBeVisible();
  active = false;
  await page.clock.runFor(30000);
  await expect(header.testsActivity).toHaveCount(0);
  active = true;
  fail = true;
  await page.clock.runFor(30000);
  await expect(header.testsActivity).toHaveCount(0);
  await page.clock.setSystemTime(new Date("2026-09-12T16:00:00Z"));
  await page.clock.runFor(1000);
  await expect(header.boardActivity).toHaveCount(0);
});
