import React, { useEffect, useRef, useState } from "react";
import {
  disableAlertNotifications,
  enableAlertNotifications,
  notificationPreference,
  sendTestNotification,
} from "../services/alertNotifications";
export function NotificationSettings({ owner }: { owner: string }) {
  const [enabled, setEnabled] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [mode, setMode] = useState("");
  const [testing, setTesting] = useState(false),
    [notice, setNotice] = useState("");
  const mounted = useRef(true),
    busy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const update = () => {
      const p = notificationPreference();
      setEnabled(p?.owner === owner);
      setMode(p?.mode ?? "");
      if (
        p?.owner === owner &&
        "Notification" in window &&
        Notification.permission !== "granted"
      )
        setError("Permission revoked. Check browser settings.");
      if (p?.owner === owner && p.mode === "push" && navigator.serviceWorker)
        void navigator.serviceWorker
          .getRegistration()
          .then(async (registration) => {
            const subscription =
              await registration?.pushManager.getSubscription();
            if (mounted.current && !subscription)
              setError("Push expired. Turn off and on to reconnect.");
          })
          .catch(() => {
            if (mounted.current)
              setError("Background delivery could not be verified.");
          });
    };
    update();
    window.addEventListener("storage", update);
    window.addEventListener("alert-preference", update);
    window.addEventListener("focus", update);
    return () => {
      mounted.current = false;
      window.removeEventListener("storage", update);
      window.removeEventListener("alert-preference", update);
      window.removeEventListener("focus", update);
    };
  }, [owner]);
  const toggle = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      if (enabled) await disableAlertNotifications();
      else await enableAlertNotifications(owner, () => mounted.current);
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const testNotification = async () => {
    if (busy.current) return;
    busy.current = true;
    setTesting(true);
    setError(null);
    setNotice("");
    try {
      await sendTestNotification(owner);
      if (mounted.current) setNotice("Test notification requested.");
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      busy.current = false;
      if (mounted.current) setTesting(false);
    }
  };
  return (
    <div className="settings-row !flex-row !items-start">
      <div>
        <h2 className="settings-label">Notifications</h2>
        <p className="settings-description">
          {enabled
            ? mode === "push"
              ? "Background push"
              : "Open tabs"
            : "History only"}
        </p>
        <button
          type="button"
          disabled={!enabled || pending || testing}
          onClick={() => void testNotification()}
          className="mt-2 min-h-11 rounded-lg border border-line-strong px-3 text-xs font-medium text-ink-muted transition-[background-color,border-color,transform] hover:border-info-500 hover:bg-info-600/10 hover:text-ink-strong active:scale-[0.97] active:bg-info-600/20 focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-default disabled:text-ink-subtle disabled:hover:border-line-strong disabled:hover:bg-transparent disabled:active:scale-100 disabled:active:bg-transparent motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          {testing ? "Sending…" : "Send test notification"}
        </button>
        <span role="status" className="sr-only">
          {notice}
        </span>
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger-ink-400">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Browser notifications"
        disabled={pending || testing}
        onClick={() => void toggle()}
        className="shrink-0 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-xs font-semibold text-ink-strong focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
      >
        <span aria-hidden="true">{enabled ? "On" : "Off"}</span>
        <span
          aria-hidden="true"
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors motion-reduce:transition-none ${enabled ? "border-info-500 bg-info-600" : "border-line-strong bg-surface-700"}`}
        >
          <span
            className={`h-4 w-4 rounded-full bg-on-action shadow-sm transition-transform motion-reduce:transition-none ${enabled ? "translate-x-[22px]" : "translate-x-1"}`}
          />
        </span>
      </button>
    </div>
  );
}
