# Limited market-data comparison

A private diagnostic compares aligned Yahoo Finance and Finnhub regular-session quotes for AAPL, MSFT and NVDA. It is separate from public market delivery and published CI results.

## Method

Both observations must describe the same supported US stock in USD and fall within its regular trading session. Samples must be recent and close enough in observation time to support a comparison. Missing, stale, malformed or unaligned observations remain inconclusive.

The declared tolerance is the greater of USD 0.05 or 0.1% of the absolute Finnhub price. This accommodates differing feeds and observation times; it is not a validated exchange error bound. A mismatch can reflect feed or session differences and requires interpretation.

## Limits

The comparison does not cover all assets, historical charts, total returns or complete corporate-action reconciliation. A passing sample is evidence only for that comparison's conditions and time.

Provider observations and derived results remain private under the applicable access restrictions. The public application describes the method without republishing those observations. A public results display would require appropriate provider permission.

See [market-data behavior](market-data.md) and [test evidence boundaries](test-audit-implementation.md).
