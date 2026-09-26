import { getSupabase } from "../lib/supabase";
import type { AlertRule, AlertEvent, AlertComparison } from "../types/alerts";

const uuid = (value: unknown) =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
const timestamp = (value: unknown) =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value));
const identity = (row: any) =>
  row &&
  uuid(row.id) &&
  typeof row.symbol === "string" &&
  /^[A-Z0-9^][A-Z0-9.^=-]{0,31}$/.test(row.symbol) &&
  ["above", "below"].includes(row.comparison) &&
  Number.isFinite(row.target) &&
  typeof row.unit === "string" &&
  /^([A-Za-z]{3}|%)$/.test(row.unit);
const validRule = (row: any): row is AlertRule =>
  identity(row) && Number.isInteger(row.revision) && row.revision > 0;
const validEvent = (row: any): row is AlertEvent =>
  identity(row) &&
  Number.isFinite(row.value) &&
  timestamp(row.created_at) &&
  timestamp(row.observed_at) &&
  (row.read_at === null || timestamp(row.read_at)) &&
  ["pre", "regular", "post", "continuous"].includes(row.session);
export class AlertRequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}
export async function alertRequest(
  action: string,
  body: unknown,
  owner?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (owner) {
    const { data, error } = await getSupabase().auth.getSession();
    if (error || data.session?.user.id !== owner)
      throw Error("Your account changed. Sign in again.");
    headers.Authorization = "Bearer " + data.session.access_token;
  }
  const response = await fetch("/api/alerts/" + action, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new AlertRequestError(
      typeof result?.error === "string"
        ? result.error
        : "The alert request was not confirmed.",
      typeof result?.code === "string" ? result.code : undefined,
    );
  return result.data;
}
export async function loadAlertRules(
  symbol: string,
  signal: AbortSignal,
): Promise<AlertRule[]> {
  const { data, error } = await getSupabase()
    .from("alert_rules")
    .select("id,symbol,comparison,target,unit,revision")
    .eq("symbol", symbol)
    .order("created_at")
    .abortSignal(signal);
  if (
    error ||
    !Array.isArray(data) ||
    data.length > 4 ||
    !data.every(validRule)
  )
    throw Error("Alerts could not be loaded. Retry shortly.");
  return data;
}
export async function saveAlertRule(
  owner: string,
  rule: {
    id: string;
    symbol: string;
    comparison: AlertComparison;
    target: string;
    revision: number | null;
  },
): Promise<AlertRule> {
  const data = await alertRequest("rules", rule, owner);
  if (!validRule(data))
    throw Error(
      "The saved alert could not be verified. Reload before retrying.",
    );
  return data;
}
export async function deleteAlertRule(id: string) {
  const { data, error } = await getSupabase()
    .from("alert_rules")
    .delete()
    .eq("id", id)
    .select("id")
    .abortSignal(AbortSignal.timeout(12000));
  if (error || data?.length !== 1)
    throw Error("Deletion was not confirmed. Reload to check this alert.");
}
export async function loadAlertHistory(
  signal: AbortSignal,
  before?: { created_at: string; id: string },
): Promise<AlertEvent[]> {
  let query = getSupabase()
    .from("alert_events")
    .select(
      "id,symbol,comparison,target,value,unit,observed_at,created_at,read_at,session",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(30);
  // Cursor values originate from validated server rows, never URL/query input.
  if (before)
    query = query.or(
      `created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`,
    );
  const { data, error } = await query.abortSignal(signal);
  if (error || !Array.isArray(data) || !data.every(validEvent))
    throw Error("Alert history could not be refreshed.");
  return data;
}
export async function unreadAlertCount(signal: AbortSignal) {
  const { count, error } = await getSupabase()
    .from("alert_events")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .abortSignal(signal);
  if (error || typeof count !== "number")
    throw Error("Unread alerts are unavailable.");
  return count;
}
export async function markAlertRead(id: string) {
  const { data, error } = await getSupabase()
    .rpc("read_alert_event", { event_id: id })
    .abortSignal(AbortSignal.timeout(12000));
  if (error || data !== true)
    throw Error("Read status was not saved. The entry may have expired.");
}
