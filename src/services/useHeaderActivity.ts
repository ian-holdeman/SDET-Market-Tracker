import { useEffect, useState } from "react";
import { tradingSession } from "../utils/tradingSession";
export function useHeaderActivity() {
  const [session, setSession] = useState(() => tradingSession());
  const [testsActive, setTestsActive] = useState(false);
  useEffect(() => {
    let disposed = false,
      pending = false,
      controller: AbortController | undefined,
      expires = 0;
    const tick = () => {
      setSession(tradingSession());
      if (Date.now() >= expires) setTestsActive(false);
    };
    const check = async () => {
      tick();
      if (document.hidden || pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 12000);
      try {
        const r = await fetch("/api/test-activity", {
          signal: controller.signal,
        });
        if (!r.ok) throw Error();
        const b = await r.json(),
          checked = Date.parse(b.checkedAt);
        if (
          typeof b.active !== "boolean" ||
          !Number.isFinite(checked) ||
          checked > Date.now() + 5000 ||
          Date.now() - checked > 60000
        )
          throw Error();
        if (!disposed) {
          expires = checked + 60000;
          setTestsActive(b.active);
        }
      } catch {
        if (!disposed) setTestsActive(false);
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    };
    void check();
    const poll = setInterval(() => void check(), 15000),
      timer = setInterval(tick, 1000);
    const resume = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(poll);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return { session, testsActive };
}
