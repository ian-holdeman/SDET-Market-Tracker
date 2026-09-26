import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Dialog } from "./Dialog";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { loadAlertHistory, markAlertRead } from "../services/alerts";
import { alertValue, comparisonLabel, type AlertEvent } from "../types/alerts";

export function AlertHistoryButton({ settings }: { settings: () => void }) {
  const { user } = useAuth(),
    { unread } = useAlerts();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [user?.id]);
  if (!user) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Alert history"
        title="Alert history"
        onClick={(e) => {
          e.currentTarget.focus();
          setOpen(true);
        }}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-800 hover:text-ink-strong focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Bell aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} />
        {unread > 0 && (
          <span
            role="img"
            aria-label="Unread alerts"
            className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-info-500"
          />
        )}
      </button>
      {open && (
        <AlertHistory
          key={user.id}
          close={() => setOpen(false)}
          settings={() => {
            setOpen(false);
            settings();
          }}
        />
      )}
    </>
  );
}
function AlertHistory({
  close,
  settings,
}: {
  close: () => void;
  settings: () => void;
}) {
  const { events, error, loading, refresh } = useAlerts();
  const [older, setOlder] = useState<AlertEvent[]>([]),
    [pending, setPending] = useState(false),
    [failure, setFailure] = useState<string | null>(null),
    [end, setEnd] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);
  const rows = [
    ...events,
    ...older.filter((row) => !events.some((e) => e.id === row.id)),
  ].filter((row) => Date.parse(row.created_at) > Date.now() - 30 * 86400000);
  // Refresh loaded older read states too, so another device's marks are reflected.
  useEffect(() => {
    if (!older.length) return;
    const controller = new AbortController();
    const first = events.at(-1);
    if (first)
      void (async () => {
        const next: AlertEvent[] = [];
        let cursor = first;
        for (let offset = 0; offset < older.length; offset += 30) {
          const page = await loadAlertHistory(
            AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
            cursor,
          );
          next.push(...page);
          if (page.length < 30) break;
          cursor = page[page.length - 1];
        }
        if (!controller.signal.aborted) setOlder(next);
      })().catch(() => {
        if (!controller.signal.aborted)
          setFailure("Older alert read status could not be refreshed.");
      });
    return () => controller.abort();
  }, [events]);
  const read = async (row: AlertEvent, open = false) => {
    setFailure(null);
    try {
      await markAlertRead(row.id);
      if (!mounted.current) return;
      setOlder((old) =>
        old.map((e) =>
          e.id === row.id ? { ...e, read_at: new Date().toISOString() } : e,
        ),
      );
      await refresh();
      if (open && mounted.current) {
        close();
        history.pushState(null, "", "/board/" + encodeURIComponent(row.symbol));
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch (e) {
      if (mounted.current) setFailure((e as Error).message);
    }
  };
  const more = async () => {
    setPending(true);
    setFailure(null);
    try {
      const next = await loadAlertHistory(
        AbortSignal.timeout(12000),
        rows.at(-1),
      );
      if (mounted.current) {
        setOlder((old) => [...old, ...next]);
        setEnd(next.length < 30);
      }
    } catch (e) {
      if (mounted.current) setFailure((e as Error).message);
    } finally {
      if (mounted.current) setPending(false);
    }
  };
  return (
    <Dialog title="Alert history" subtitle="Past 30 days" close={close} compact>
      {loading && (
        <p role="status" className="text-sm text-ink-muted">
          Loading history…
        </p>
      )}
      {!loading && !rows.length && !error && (
        <p className="text-sm text-ink-muted">No price alerts yet.</p>
      )}
      {(failure || error) && (
        <p role="alert" className="text-sm text-danger-ink-400">
          {failure || error}{" "}
          <button onClick={() => void refresh()} className="underline">
            Retry
          </button>
        </p>
      )}
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} data-testid="alert-event" className="py-3 space-y-1">
            <button
              onClick={() => void read(row, true)}
              className="w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span className="flex justify-between gap-2 text-sm font-semibold text-ink-heading">
                <span>{row.symbol}</span>
                <span className="font-mono">
                  {alertValue(row.value, row.unit)}
                </span>
              </span>
              <span className="block text-xs text-ink-muted mt-1">
                {comparisonLabel(row.comparison)}{" "}
                {alertValue(row.target, row.unit)} · {row.session}
              </span>
              <time
                dateTime={row.observed_at}
                className="block text-xs text-ink-subtle mt-1"
              >
                {new Date(row.observed_at).toLocaleString()}
              </time>
            </button>
            {!row.read_at && (
              <button
                onClick={() => void read(row)}
                className="min-h-11 rounded-lg text-xs font-semibold text-info-ink-400 focus-visible:outline-2 focus-visible:outline-focus"
              >
                Mark as read
              </button>
            )}
          </li>
        ))}
      </ul>
      {!end && rows.length >= 30 && (
        <button
          disabled={pending}
          onClick={() => void more()}
          className="min-h-11 text-sm text-info-ink-400"
        >
          {pending ? "Loading…" : "Older alerts"}
        </button>
      )}
      <button
        onClick={settings}
        className="min-h-11 text-sm text-info-ink-400 underline underline-offset-4"
      >
        Notification Settings
      </button>
    </Dialog>
  );
}
