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
  refresh: () => Promise<void>;
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
  const refreshRef = useRef(async () => {});
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    setScope(user?.id ?? null);
    setEvents([]);
    setUnread(0);
    setError(null);
    setLoading(!!user);
    let disposed = false,
      pending = false,
      rerun = false,
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
    const update = async () => {
      if (disposed) return;
      if (pending) {
        rerun = true;
        return;
      }
      pending = true;
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
        if (!disposed) {
          setEvents(rows);
          setUnread(count);
          setError(null);
          if (after && started - after <= 45000)
            await notifyNewAlerts(owner, rows, after);
        }
      } catch {
        if (!disposed) {
          setError("Alert history could not be refreshed.");
          setEvents((rows) =>
            rows.filter(
              (row) => Date.parse(row.created_at) > Date.now() - 30 * 86400000,
            ),
          );
        }
      } finally {
        lastPoll = started;
        pending = false;
        if (!disposed) {
          setLoading(false);
          if (rerun) {
            rerun = false;
            void update();
          }
        }
      }
    };
    refreshRef.current = update;
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
