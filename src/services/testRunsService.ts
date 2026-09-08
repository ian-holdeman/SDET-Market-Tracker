import { useEffect, useState, useCallback, useRef } from "react";
import {
  validateFeed,
  orderRuns,
  type TelemetryFeed,
} from "../telemetry/contract";
import { recentResults, runKey } from "../telemetry/presentation";
export async function readHistory(
  cursor?: string | null,
  signal?: AbortSignal,
) {
  const response = await fetch(
    "/api/test-history" +
      (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
    { signal },
  );
  if (!response.ok) throw Error("History unavailable");
  return validateFeed(await response.json());
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
  const [feed, setFeed] = useState<TelemetryFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const current = useRef<TelemetryFeed | null>(null);
  const more = useRef<AbortController | null>(null);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const publish = (value: TelemetryFeed) => {
    current.current = value;
    setFeed(value);
  };
  useEffect(() => {
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
        publish(value);
        setError(value.stale ? "Refresh failed. Showing saved results." : null);
        const seen = new Set<string>();
        // Keep automatic discovery bounded; the history dialog can continue past this window.
        for (
          let page = 1;
          findRecent &&
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
        if (!stopped) setLoading(false);
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
