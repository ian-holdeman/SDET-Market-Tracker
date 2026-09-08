import { RunMetricsComponent } from "./components/run-metrics.component";
import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";

export class HomePage extends BasePage {
  readonly heroHeading: Locator;
  readonly boardCard: Locator;
  readonly testsCard: Locator;

  readonly results: RunMetricsComponent;

  constructor(page: Page) {
    super(page);
    this.results = new RunMetricsComponent(page.getByTestId("test-snapshot"));
    this.heroHeading = page.getByRole("heading", {
      name: "The SDET's Market Tracker",
      exact: true,
    });
    this.boardCard = page.getByRole("button", {
      name: "The Board Card",
      exact: true,
    });
    this.testsCard = page.getByRole("button", {
      name: "The Tests Card",
      exact: true,
    });
  }

  async open(): Promise<void> {
    await this.navigateTo();
    await this.heroHeading.waitFor({ state: "visible" });
  }
}
