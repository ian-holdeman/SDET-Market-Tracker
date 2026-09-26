import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { Dialog } from "./Dialog";
import { useAuth } from "../context/AuthContext";
import { getSupabase } from "../lib/supabase";
import {
  deleteAlertRule,
  loadAlertRules,
  saveAlertRule,
} from "../services/alerts";
import {
  alertValue,
  comparisonLabel,
  type AlertComparison,
  type AlertRule,
} from "../types/alerts";
import type { BoardStock } from "../types";
import { hasExcessAlertDecimals, parseAlertTarget } from "../utils/alertTarget";

const secondary =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-sm text-ink-muted hover:bg-surface-800 focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50";
const primary =
  "min-h-11 rounded-xl bg-info-600 px-4 py-2 text-sm font-semibold text-on-action hover:bg-info-500 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-focus";
export function PriceAlertButton({ stock }: { stock: BoardStock }) {
  const { user, openAuthModal } = useAuth();
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(false);
  useEffect(() => {
    setOpen(false);
    setActive(false);
    if (!user) return;
    const controller = new AbortController();
    void loadAlertRules(
      stock.symbol,
      AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    )
      .then((rows) => {
        if (!controller.signal.aborted) setActive(rows.length > 0);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [user?.id, stock.symbol]);
  return (
    <>
      <button
        type="button"
        aria-label={`Price alerts for ${stock.symbol}`}
        title={`Price alerts for ${stock.symbol}`}
        onClick={(event) => {
          event.stopPropagation();
          event.currentTarget.focus();
          if (!user)
            openAuthModal("login", "Sign in to create private price alerts.");
          else setOpen(true);
        }}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface-800 focus-visible:outline-2 focus-visible:outline-focus ${active ? "text-info-ink-400" : "text-ink-muted"}`}
      >
        <Bell
          aria-hidden="true"
          className="h-[18px] w-[18px]"
          strokeWidth={2.5}
        />
      </button>
      {open && user && (
        <PriceAlertModal
          key={user.id + stock.symbol}
          stock={stock}
          owner={user.id}
          close={() => setOpen(false)}
          changed={(count) => setActive(count > 0)}
        />
      )}
    </>
  );
}
function PriceAlertModal({
  stock,
  owner,
  close,
  changed,
}: {
  stock: BoardStock;
  owner: string;
  close: () => void;
  changed: (count: number) => void;
}) {
  const [rules, setRules] = useState<AlertRule[]>([]),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [comparison, setComparison] = useState<AlertComparison>("above"),
    [target, setTarget] = useState("");
  const [editing, setEditing] = useState<AlertRule | null>(null),
    [coverage, setCoverage] = useState<string | null>(null);
  const createId = useRef(crypto.randomUUID()),
    mounted = useRef(true),
    busy = useRef(false);
  const unit = stock.assetType === "Bond Yield" ? "%" : stock.currency;
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await loadAlertRules(
        stock.symbol,
        AbortSignal.timeout(12000),
      );
      if (!mounted.current) return;
      setRules(rows);
      changed(rows.length);
      const { data } = await getSupabase()
        .rpc("alert_coverage", { asset_symbol: stock.symbol })
        .abortSignal(AbortSignal.timeout(12000));
      if (
        mounted.current &&
        data?.checkedAt &&
        (!data.available || Date.now() - Date.parse(data.checkedAt) > 600000)
      )
        setCoverage("Alert data unavailable");
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [stock.symbol]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const reset = () => {
    setEditing(null);
    setTarget("");
    setComparison("above");
    createId.current = crypto.randomUUID();
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    try {
      parseAlertTarget(target);
    } catch (error) {
      setError((error as Error).message);
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const row = await saveAlertRule(owner, {
        id: editing?.id ?? createId.current,
        symbol: stock.symbol,
        comparison,
        target,
        revision: editing?.revision ?? null,
      });
      if (!mounted.current) return;
      const next = [...rules.filter((r) => r.id !== row.id), row];
      setRules(next);
      changed(next.length);
      reset();
      setNotice("Alert saved.");
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const remove = async (rule: AlertRule) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await deleteAlertRule(rule.id);
      if (!mounted.current) return;
      const next = rules.filter((r) => r.id !== rule.id);
      setRules(next);
      changed(next.length);
      if (editing?.id === rule.id) reset();
      setNotice("Alert deleted.");
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const orderedRules = [...rules].sort(
    (a, b) => b.target - a.target || a.id.localeCompare(b.id),
  );
  const quoteUsable =
    stock.dataStatus === "available" &&
    Number.isFinite(stock.price) &&
    unit &&
    stock.asOf &&
    Date.now() - Date.parse(stock.asOf) <= 900000;
  return (
    <Dialog
      title="Price alert"
      subtitle={`${stock.symbol} · ${stock.name}`}
      compact
      close={close}
    >
      <p className="text-xs text-ink-muted">
        {quoteUsable
          ? `Regular quote · ${alertValue(stock.price!, unit)}`
          : "Quote unavailable"}
        {coverage && (
          <span className="ml-2 text-warning-ink-400">{coverage}</span>
        )}
      </p>
      {loading ? (
        <p role="status" className="text-sm text-ink-muted">
          Loading alerts…
        </p>
      ) : (
        <>
          {(editing || rules.length < 4) && (
            <form onSubmit={save} className="space-y-4">
              <fieldset disabled={pending} className="flex gap-2">
                <legend className="sr-only">Comparison</legend>
                {(["above", "below"] as const).map((value) => (
                  <label key={value} className="relative flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="alert-comparison"
                      className="peer absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      checked={comparison === value}
                      onChange={() => setComparison(value)}
                    />
                    <span className="pointer-events-none block rounded-xl border border-line-strong px-3 py-3 text-center text-sm font-semibold text-ink-muted transition-[background-color,color,border-color,box-shadow,transform] duration-150 peer-hover:bg-surface-800 peer-checked:border-info-500/70 peer-checked:bg-info-600/35 peer-checked:text-ink-strong peer-checked:shadow-sm peer-checked:shadow-info-600/10 peer-checked:peer-hover:bg-info-600/45 peer-active:scale-[0.97] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus motion-reduce:transition-none motion-reduce:peer-active:scale-100">
                      {comparisonLabel(value)}
                    </span>
                  </label>
                ))}
              </fieldset>
              <div>
                <label
                  htmlFor="alert-target"
                  className="block text-sm font-semibold text-ink-strong mb-2"
                >
                  Target{unit ? ` (${unit})` : ""}
                </label>
                <input
                  id="alert-target"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  maxLength={64}
                  value={target}
                  disabled={pending}
                  onChange={(e) => {
                    const next = e.target.value;
                    const validDraft = /^[+-]?\d*(?:\.\d{0,2})?$/.test(next);
                    // Older higher-precision rules can still be repaired by deletion.
                    const repairingLegacy = hasExcessAlertDecimals(target) &&
                      next.length < target.length && /^[+-]?\d*(?:\.\d*)?$/.test(next);
                    if (validDraft || repairingLegacy) setTarget(next);
                  }}
                  className="w-full rounded-xl border border-line-strong bg-surface-900 p-3 font-mono text-xl text-ink-heading focus:outline-2 focus:outline-focus"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className={`${primary} flex-1`}
                >
                  {pending
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Create alert"}
                </button>
                {editing && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={reset}
                    className={secondary}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
          )}
          {rules.length > 0 && (
            <ul aria-label="Existing alerts" className="divide-y divide-line">
              {orderedRules.map((rule) => (
                <li
                  key={rule.id}
                  data-testid="alert-rule"
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="min-w-0 break-words text-sm text-ink-body">
                    {comparisonLabel(rule.comparison)}{" "}
                    <strong className="font-mono">
                      {alertValue(rule.target, rule.unit)}
                    </strong>
                  </span>
                  <div className="flex shrink-0">
                    <button
                      aria-label={`Edit ${comparisonLabel(rule.comparison)} ${alertValue(rule.target, rule.unit)}`}
                      className={secondary}
                      disabled={pending}
                      onClick={() => {
                        setEditing(rule);
                        setTarget(String(rule.target));
                        setComparison(rule.comparison);
                        setError(null);
                        setNotice(null);
                      }}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Delete ${comparisonLabel(rule.comparison)} ${alertValue(rule.target, rule.unit)}`}
                      className={secondary}
                      disabled={pending}
                      onClick={() => void remove(rule)}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="text-sm text-danger-ink-400">
          {error}
          {!rules.length && !loading && (
            <button className={secondary} onClick={() => void load()}>
              Reload alerts
            </button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="sr-only">
          {notice}
        </p>
      )}
    </Dialog>
  );
}
