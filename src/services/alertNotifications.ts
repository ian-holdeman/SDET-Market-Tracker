import type { AlertEvent } from "../types/alerts";
import { alertValue } from "../types/alerts";
import { AlertRequestError, alertRequest } from "./alerts";

const KEY = "imt_alert_notifications";

async function bounded<T>(operation: Promise<T>, message: string, ms = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error(message)), ms);
    })]);
  } finally { clearTimeout(timer!); }
}

/** Android can return from OS settings before the browser's prompt promise settles. */
function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Notification.permission === "granted") return Promise.resolve("granted");
  return new Promise((resolve, reject) => {
    let settled = false, permissionStatus: PermissionStatus | undefined;
    const finish = (permission?: NotificationPermission, error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      permissionStatus?.removeEventListener("change", check);
      if (error) reject(error); else resolve(permission!);
    };
    const check = () => {
      if (Notification.permission === "granted") finish("granted");
    };
    const timer = setTimeout(() => {
      if (Notification.permission === "granted") finish("granted");
      else finish(undefined, Error("Permission request timed out. Try again."));
    }, 30000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    // Invoke before any await to preserve the explicit click's user activation.
    try { void Notification.requestPermission().then(value => finish(value), error => finish(undefined, error)); }
    catch (error) { finish(undefined, error); }
    void navigator.permissions?.query({ name: "notifications" }).then(status => {
      if (settled) return;
      permissionStatus = status;
      status.addEventListener("change", check);
      check();
    }).catch(() => { /* Focus/visibility and the deadline remain available. */ });
  });
}
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
        const registration: ServiceWorkerRegistration | undefined = navigator.serviceWorker
          ? await bounded(navigator.serviceWorker.getRegistration(), "Notification service unavailable.").catch(() => undefined)
          : undefined;
        const subscription = registration
          ? await bounded<PushSubscription | null>(registration.pushManager.getSubscription(), "Push connection timed out.").catch(() => null)
          : null;
        if (subscription) await bounded(subscription.unsubscribe(), "Push cleanup timed out.").catch(() => false);
        const notifications = registration
          ? await bounded<Notification[]>(registration.getNotifications(), "Notification cleanup timed out.").catch(() => [])
          : [];
        for (const notification of notifications)
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
  const permission = await requestNotificationPermission();
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
    await connectPush(owner, isCurrent);
  });
}

/** Caller holds the device lock. Late browser results never register or enable delivery. */
async function connectPush(owner: string, isCurrent: () => boolean) {
  await retryRevocation();
  const response = await fetch("/api/alerts/config", {
    signal: AbortSignal.timeout(10000),
  });
  const config = await response.json();
  if (!response.ok || typeof config.pushKey !== "string")
    throw Error("Background push is unavailable.");
  const registration = await bounded(navigator.serviceWorker.getRegistration(), "Notification service is unavailable.");
  if (!registration?.active)
    throw Error("Notification service is still starting. Retry shortly.");
  await requireNotificationWorker(registration);
  if (!isCurrent()) throw Error("Your account changed. Notifications were not enabled.");
  const old = await bounded(registration.pushManager.getSubscription(), "Push connection timed out. Try again.");
  if (old) await bounded(old.unsubscribe(), "Push connection timed out. Try again.");
  const key = Uint8Array.from(
    atob(config.pushKey.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const subscription = await bounded(registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  }), "Push connection timed out. Try again.");
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
    if (!isCurrent()) throw Error("Your account changed. Notifications were not enabled.");
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
    await bounded(subscription.unsubscribe(), "Push cleanup timed out.").catch(() => false);
    await retryRevocation().catch(() => {});
    throw error;
  }
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
    icon: "/icons/app-192.png",
    badge: "/icons/notification-badge.png",
  });
  notification.onclick = () => {
    notification.close();
    window.focus();
    location.assign(path);
  };
}

export async function sendTestNotification(owner: string, isCurrent: () => boolean = () => true) {
  if (
    !navigator.locks ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    throw Error("Notifications are blocked. Check browser settings.");
  await navigator.locks.request("imt-alert-device", async () => {
    if (!isCurrent()) return;
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
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const stored = await installation();
        if (!stored?.enabled || stored.owner !== owner)
          throw new AlertRequestError("Push connection expired.", "installation_unavailable");
        const registration = await bounded(navigator.serviceWorker.getRegistration(), "Notification service is unavailable.");
        if (!registration) throw Error("Notification service is unavailable.");
        await requireNotificationWorker(registration);
        if (!await bounded(registration.pushManager.getSubscription(), "Push connection timed out. Try again."))
          throw new AlertRequestError("Push connection expired.", "installation_unavailable");
        if (!isCurrent()) return;
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
        return;
      } catch (error) {
        // Only a definite expired/revoked installation is safe to retry. Network
        // failures may have delivered and must never produce a duplicate test.
        if (!(error instanceof AlertRequestError) || error.code !== "installation_unavailable") throw error;
        preference(null);
        const stored = await installation();
        if (stored) {
          await installation({ ...stored, enabled: false });
          localStorage.setItem("imt_alert_revocation", "pending");
        }
        if (attempt || !isCurrent())
          throw Error("Push connection expired. Turn notifications on to reconnect.");
        await connectPush(owner, isCurrent);
      }
    }
  });
}
