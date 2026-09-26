import type { AlertEvent } from "../types/alerts";
import { alertValue } from "../types/alerts";
import { alertRequest } from "./alerts";

const KEY = "imt_alert_notifications";
export interface NotificationPreference {
  owner: string;
  mode: "tab" | "push";
  since: number;
}
interface Installation {
  owner: string;
  installationId: string;
  capability: string;
  enabled: boolean;
}
export function notificationPreference(): NotificationPreference | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null");
    return p &&
      typeof p.owner === "string" &&
      ["tab", "push"].includes(p.mode) &&
      Number.isFinite(p.since)
      ? p
      : null;
  } catch {
    return null;
  }
}
function preference(value: NotificationPreference | null) {
  if (value) localStorage.setItem(KEY, JSON.stringify(value));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("alert-preference"));
}
async function installation(
  value?: Installation | null,
): Promise<Installation | null> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("imt-alert-delivery", 1);
    let expired = false;
    let transaction: IDBTransaction | undefined;
    const timer = setTimeout(() => {
      expired = true;
      try {
        transaction?.abort();
      } catch {
        /* Already settled. */
      }
      reject(Error("Notification storage is unavailable."));
    }, 3000);
    open.onupgradeneeded = () => open.result.createObjectStore("installation");
    open.onerror = () => {
      clearTimeout(timer);
      reject(Error("Notification storage is unavailable."));
    };
    open.onsuccess = () => {
      const db = open.result;
      if (expired) {
        db.close();
        return;
      }
      transaction = db.transaction(
        "installation",
        value === undefined ? "readonly" : "readwrite",
      );
      const store = transaction.objectStore("installation");
      const request =
        value === undefined
          ? store.get("current")
          : value === null
            ? store.delete("current")
            : store.put(value, "current");
      transaction.oncomplete = () => {
        clearTimeout(timer);
        db.close();
        resolve(value === undefined ? (request.result ?? null) : value);
      };
      transaction.onerror = () => {
        clearTimeout(timer);
        db.close();
        reject(Error("Notification storage is unavailable."));
      };
      transaction.onabort = transaction.onerror;
    };
  });
}
async function retryRevocation() {
  try {
    if (!localStorage.getItem("imt_alert_revocation")) return;
  } catch {
    return;
  }
  const stored = await installation();
  if (!stored) {
    localStorage.removeItem("imt_alert_revocation");
    return;
  }
  if (stored && !stored.enabled) {
    await alertRequest("revoke", {
      installationId: stored.installationId,
      capability: stored.capability,
    });
    await installation(null);
    localStorage.removeItem("imt_alert_revocation");
  }
}
export async function retryNotificationRevocation() {
  if (navigator.locks)
    await navigator.locks.request("imt-alert-device", retryRevocation);
}
export async function disableAlertNotifications() {
  if (!navigator.locks) return;
  await navigator.locks.request("imt-alert-device", async () => {
    const previous = notificationPreference();
    if (!previous) return;
    preference(null); // Stop every ordinary tab immediately, even while offline.
    localStorage.removeItem("imt_alert_seen");
    if (previous?.mode === "push") {
      try {
        const stored = await installation();
        localStorage.setItem("imt_alert_revocation", "pending");
        if (stored) await installation({ ...stored, enabled: false });
        const registration = await navigator.serviceWorker?.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe().catch(() => false);
        for (const notification of (await registration?.getNotifications()) ??
          [])
          if (notification.tag.startsWith("imt-alert-")) notification.close();
        // Durable local off state rejects delayed pushes. Retry remote revocation on
        // the next online app visit; never require network connectivity to sign out.
        await retryRevocation().catch(() => {});
      } catch (error) {
        preference(previous);
        throw error;
      }
    }
  });
}
async function requireNotificationWorker(
  registration: ServiceWorkerRegistration,
) {
  if (!registration.active)
    throw Error("Notification service is still starting. Retry shortly.");
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const finish = () => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
    };
    const timer = setTimeout(() => {
      finish();
      reject(
        Error("Close and reopen the app to update its notification service."),
      );
    }, 3000);
    channel.port1.onmessage = (event) => {
      finish();
      if (event.data === 2) resolve();
      else reject(Error("The notification service needs an update."));
    };
    registration.active!.postMessage("alert-delivery-version", [channel.port2]);
  });
}
export async function enableAlertNotifications(
  owner: string,
  isCurrent: () => boolean,
) {
  if (
    !("Notification" in window) ||
    !window.isSecureContext ||
    !navigator.locks
  )
    throw Error("This browser does not support notifications here.");
  // This function is called only by the explicit Settings control.
  const permission = await Notification.requestPermission();
  if (!isCurrent()) return;
  if (permission !== "granted")
    throw Error("Notifications are blocked. Check browser settings.");
  await navigator.locks.request("imt-alert-device", async () => {
    if (!isCurrent()) return;
    if (notificationPreference()?.owner === owner) return;
    const push =
      /Android/i.test(navigator.userAgent) &&
      matchMedia("(display-mode: standalone)").matches &&
      "PushManager" in window;
    if (!push) {
      preference({ owner, mode: "tab", since: Date.now() });
      return;
    }
    await retryRevocation();
    const response = await fetch("/api/alerts/config", {
      signal: AbortSignal.timeout(10000),
    });
    const config = await response.json();
    if (!response.ok || typeof config.pushKey !== "string")
      throw Error("Background push is unavailable.");
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active)
      throw Error("Notification service is still starting. Retry shortly.");
    await requireNotificationWorker(registration);
    const old = await registration.pushManager.getSubscription();
    if (old) await old.unsubscribe();
    const key = Uint8Array.from(
      atob(config.pushKey.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const capability = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const state: Installation = {
      owner,
      installationId: crypto.randomUUID(),
      capability,
      enabled: false,
    };
    try {
      // Persist fail-closed state before contacting the server, including ambiguous responses.
      await installation(state);
      localStorage.setItem("imt_alert_revocation", "pending");
      await alertRequest(
        "subscribe",
        {
          installationId: state.installationId,
          capability,
          subscription: subscription.toJSON(),
        },
        owner,
      );
      if (!isCurrent())
        throw Error("Your account changed. Notifications were not enabled.");
      await installation({ ...state, enabled: true });
      if (!isCurrent())
        throw Error("Your account changed. Notifications were not enabled.");
      preference({ owner, mode: "push", since: Date.now() });
      localStorage.removeItem("imt_alert_revocation");
    } catch (error) {
      await installation(state);
      await subscription.unsubscribe().catch(() => false);
      await retryRevocation().catch(() => {});
      throw error;
    }
  });
}

/** A cross-tab lock and short-lived ID set suppress duplicate ordinary notifications.
 * Reopen/resumption baselines are enforced by the caller, with no presence tracking. */
export async function notifyNewAlerts(
  owner: string,
  events: AlertEvent[],
  after: number,
) {
  if (
    !navigator.locks ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  await navigator.locks.request("imt-alert-notifications", async () => {
    const p = notificationPreference();
    if (p?.owner !== owner || p.mode !== "tab") return;
    const now = Date.now();
    let seen: { id: string; at: number }[];
    try {
      seen = JSON.parse(localStorage.getItem("imt_alert_seen") || "[]").filter(
        (v: { at: number }) => v.at > now - 120000,
      );
    } catch {
      return;
    }
    for (const event of [...events].reverse()) {
      const created = Date.parse(event.created_at);
      if (
        created <= Math.max(after, p.since) ||
        created > now ||
        now - created > 45000 ||
        seen.some((v) => v.id === event.id)
      )
        continue;
      seen.push({ id: event.id, at: now });
      // Persist before display: crashes may lose a notification, never history.
      try {
        localStorage.setItem(
          "imt_alert_seen",
          JSON.stringify(seen.slice(-120)),
        );
      } catch {
        return;
      }
      showBrowserNotification(
        event.id,
        `${event.symbol} price alert`,
        alertValue(event.value, event.unit),
        "/board/" + encodeURIComponent(event.symbol),
      );
    }
  });
}

function showBrowserNotification(
  id: string,
  title: string,
  body: string,
  path: string,
) {
  const notification = new Notification(title, {
    body,
    tag: "imt-alert-" + id,
  });
  notification.onclick = () => {
    notification.close();
    window.focus();
    location.assign(path);
  };
}

export async function sendTestNotification(owner: string) {
  if (
    !navigator.locks ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    throw Error("Notifications are blocked. Check browser settings.");
  await navigator.locks.request("imt-alert-device", async () => {
    const p = notificationPreference();
    if (p?.owner !== owner)
      throw Error("Turn notifications on to send a test.");
    if (p.mode === "tab") {
      showBrowserNotification(
        crypto.randomUUID(),
        "Test price alert",
        "This is a test notification.",
        "/settings",
      );
      return;
    }
    const stored = await installation();
    if (!stored?.enabled || stored.owner !== owner)
      throw Error("Push expired. Turn off and on to reconnect.");
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw Error("Notification service is unavailable.");
    await requireNotificationWorker(registration);
    const result = await alertRequest(
      "test",
      {
        installationId: stored.installationId,
        capability: stored.capability,
        requestId: crypto.randomUUID(),
      },
      owner,
    );
    if (result !== true) throw Error("Test notification was not confirmed.");
  });
}
