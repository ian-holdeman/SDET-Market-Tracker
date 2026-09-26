import type { Page } from "@playwright/test";
export class AlertsPage {
  constructor(readonly page: Page) {}
  bell(symbol = "AAPL") {
    return this.page.getByRole("button", {
      name: `Price alerts for ${symbol}`,
      exact: true,
    });
  }
  get modal() {
    return this.page.getByRole("dialog", { name: "Price alert", exact: true });
  }
  get target() {
    return this.modal.getByRole("textbox", { name: /^Target/ });
  }
  get above() {
    return this.modal.getByRole("radio", { name: "At or above" });
  }
  get below() {
    return this.modal.getByRole("radio", { name: "At or below" });
  }
  get create() {
    return this.modal.getByRole("button", {
      name: "Create alert",
      exact: true,
    });
  }
  get save() {
    return this.modal.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
  }
  get rules() {
    return this.modal.getByTestId("alert-rule");
  }
  get close() {
    return this.modal.getByRole("button", {
      name: "Close Price alert",
      exact: true,
    });
  }
  get historyBell() {
    return this.page.getByRole("button", {
      name: "Alert history",
      exact: true,
    });
  }
  get history() {
    return this.page.getByRole("dialog", {
      name: "Alert history",
      exact: true,
    });
  }
  get events() {
    return this.history.getByTestId("alert-event");
  }
  get older() {
    return this.history.getByRole("button", {
      name: "Older alerts",
      exact: true,
    });
  }
  get notificationSwitch() {
    return this.page.getByRole("switch", { name: "Browser notifications" });
  }
  get testNotification() {
    return this.page.getByRole('button', { name: 'Send test notification', exact: true });
  }
  async add(target: string) {
    await this.target.fill(target);
    await this.create.click();
  }
}
