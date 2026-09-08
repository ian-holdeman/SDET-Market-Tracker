import { RunMetricsComponent } from "./components/run-metrics.component";
import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";
import { RecordedShowcaseComponent } from './components/recorded-showcase.component';

export class TheTestsPage extends BasePage {
  readonly pageHeading: Locator;

  readonly results: RunMetricsComponent;
  readonly showcase: RecordedShowcaseComponent;

  constructor(page: Page) {
    super(page);
    this.results = new RunMetricsComponent(page.getByTestId("test-dashboard"));
    this.showcase = new RecordedShowcaseComponent(page);
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
