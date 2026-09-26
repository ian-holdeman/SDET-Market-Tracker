export type AlertComparison = "above" | "below";
export interface AlertRule {
  id: string;
  symbol: string;
  comparison: AlertComparison;
  target: number;
  unit: string;
  revision: number;
}
export interface AlertEvent {
  id: string;
  symbol: string;
  comparison: AlertComparison;
  target: number;
  value: number;
  unit: string;
  observed_at: string;
  created_at: string;
  read_at: string | null;
  session: string;
}
export const comparisonLabel = (value: AlertComparison) =>
  value === "above" ? "At or above" : "At or below";
export const alertValue = (value: number, unit: string) =>
  `${value.toLocaleString("en-US", { maximumSignificantDigits: 16 })}${unit === "%" ? "%" : ` ${unit}`}`;
