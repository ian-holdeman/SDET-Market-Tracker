# Board market-data contract

## Pipeline

`server/market.ts` owns the Yahoo HTTP boundary, normalization and bounded in-process caches. `server.ts` mounts the routes. Responses flow through `src/services/yahooMarket.ts`, `MarketContext`, and the existing Board/detail components. The local catalog now contains identities only, with no seeded prices, volume, ranges, fundamentals or synthetic sparklines. Curated symbols and database records are unchanged.

Validation checks provider envelopes and symbol identity for both quotes and charts. Quotes require a finite price and valid observation time independently of optional intraday candles. Missing or malformed optional candles yield an empty sparkline, not a fabricated chart or a failed valid quote. Chart/history endpoints still require aligned arrays, finite closes, and ordered positive timestamps without future samples. Null candle slots are omitted; malformed numeric slots fail history requests. A partial quote refresh is labeled Partial Market Update rather than a lost connection. Optional missing/malformed metrics become null; reversed ranges become unavailable.

Nasdaq-100 (`^NDX`) is distinct from Composite (`^IXIC`). Crypto aliases consistently map to USD pairs. AGG, GLD and USO are ETFs. Provider-reported currency is preserved, including on index quotes; the supported Treasury yield symbol displays percent.

## Financial semantics

- Board quotes use regular-session price and previous close. They do not combine extended-session price with regular-session change.
- Change is price minus baseline. Percentage is that difference divided by a positive baseline, times 100. Missing, zero or negative baselines produce an unavailable percentage. Zero price, volume, dividend yield and P/E remain zero; negative P/E remains negative.
- Intraday history uses reported previous close. Longer periods use their first sampled close. This is a sampled price return, not total return or a guaranteed period-opening execution price.
- Charts preserve raw close precision and timestamps, including extended-session samples when supplied. They never overwrite history with the latest quote. High/low references are extrema of displayed sampled closes; the separate reported day-range metric has different semantics. These references describe sampled-close extrema, not intrabar extremes.
- The 1D axis uses validated, dated provider session boundaries when they contain the received samples, leaving future time unplotted as the session progresses. Missing, malformed, disjoint or mismatched session metadata falls back to actual sample bounds. No fixed UTC offset or invented trading day is used. Labels use Eastern time. A valid one-point history remains usable. The header separately indicates scheduled U.S. equity sessions; see [header activity](header-activity.md).
- Analyst targets, ratings, counts, 52-week ranges and expenses are never estimated. Missing P/E does not imply an unprofitable company. Fundamental fields remain unavailable when their source is inaccessible.

## Failure and caching

Quotes carry separate `asOf` (provider observation) and `fetchedAt` (server retrieval) timestamps. Cache hits preserve both. Observation timestamps stay in the data contract; the feed says data may be delayed. Visible per-row timestamps were removed to preserve the original row sizing. An HTTP success is not evidence of a recent trade.

Invalid parameters return 400. Partial batches return explicit `partial` status and an `unavailable` symbol list. Total quote failure, chart failure and search failure return 502. A valid empty search result stays a successful empty result. Provider error payloads are not exposed to the browser.

Failed refreshes retain previous quotes with a global failure message and row hover explanation, and exclude them from mover rankings. Never-received assets show unavailable values. Historical fallback is explicitly stale and specific to symbol/timeframe. Without cached history, the chart shows an error, not daily data disguised as another period. Generation checks discard late timeframe responses.

Server requests have a 12-second deadline, ten concurrent chart requests per batch, at most 100 requested symbols, 256 cache entries and 128 in-flight cache keys. Successful quote/chart entries expire after 15 seconds; searches after 60 seconds. Cache work is deduplicated. HTTP responses use `no-store`. The client has a 15-second request timeout and 100-entry candle cache (30 seconds intraday, five minutes otherwise). Expanded charts refresh every 30 seconds; all-symbol chart prewarming was removed. These are single-process safeguards, not a distributed rate limiter or capacity guarantee.

## Checks and evidence

```sh
npm run lint
npm run build:e2e
npm run test:baseline
npm run test:e2e
# Opt-in external check, excluded from offline CI:
npm run test:market:live
# Restore the normal configured build:
npm run build
```

