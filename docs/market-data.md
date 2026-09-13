# Market-data behavior

The Board displays external market observations for supported stocks, ETFs, indices and cryptocurrency pairs. Asset identity, reported currency and observation time remain attached to the data throughout the experience.

## Quotes, charts and metrics

Quotes use regular-session price and previous close. Extended-session values are not mixed into a regular-session change calculation. Period changes describe sampled price returns, not total returns or guaranteed execution prices.

Charts preserve received sample precision and timestamps. A current quote does not overwrite historical samples. Intraday axes follow validated dated session boundaries when available; missing session information falls back to the actual sample range.

The Board's six price/activity metrics are previous close, day range, 52-week range, volume, one-month change and one-year change. Missing values stay unavailable. Legitimate zero and negative values retain their meaning; unavailable percentages are not reported as zero.

Finance links preserve asset and venue identity where a destination can be resolved. Unresolved destinations are labelled as searches rather than presented as exact listings.

## Freshness and failure

Provider observation time is separate from retrieval time. Cached data retains its original timestamps, and an HTTP response alone does not establish a recent trade.

Refresh failures retain usable prior data with a stale or failure label. Unavailable and stale observations are excluded from Home mover rankings. A missing chart remains unavailable rather than displaying another period as a substitute. Late responses cannot replace a newer asset or timeframe selection.

## Evidence and limitations

Deterministic checks cover calculation rules, identity validation, malformed responses, session boundaries, missing values and failure recovery. Browser fixtures cover the corresponding user experience. Live-provider observations establish point-in-time availability, not independently verified prices.

A separate [limited provider comparison](market-comparison.md) covers three US stocks. Broad price reconciliation, corporate-action completeness, future provider availability and universal market accuracy are not established.

See [market-session indicators](header-activity.md), [test coverage](test-audit-implementation.md), and [future plans](roadmap.md).
