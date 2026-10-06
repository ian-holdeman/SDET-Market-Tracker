import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { loadAlertHistory, unreadAlertCount } from "../services/alerts";
import {
  disableAlertNotifications,
  notificationPreference,
  notifyNewAlerts,
  retryNotificationRevocation,
} from "../services/alertNotifications";
import type { AlertEvent } from "../types/alerts";

const Context = createContext<{
  events: AlertEvent[];
  unread: number;
  error: string | null;
  loading: boolean;
  refresh: (cleared?: boolean, expectedOwner?: string) => Promise<void>;
}>({
  events: [],
  unread: 0,
  error: null,
  loading: false,
  refresh: async () => {},
});
export const useAlerts = () => useContext(Context);
export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<AlertEvent[]>([]),
    [unread, setUnread] = useState(0),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<string | null>(null);
  const refreshRef = useRef(async (_cleared = false, _expectedOwner?: string) => {});
  const refresh = useCallback((cleared = false, expectedOwner?: string) => refreshRef.current(cleared, expectedOwner), []);
  useEffect(() => {
    setScope(user?.id ?? null);
    setEvents([]);
    setUnread(0);
    setError(null);
    setLoading(!!user);
    let disposed = false,
      pending = false,
      rerun = false,
      generation = 0,
      lastPoll = 0;
    const controller = new AbortController();
    if (authLoading) return () => controller.abort();
    const p = notificationPreference();
    if (p && p.owner !== user?.id)
      void disableAlertNotifications().catch(() => {});
    void retryNotificationRevocation().catch(() => {});
    if (!user) {
      refreshRef.current = async () => {};
      return () => controller.abort();
    }
    const owner = user.id;
    const update = async (force = false) => {
      if (disposed) return;
      if (pending && !force) {
        rerun = true;
        return;
      }
      pending = true;
      const current = ++generation;
      const started = Date.now(),
        after = lastPoll;
      try {
        const signal = AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(12000),
        ]);
        const [rows, count] = await Promise.all([
          loadAlertHistory(signal),
          unreadAlertCount(signal),
        ]);
        if (!disposed && current === generation) {
          setEvents(rows);
          setUnread(count);
          setError(null);
          if (after && started - after <= 45000)
            await notifyNewAlerts(owner, rows, after, () => !disposed && current === generation);
        }
      } catch {
        if (!disposed && current === generation) {
          setError("Alert history could not be refreshed.");
          setEvents((rows) =>
            rows.filter(
              (row) => Date.parse(row.created_at) > Date.now() - 30 * 86400000,
            ),
          );
        }
      } finally {
        if (!disposed && current === generation) {
          lastPoll = started;
          pending = false;
          setLoading(false);
          if (rerun) {
            rerun = false;
            void update();
          }
        }
      }
    };
    // Confirmed mutations supersede any older poll response still in flight.
    refreshRef.current = (cleared = false, expectedOwner?: string) => {
      if (expectedOwner && expectedOwner !== owner) return Promise.resolve();
      if (cleared) { setEvents([]); setUnread(0); }
      return update(true);
    };
    void update();
    const timer = setInterval(() => void update(), 15000);
    const resumed = () => {
      lastPoll = 0;
      void update();
    };
    window.addEventListener("pageshow", resumed);
    window.addEventListener("online", resumed);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("pageshow", resumed);
      window.removeEventListener("online", resumed);
    };
  }, [user?.id, authLoading]);
  return (
    <Context.Provider
      value={{
        events: scope === user?.id ? events : [],
        unread: scope === user?.id ? unread : 0,
        error: scope === user?.id ? error : null,
        loading: authLoading || loading,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
