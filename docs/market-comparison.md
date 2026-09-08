# Private independent market comparison

The opt-in command compares Yahoo Finance's regular-market quote with a Finnhub REST quote for AAPL, MSFT and NVDA. It is an owner-operated diagnostic, separate from application market delivery and deterministic CI. It does not cover all assets, historical charts, corporate-action adjustments, index calculations or universal financial accuracy.

## Access and permitted use

Set `FINNHUB_API_KEY` in ignored `.env.local`; never use a `VITE_` name, public artifact or browser request. The command uses the `X-Finnhub-Token` header, bounded HTTPS requests and no WebSocket connection. It rejects execution in CI or Cloud Run. No paid plan or new subscription is provisioned by this command.

[Finnhub quote documentation](https://finnhub.io/docs/api/quote) describes US-stock current prices; historical candles require separate premium access. [Finnhub terms](https://finnhub.io/terms-of-service) restrict personal plans to personal use, prohibit sharing data or derived results without written permission, and require data deletion when the subscription ends. Consequently, retained provider observations and comparison results remain private. The public Logic page describes the test method without reproducing results. A public results display would require separate permission.

## Method and evidence limits

Run `npm run test:market:compare -- --run` during a regular US trading session. There are three pairs of requests, processed one symbol at a time; each pair is requested concurrently with twelve-second deadlines and one-megabyte streamed response limits. No automatic polling or retry can replace a failed observation.

- Yahoo's returned symbol must match the requested identity and its quote must be USD. Finnhub's identity and currency are scoped by the three supported US symbol requests; its response does not independently echo them.
- Both provider observation timestamps must fall within Yahoo's dated regular session. The maintained US trading calendar must also identify the current time as regular trading. Both observations must be at most two minutes old, at most five seconds into the future, and within one minute of each other. Retrieval times remain separate.
- Compare current nominal prices with a predeclared tolerance of the greater of USD 0.05 or 0.1% of the absolute Finnhub price. This is a diagnostic allowance for different feeds and slightly different observation times, not a validated exchange error bound. A mismatch can reflect feed/session differences and requires investigation.
- Preserve finite zeros and negative values. Missing or malformed observations remain unavailable; timestamp zero is unavailable data. Do not substitute a previous close, dividend-adjusted price or a different trading day. A detected corporate-action event makes that sample inconclusive pending a share-basis review; absence of an event is not proof of complete corporate-action coverage.

Exit 0 means all three samples met this diagnostic's conditions and tolerance; exit 1 means at least one aligned comparison was outside tolerance; exit 2 means missing, invalid, stale or unaligned evidence prevented a complete result. An exit code is limited to those samples and is never published as application accuracy or a CI result.

## Retention and reproduction

Private reports under ignored `output/private-market-comparison/` contain normalized observations, original observation/retrieval times, policy, commit, dirty-worktree indicator and honest per-symbol outcomes. No credentials, request headers or raw provider errors are retained. The next invocation prunes this command's named files to ten reports and thirty days. This is invocation-time cleanup, not a running retention service.

Use `npm run test:market:compare -- --clear` to remove these reports deliberately, including when provider access/subscription ends. Other development artifacts are untouched. Never upload this directory to GitHub, Cloud Storage publication, or public application assets.

Offline cases in `scripts/tests/market-comparison.test.ts` check zero/negative handling, threshold behavior, malformed values, identity/currency mismatch, stale/future timestamps, session boundaries and missing data. Those cases validate the method only; the opt-in command is required for real-provider observations.
