import type { Page } from "@playwright/test";
import type { AlertEvent, AlertRule } from "../../types/alerts";
export function alertState() {
  return {
    rules: [] as AlertRule[],
    events: [] as AlertEvent[],
    reads: [] as string[],
    failSave: false,
    failDelete: false,
    failRead: false,
    failBulk: false,
  };
}
export async function mockAlerts(page: Page, state = alertState()) {
  await page.route("**/api/alerts/**", async (route) => {
    const request = route.request();
    const action = new URL(request.url()).pathname;
    const method = request.method();
    if (action === "/api/alerts/config" && method === "GET")
      return route.fulfill({ json: { enabled: true, pushKey: null } });
    if (method !== "POST" || !["/api/alerts/rules", "/api/alerts/subscribe", "/api/alerts/revoke", "/api/alerts/test", "/api/alerts/status"].includes(action))
      throw new Error(`Unexpected alert request: ${method} ${action}`);
    if (action === "/api/alerts/rules") {
      if (state.failSave)
        return route.fulfill({
          status: 503,
          json: { error: "Saving is temporarily unavailable." },
        });
      const body = request.postDataJSON();
      const old = state.rules.find((r) => r.id === body.id);
      const row: AlertRule = {
        id: body.id,
        symbol: body.symbol,
        comparison: body.comparison,
        target: Number(body.target),
        unit: body.symbol === "^TNX" ? "%" : "USD",
        revision: old
          ? old.revision +
            (old.target !== Number(body.target) ||
            old.comparison !== body.comparison
              ? 1
              : 0)
          : 1,
      };
      state.rules = [...state.rules.filter((r) => r.id !== row.id), row];
      return route.fulfill({ json: { data: row } });
    }
    return route.fulfill({ json: { data: true } });
  });
  await page.route(
    /\/rest\/v1\/(?:alert_rules|alert_events|rpc\/(?:read_alert_event|mutate_alert_history|alert_coverage))\b/,
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname.endsWith("/alert_coverage"))
        return route.fulfill({ json: null });
      if (url.pathname.endsWith('/mutate_alert_history')) {
        if (request.method() !== 'POST') throw Error('Unexpected history mutation method');
        if (state.failBulk) return route.fulfill({ status: 403, json: { message: 'unavailable' } });
        const operation = request.postDataJSON().operation;
        if (operation === 'read') state.events = state.events.map(e => ({ ...e, read_at: e.read_at ?? new Date().toISOString() }));
        else if (operation === 'clear') state.events = [];
        else throw Error('Unexpected history operation');
        return route.fulfill({ json: true });
      }
      if (url.pathname.endsWith("/read_alert_event")) {
        if (state.failRead)
          return route.fulfill({
            status: 503,
            json: { message: "unavailable" },
          });
        const id = request.postDataJSON().event_id;
        state.reads.push(id);
        state.events = state.events.map((e) =>
          e.id === id ? { ...e, read_at: new Date().toISOString() } : e,
        );
        return route.fulfill({ json: true });
      }
      if (url.pathname.endsWith("/alert_rules")) {
        const id = url.searchParams.get("id")?.slice(3);
        if (request.method() === "DELETE") {
          if (state.failDelete)
            return route.fulfill({
              status: 503,
              json: { message: "unavailable" },
            });
          const removed = state.rules.filter((r) => r.id === id);
          state.rules = state.rules.filter((r) => r.id !== id);
          return route.fulfill({ json: removed.map((r) => ({ id: r.id })) });
        }
        return route.fulfill({
          json: state.rules.filter(
            (r) =>
              !url.searchParams.has("symbol") ||
              r.symbol === url.searchParams.get("symbol")!.slice(3),
          ),
        });
      }
      if (request.method() === "HEAD")
        return route.fulfill({
          headers: {
            "content-range": `0-0/${state.events.filter((e) => !e.read_at).length}`,
            "access-control-expose-headers": "content-range",
          },
          body: "",
        });
      const cursor = url.searchParams.get("or");
      const before = cursor?.match(
        /created_at\.lt\.([^,]+),and\(created_at\.eq\.[^,]+,id\.lt\.([^\)]+)/,
      );
      const events = [...state.events].sort(
        (a, b) =>
          b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
      );
      return route.fulfill({
        json: events
          .filter(
            (e) =>
              !before ||
              e.created_at < before[1] ||
              (e.created_at === before[1] && e.id < before[2]),
          )
          .slice(0, 30),
      });
    },
  );
  return state;
}
export function alertEvent(
  id: string,
  value = 101,
  at = Date.now(),
): AlertEvent {
  const suffix = Array.from(id)
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
    .toString(16)
    .padStart(12, "0");
  id = `aaaaaaaa-aaaa-4aaa-8aaa-${suffix}`;
  return {
    id,
    symbol: "AAPL",
    comparison: "above",
    target: 100,
    value,
    unit: "USD",
    observed_at: new Date(at).toISOString(),
    created_at: new Date(at).toISOString(),
    read_at: null,
    session: "regular",
  };
}