Offline tests inject provider responses and time. They establish normalization, identity/malformed-data rejection, zero/null handling, return calculations, non-mutating history, failed/partial HTTP outcomes, and cache age/stale behavior for those cases. Browser tests intercept network calls to exercise missing metrics, one-point history, timeframe failure, retained stale quotes and honest provider-failure states in Chromium/WebKit. Existing Auth, seed-parity, telemetry and static-serving checks remain in place.

The live command samples SPY, BTC-USD, ^NDX and AGG. It checks current HTTP availability and acceptance of response shapes, identities, timestamps and samples. It cannot establish price correctness against an independent provider. The optional fundamentals HTTP probe is reported separately; the running application no longer calls that endpoint.

The prior 88-symbol audit found usable quote metrics and month/year history, with benchmark volume not applicable. This was point-in-time evidence; rerun the coverage command to establish current availability. Do not reuse historical test totals as current verification.

## Remaining decisions and interview rationale

The Yahoo endpoints used here have no versioned contract or SLA supplied to this project. Before launch, choose a provider/access arrangement suitable for intended use, confirm redistribution permissions and rate limits. The application now uses price/activity metrics rather than depending on inaccessible fundamentals. No privileged credentials were added.

Independent price reconciliation, full venue coverage, exchange halt/calendar integration beyond the scheduled header indicator, corporate-action adjustment policy, total returns, load testing and distributed rate limiting remain unverified. An old provider observation can be legitimate on a closed market; stale here specifically indicates failed retrieval, not an assertion about every venue's trading calendar.

Defend these choices in an interview: validate before arithmetic; distinguish unknown from zero; keep price, baseline and session semantics consistent; preserve provenance through caches; test failures deterministically; and separate contract availability from financial correctness. A visually plausible fallback is not a valid test oracle.

