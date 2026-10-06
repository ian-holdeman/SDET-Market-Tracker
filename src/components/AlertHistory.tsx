import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Dialog } from "./Dialog";
import { useAuth } from "../context/AuthContext";
import { useAlerts } from "../context/AlertContext";
import { loadAlertHistory, markAlertRead, mutateAlertHistory } from "../services/alerts";
import { alertValue, comparisonLabel, type AlertEvent } from "../types/alerts";

const actionFeedback = "cursor-pointer rounded-lg transition-colors enabled:hover:bg-surface-800 enabled:active:bg-surface-700 focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-50";
const textAction = `${actionFeedback} underline-offset-4 enabled:hover:underline`;

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
  const { user } = useAuth();
  const { events, unread, error, loading, refresh } = useAlerts();
  const [older, setOlder] = useState<AlertEvent[]>([]),
    [pending, setPending] = useState(false),
    [failure, setFailure] = useState<string | null>(null),
    [confirmClear, setConfirmClear] = useState(false),
    [bulkPending, setBulkPending] = useState(false),
    [end, setEnd] = useState(false);
  const mounted = useRef(true), epoch = useRef(0), busy = useRef(false);
  const clearButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      epoch.current++;
    };
  }, [refresh]);
  const rows = [
    ...events,
    ...older.filter((row) => !events.some((e) => e.id === row.id)),
  ].filter((row) => Date.parse(row.created_at) > Date.now() - 30 * 86400000);
  // Refresh loaded older read states too, so another device's marks are reflected.
  useEffect(() => {
    if (!older.length) return;
    const current = epoch.current;
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
        if (!controller.signal.aborted && current === epoch.current) setOlder(next);
      })().catch(() => {
        if (!controller.signal.aborted && current === epoch.current)
          setFailure("Older alert read status could not be refreshed.");
      });
    else setOlder([]);
    return () => controller.abort();
  }, [events]);
  const read = async (row: AlertEvent, open = false) => {
    if (busy.current) return;
    const current = epoch.current;
    setFailure(null);
    try {
      await markAlertRead(row.id);
      if (!mounted.current || current !== epoch.current) return;
      setOlder((old) =>
        old.map((e) =>
          e.id === row.id ? { ...e, read_at: new Date().toISOString() } : e,
        ),
      );
      await refresh();
      if (open && mounted.current && current === epoch.current) {
        close();
        history.pushState(null, "", "/board/" + encodeURIComponent(row.symbol));
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    } catch (e) {
      if (mounted.current && current === epoch.current) setFailure((e as Error).message);
    }
  };
  const more = async () => {
    if (pending || busy.current) return;
    const current = epoch.current;
    setPending(true);
    setFailure(null);
    try {
      const next = await loadAlertHistory(
        AbortSignal.timeout(12000),
        rows.at(-1),
      );
      if (mounted.current && current === epoch.current) {
        setOlder((old) => [...old, ...next]);
        setEnd(next.length < 30);
      }
    } catch (e) {
      if (mounted.current && current === epoch.current) setFailure((e as Error).message);
    } finally {
      if (mounted.current && current === epoch.current) setPending(false);
    }
  };
  const bulk = async (operation: 'read' | 'clear') => {
    if (busy.current) return;
    busy.current = true;
    const current = ++epoch.current;
    setBulkPending(true);
    setPending(false);
    setFailure(null);
    try {
      await mutateAlertHistory(operation, AbortSignal.timeout(12000));
      // Confirmed changes outlive this dialog, but may never clear another account.
      const refreshed = refresh(operation === 'clear', user?.id);
      if (!mounted.current || current !== epoch.current) return;
      if (operation === 'clear') { setOlder([]); setEnd(false); }
      setConfirmClear(false);
      // Also reload older pages after mark-all. No mutation response can restore old rows.
      await refreshed;
    } catch (e) {
      if (mounted.current && current === epoch.current) { setFailure((e as Error).message); setConfirmClear(false); }
    } finally {
      busy.current = false;
      if (mounted.current && current === epoch.current) setBulkPending(false);
    }
  };
  return (
    <Dialog title="Alert history" subtitle="Past 30 days" close={close} compact>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button type="button" disabled={bulkPending || unread === 0} onClick={() => void bulk('read')} className={`${textAction} min-h-11 text-sm font-semibold text-info-ink-400`}>Mark all as read</button>
        <button ref={clearButton} type="button" disabled={bulkPending || !rows.length} onClick={e => { e.currentTarget.focus(); setConfirmClear(true); }} className={`${textAction} min-h-11 text-sm text-danger-ink-400`}>Clear history</button>
      </div>
      {confirmClear && <Dialog title="Clear alert history?" compact fallbackFocus={clearButton} close={() => setConfirmClear(false)}>
        <p className="text-sm text-ink-body">Clear all retained alerts and cancel their pending deliveries? Your rules and notification settings stay the same.</p>
        <div className="flex gap-3">
          <button type="button" disabled={bulkPending} onClick={() => setConfirmClear(false)} className={`${actionFeedback} min-h-11 px-3 text-ink-muted`}>Cancel</button>
          <button type="button" disabled={bulkPending} onClick={() => void bulk('clear')} className="min-h-11 cursor-pointer px-3 rounded-lg bg-danger-600 text-on-action transition-[filter] enabled:hover:brightness-110 enabled:active:brightness-90 focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-50">{bulkPending ? 'Clearing…' : 'Clear history'}</button>
        </div>
      </Dialog>}
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
          <button onClick={() => void refresh()} className={`${textAction} underline`}>
            Retry
          </button>
        </p>
      )}
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} data-testid="alert-event" className="py-3 space-y-1">
            <button
              onClick={() => void read(row, true)}
              disabled={bulkPending}
              className={`${actionFeedback} min-h-11 w-full text-left`}
            >
              <span className="flex justify-between gap-2 text-sm font-semibold text-ink-heading">
                <span className="min-w-0 break-words">{row.symbol}{!row.read_at && <span className="ml-2 text-xs text-info-ink-400">Unread</span>}</span>
                <span className="font-mono break-all text-right">
                  {alertValue(row.value, row.unit)}
                </span>
              </span>
              <span className="block text-xs text-ink-muted mt-1">
                {comparisonLabel(row.comparison)}{" "}
                {alertValue(row.target, row.unit)} · {row.session}
              </span>
            </button>
            {!row.read_at && (
              <button
                onClick={() => void read(row)}
                disabled={bulkPending}
                className={`${textAction} min-h-11 text-xs font-semibold text-info-ink-400`}
              >
                Mark as read
              </button>
            )}
          </li>
        ))}
      </ul>
      {!end && rows.length >= 30 && (
        <button
          disabled={pending || bulkPending}
          onClick={() => void more()}
          className={`${textAction} min-h-11 text-sm text-info-ink-400`}
        >
          {pending ? "Loading…" : "Older alerts"}
        </button>
      )}
      <button
        onClick={settings}
        className={`${textAction} min-h-11 text-sm text-info-ink-400 underline`}
      >
        Notification Settings
      </button>
    </Dialog>
  );
}
