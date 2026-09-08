import { RunMetricsComponent } from "./components/run-metrics.component";
import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class TheTestsPage extends BasePage {
  readonly pageHeading: Locator;

  readonly results: RunMetricsComponent;

  constructor(page: Page) {
    super(page);
    this.results = new RunMetricsComponent(page.getByTestId("test-dashboard"));
    this.pageHeading = page.getByRole("heading", {
      name: "The Tests",
      exact: true,
    });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.header.navTestsBtn.click();
    await this.pageHeading.waitFor({ state: "visible" });
  }
}
