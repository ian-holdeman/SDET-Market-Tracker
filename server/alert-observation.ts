import {
  finite,
  providerSymbol,
  validateChart,
  validateQuoteResponse,
} from "./market";
import { providerJson } from "./provider-json";
export { parseAlertTarget as parseTarget } from '../src/utils/alertTarget';

export interface AlertObservation {
  symbol: string;
  value: number;
  unit: string;
  observedAt: string;
  retrievedAt: string;
  source: "Yahoo Finance sampled close";
  session: "pre" | "regular" | "post" | "continuous";
}


export function alertUnit(
  body: unknown,
  symbol: string,
  now = Date.now(),
): string {
  const quote = validateQuoteResponse(body, symbol, now);
  if (quote.assetType === "Bond Yield") return "%";
  if (!quote.currency || !/^[A-Za-z]{3}$/.test(quote.currency))
    throw Error("The provider has no usable quote unit for this asset.");
  return quote.currency;
}

/** Never alternate regular quotes with sampled closes: that can invent crossings. */
export function alertObservation(
  body: unknown,
  symbol: string,
  now = Date.now(),
): AlertObservation {
  const chart = validateChart(body, symbol, now);
  const unit = alertUnit(body, symbol, now);
  const closes = chart.indicators.quote[0].close as (number | null)[];
  let index = closes.length - 1;
  while (index >= 0 && !finite(closes[index])) index--;
  const observed = chart.timestamp[index] * 1000;
  // Uniform 15-minute freshness ceiling accommodates 5-minute sampled bars. Closed
  // sessions and daily-only instruments receive no fabricated fresh observation.
  if (index < 0 || observed > now || now - observed > 900000)
    throw Error("No fresh sampled observation is available.");
  let session: AlertObservation["session"] | undefined;
  if (chart.meta.instrumentType === "CRYPTOCURRENCY") session = "continuous";
  else
    for (const candidate of ["pre", "regular", "post"] as const) {
      const period = chart.meta.currentTradingPeriod?.[candidate];
      if (
        finite(period?.start) &&
        finite(period?.end) &&
        period.end > period.start &&
        observed >= period.start * 1000 &&
        observed < period.end * 1000
      ) {
        if (session) throw Error("Ambiguous provider session.");
        session = candidate;
      }
    }
  if (!session)
    throw Error("Session coverage is unavailable for this observation.");
  return {
    symbol,
    value: closes[index]!,
    unit,
    observedAt: new Date(observed).toISOString(),
    retrievedAt: new Date(now).toISOString(),
    source: "Yahoo Finance sampled close",
    session,
  };
}

export async function fetchAlertChart(
  symbol: string,
  request: typeof fetch = fetch,
  signal = AbortSignal.timeout(8000),
): Promise<unknown> {
  const response = await request(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol(symbol))}?range=1d&interval=5m&includePrePost=true`,
    { signal, redirect: "error" },
  );
  if (!response.ok) throw Error("Alert observations are unavailable.");
  return providerJson(response);
}
