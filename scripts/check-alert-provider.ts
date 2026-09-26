import {
  alertObservation,
  alertUnit,
  fetchAlertChart,
} from "../server/alert-observation";
// Read-only availability evidence. No prices are stored in app databases.
const symbols = [
  "AAPL",
  "BTC-USD",
  "VOD.L",
  "^TNX",
  "EURUSD=X",
  "GC=F",
  "VTSAX",
];
const results = [];
for (const symbol of symbols) {
  const started = Date.now();
  try {
    const body = await fetchAlertChart(symbol);
    const unit = alertUnit(body, symbol);
    try {
      const observation = alertObservation(body, symbol);
      results.push({
        symbol,
        unit,
        available: true,
        session: observation.session,
        observedAt: observation.observedAt,
        retrievedAt: observation.retrievedAt,
        milliseconds: Date.now() - started,
      });
    } catch (error) {
      results.push({
        symbol,
        unit,
        available: false,
        reason: (error as Error).message,
        milliseconds: Date.now() - started,
      });
    }
  } catch {
    results.push({
      symbol,
      available: false,
      reason: "Provider request or metadata unavailable",
      milliseconds: Date.now() - started,
    });
  }
}
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      evidence:
        "Point-in-time shape/session availability only; not independent price accuracy.",
      results,
    },
    null,
    2,
  ),
);
