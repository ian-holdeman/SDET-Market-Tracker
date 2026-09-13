import { Locator } from "@playwright/test";

export type RunMetric =
  | "pass-rate"
  | "total-tests"
  | "duration"
  | "flaky-tests";

/** Shared by Home, dashboard and report; selectors do not depend on copy or styling. */
export class RunMetricsComponent {
  constructor(readonly root: Locator) {}
  get refreshStatus() { return this.root.getByTestId('result-refresh-status'); }

  value(metric: RunMetric): Locator {
    return this.root
      .getByTestId("run-metric-" + metric)
      .getByTestId("metric-value");
  }
}
