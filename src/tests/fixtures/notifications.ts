import type { Page } from "@playwright/test";

/** Browser-owned permission/push APIs only; requests still exercise the real UI. */
export async function mockNotificationDevice(page: Page, push = false) {
  await page.addInitScript(({ push }) => {
    const state: any = (window as any).notificationDevice = {
      permission: "default", pendingPermission: false, subscriptions: 0,
      unsubscribe: 0, displayed: 0,
    };
    Object.defineProperty(window, "Notification", { value: class {
      static get permission() { return state.permission; }
      static requestPermission() {
        if (state.permission === "granted") return Promise.resolve("granted");
        state.pendingPermission = true;
        return new Promise<string>(resolve => { state.resolvePermission = resolve; });
      }
      constructor() { state.displayed++; }
    } });
    if (!push) return;
    state.permission = "granted";
    Object.defineProperty(navigator, "userAgent", { value: "Android" });
    Object.defineProperty(window, "PushManager", { value: class {} });
    const match = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const result = match(query);
      if (query === "(display-mode: standalone)") Object.defineProperty(result, "matches", { value: true });
      return result;
    };
    let subscription: any = null;
    const registration = {
      active: { postMessage: (_: unknown, ports: MessagePort[]) => ports[0].postMessage(2) },
      pushManager: {
        getSubscription: async () => subscription,
        subscribe: async () => {
          state.subscriptions++;
          subscription = {
            unsubscribe: async () => { state.unsubscribe++; subscription = null; return true; },
            toJSON: () => ({ endpoint: "https://fcm.googleapis.com/wp/mock-" + state.subscriptions,
              keys: { auth: "a", p256dh: "b" } }),
          };
          return subscription;
        },
      },
      getNotifications: async () => [],
    };
    Object.defineProperty(navigator, "serviceWorker", { value: {
      getRegistration: async () => registration,
    } });
  }, { push });
}
