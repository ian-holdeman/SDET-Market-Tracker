import { useEffect, useState, useCallback, useRef } from "react";
import {
  validateFeed,
  orderRuns,
  type TelemetryFeed,
} from "../telemetry/contract";
import { recentResults, runKey } from "../telemetry/presentation";
// Memory only: validated evidence survives navigation, never publication or a browser restart.
let savedFeed: TelemetryFeed | null = null;
let savedHeadKeys = new Set<string>();
const requests = new Map<string, Promise<TelemetryFeed>>();
export async function readHistory(
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const key = cursor || "latest";
  let pending = requests.get(key);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(
        "/api/test-history" +
          (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
        { signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok) throw Error("History unavailable");
      return validateFeed(await response.json());
    })().finally(() => requests.delete(key));
    requests.set(key, pending);
  }
  // A departing view must not cancel the request another view is sharing.
  const result = await pending;
  signal?.throwIfAborted();
  return result;
}

export function mergeHistory(
  current: TelemetryFeed,
  page: TelemetryFeed,
): TelemetryFeed {
  const runs = new Map(current.runs.map((r) => [runKey(r), r]));
  for (const run of page.runs)
    if (!runs.has(runKey(run))) runs.set(runKey(run), run);
  return {
    ...current,
    runs: orderRuns([...runs.values()]),
    nextCursor: page.nextCursor,
    historyLimited: page.historyLimited,
    stale: current.stale || page.stale,
  };
}
export function useTestHistory(findRecent = false) {
  const [feed, setFeed] = useState<TelemetryFeed | null>(savedFeed);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const current = useRef<TelemetryFeed | null>(savedFeed);
  const more = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const publish = (value: TelemetryFeed) => {
    savedFeed = value;
    current.current = value;
    setFeed(value);
  };
  useEffect(() => {
    const poll = setInterval(
      () => {
        if (!document.hidden && !busy.current && !more.current) refresh();
      },
      feed?.refreshing ? 2000 : 15000,
    );
    const resume = () => {
      if (!document.hidden && !busy.current && !more.current) refresh();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [refresh, feed?.refreshing]);
  useEffect(() => {
    busy.current = true;
    const controller = new AbortController();
    let stopped = false;
    more.current?.abort();
    more.current = null;
    setMoreLoading(false);
    setMoreError(null);
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 60000);
    void (async () => {
      try {
        let value = await readHistory(null, controller.signal);
        if (stopped) return;
        // A successfully revalidated head replaces its previous window, including removals.
        if (!value.refreshing) {
          const fresh = new Map(value.runs.map((run) => [runKey(run), run]));
          if (value.nextCursor && current.current)
            for (const run of current.current.runs) {
              if (!savedHeadKeys.has(runKey(run)) && !fresh.has(runKey(run)))
                fresh.set(runKey(run), run);
            }
          savedHeadKeys = new Set(value.runs.map(runKey));
          value = { ...value, runs: orderRuns([...fresh.values()]) };
        }
        publish(value);
        setError(value.stale ? "Refresh failed. Showing saved results." : null);
        const seen = new Set<string>();
        // Keep automatic discovery bounded; the history dialog can continue past this window.
        for (
          let page = 1;
          !value.refreshing &&
          findRecent &&
          revision === 0 &&
          page < 5 &&
          recentResults(value.runs).length < 5 &&
          value.nextCursor;
          page++
        ) {
          if (seen.has(value.nextCursor)) throw Error();
          seen.add(value.nextCursor);
          const next = await readHistory(value.nextCursor, controller.signal);
          if (stopped) return;
          value = mergeHistory(value, next);
          publish(value);
          if (value.stale) setError("Refresh failed. Showing saved results.");
        }
      } catch {
        if (!stopped)
          setError(
            current.current
              ? "Refresh failed. Showing saved results."
              : "Couldn’t load test results. Please retry.",
          );
      } finally {
        clearTimeout(timer);
        if (!stopped) {
          busy.current = false;
          setLoading(false);
        }
      }
    })();
    return () => {
      stopped = true;
      controller.abort();
      more.current?.abort();
      clearTimeout(timer);
    };
  }, [revision, findRecent]);
  const loadMore = async () => {
    const previous = current.current;
    if (!previous?.nextCursor || more.current || loading) return;
    const controller = new AbortController();
    more.current = controller;
    setMoreLoading(true);
    setMoreError(null);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const next = await readHistory(previous.nextCursor, controller.signal);
      if (next.nextCursor === previous.nextCursor) throw Error();
      if (more.current === controller && !controller.signal.aborted) {
        publish(mergeHistory(previous, next));
        if (next.stale) setError("Refresh failed. Showing saved results.");
      }
    } catch {
      if (more.current === controller)
        setMoreError("Couldn’t load older runs. Retry below.");
    } finally {
      clearTimeout(timer);
      if (more.current === controller) {
        more.current = null;
        setMoreLoading(false);
      }
    }
  };
  return { feed, loading, error, refresh, loadMore, moreLoading, moreError };
}
