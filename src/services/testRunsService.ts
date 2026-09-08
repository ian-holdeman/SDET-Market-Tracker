import { useEffect, useState, useCallback } from "react";
import { validateFeed, type TelemetryFeed } from "../telemetry/contract";
export function useTestHistory() {
  const [feed, setFeed] = useState<TelemetryFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let stopped = false;
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 30000);
    fetch("/api/test-history", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const value = validateFeed(await response.json());
        if (!stopped) {
          setFeed(value);
          setError(
            value.stale
              ? "History refresh failed. Showing previously retrieved results."
              : null,
          );
        }
      })
      .catch(() => {
        if (!stopped)
          setError(
            "Test history could not be retrieved. Any displayed results are from the previous retrieval.",
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  return { feed, loading, error, refresh };
}