Primary references: [Yahoo exchange delays](https://help.yahoo.com/kb/SLN2310.html), [Nasdaq-100 identity](https://finance.yahoo.com/quote/%5ENDX/), [Nasdaq Composite identity](https://ca.finance.yahoo.com/quote/%5EIXIC/), and [iShares AGG identity](https://www.ishares.com/us/products/239458/ishares-core-total-us-bond-market-etf).

## Six expanded-card metrics

The unchanged six-cell responsive grid now shows previous close, day range, 52-week range, reported volume, one-month price change, and one-year price change. Indices and bond-yield benchmarks display N/A for volume. The Google Finance link remains available for deeper research.

GET /api/price-activity?symbol=AMD fetches two years of daily Yahoo closes once and computes both periods. The function is independent of React and the database. Any validated symbol, including a searched symbol outside the catalog, uses this same read-only endpoint; it does not register an asset or grant watchlist/curation privileges.

Periods are anchored to the latest daily sample's UTC calendar date. Subtract one or twelve calendar months, clamp month-end (including leap days), and use the latest close on or before that boundary, up to seven calendar days earlier. A shorter listing history or longer missing-data gap produces null, rather than mislabeling an inception return as a full-year return. These are provider-close price changes, not dividend-reinvested returns. A current daily bar can still be in progress. Yahoo's corporate-action adjustments are not independently reconciled.

Both server calculations and client results cache for five minutes with bounded entry counts and in-flight deduplication. Only expanded cards fetch this history. Cached results survive failed refreshes with a small amber warning and tooltip; no extra timestamp row is added. Server failures remain 502, and insufficient period history is a successful response containing an unavailable metric. Currency and quote metrics continue to use the existing quote path. The obsolete optional v7 fundamentals request was removed from quote fetching.

Run npm run test:market:coverage for the opt-in 88-symbol audit. It writes docs/market-coverage.json with per-field availability, not market prices or credentials. This is a point-in-time availability check, not a financial-accuracy guarantee. The deterministic tests cover month-end, weekends, leap-day anniversaries, zero baselines, short histories, missing bars, cache expiry/deduplication, and failures. Browser tests cover the same six-card grid on desktop/mobile and searched assets, including cache reuse after re-expansion.

Market-price displays share compact formatting at magnitudes of 10,000 and above (for example, $12.3K). Four-digit prices retain cents in single-value displays and round to whole currency units in paired range cells. Provider-reported currency symbols are retained, including for index quotes. Full formatted prices remain in hover tooltips; source values, sorting and calculations retain their original precision. Bond yields retain percentage formatting. Browser regression checks cover large table ranges and expanded metric bounds on desktop/mobile.

Compact currency labels explicitly set minimumFractionDigits to zero to prevent ICU defaults from differing between Node 22/Linux, Node 24/Windows and browsers (for example $1M versus $1.0M).

## Intraday chart continuity

The server preserves the full available 1D close series for table trendlines instead of retaining only the final 28 bars. Expanded charts continue to use actual sample timestamps and prices; no last-price substitution, extrapolated future line or synthetic trades are added.

`src/utils/chartSession.ts` validates the provider's `currentTradingPeriod` pre/regular/post intervals. Nonempty intervals must be contiguous, positive, ordered and cover the dataset, with a maximum combined span of 36 hours. The response identifies `sessionSource` as provider or samples. A new day's metadata cannot place old holiday/weekend observations on today's axis. Existing samples stay dated, with a Previous session label when their Eastern date differs from today. When current-session samples arrive, they occupy only the elapsed part of that session's axis. Unknown session metadata uses sample bounds and no activity pulse.

An endpoint dot also makes single-sample charts visible. The 1D endpoint pulses only within validated provider bounds, with an observation no older than ten minutes and retrieval no older than sixty seconds. Failed refreshes stop the pulse and label retained history stale. This indicates recent sampled data within a provider session, not a streaming connection or exchange halt monitoring. Reduced-motion preferences keep the endpoint static, including changes made while the page is open.

Expanded charts keep their data during the 30-second background refresh and do not repeatedly show initial-loading UI. Clicking the selected timeframe leaves its chart intact. Requests for the same symbol/timeframe are coalesced, pending keys are capped at 100, and generation checks still discard late responses after timeframe changes/unmount. The request deadline remains fifteen seconds. Session activity ages on a fifteen-second clock and updates immediately when a response arrives.

Offline regressions cover dated session bounds, early closes, malformed/mismatched schedules, full-day trendlines and activity expiry. `src/tests/specs/board/chart-session.spec.ts` uses a controlled clock for a Friday-to-post-holiday Tuesday handoff, premarket-to-regular transition, active-timeframe clicks, reduced-motion changes and refresh failure. Browser dependencies are mocked; provider availability is checked separately with the opt-in live command. No independent price reconciliation or hosted behavior is established by these tests.

## Google Finance destinations

`applyQuote` carries Yahoo's `exchangeName` into the Board stock's `exchange`; a successful quote without that metadata clears it. Failed refreshes retain the previous observation and its identity. `src/utils/financeLinks.ts` translates recognized venue codes (including NGM/NMS/NCM, NYQ and PCX) to Google identifiers. The old per-stock venue override list is removed, so it cannot override a changed listing. Index identifiers have explicit translations; supported crypto symbols use USD pairs, and Berkshire class shares use Google's dot notation.

Unrecognized venues, unsupported instrument types and symbols without a supported translation use a labeled Google Finance search, restricted to Google Finance quote pages and including the symbol/name and available exchange. No bare-ticker redirect, invented exchange or claim of universal Google coverage is made. Link construction performs no extra provider request and does not scrape Google on every refresh.

Offline link regressions cover metadata propagation, venue changes, missing/malformed exchanges, index/crypto identities and unsupported futures. Browser coverage in `src/tests/specs/board/finance-links.spec.ts` checks the actual MDB/SPY card links, keyboard focus and fallback after metadata disappears on desktop/mobile with mocked quotes. Both exact-ticker and company-name searches exercise an asset outside curation, using the resulting quote venue without registration or other writes. These tests establish application routing, not continuing availability of Google's pages.

Destination identities checked against Google Finance on 2026-09-08: [MongoDB](https://www.google.com/finance/quote/MDB:NASDAQ), [Bitcoin/USD](https://www.google.com/finance/quote/BTC-USD), [Nasdaq-100](https://www.google.com/finance/quote/NDX:INDEXNASDAQ), [S&P 500](https://www.google.com/finance/quote/.INX:INDEXSP), [Nasdaq Composite](https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ), [Dow](https://www.google.com/finance/quote/.DJI:INDEXDJX), [Russell 2000](https://www.google.com/finance/quote/RUT:INDEXRUSSELL), [FTSE 100](https://www.google.com/finance/quote/UKX:INDEXFTSE), [Nikkei 225](https://www.google.com/finance/quote/NI225:INDEXNIKKEI), [DAX](https://www.google.com/finance/quote/DAX:INDEXDB) and [Berkshire class B](https://www.google.com/finance/quote/BRK.B:NYSE). This is a destination check, not price reconciliation. New venues or symbol conventions require their own mapping and verification.
