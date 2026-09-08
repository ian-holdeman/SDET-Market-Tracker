# Saving searched assets

POST /api/assets/register accepts only { "symbol": "AIRJ" } and a Supabase bearer access token. The server verifies the identity with Auth getUser, validates syntax and matching Yahoo quote identity/price/time, then inserts the symbol into assets with ON CONFLICT DO NOTHING. No request-supplied identity, role, name, price or curation flag is accepted. Unsupported symbols and provider outages both fail validation honestly; an outage is not proof that a symbol is invalid.

The frontend calls registration only when its catalog lookup is empty. After confirmed registration, it inserts the watchlist item using the user's Supabase session and existing RLS. Catalog registration and watchlist saving are separate operations: a failed watchlist write can leave a shared catalog entry, but never reports the watchlist save as successful. Repeating registration is safe. Existing catalog assets do not require a Yahoo request to save.

## Configuration and local commands

Reuse server-only SUPABASE_URL and SUPABASE_SECRET_KEY plus VITE_AUTH_REDIRECT_URL from account deletion. Keep the secret in ignored .env.local. Public client and server must target the same project. Missing configuration returns a useful 503. No new provider key is needed.

- Apply without resetting local data: `node scripts/supabase.mjs migration up --local`
- Run SQL authorization tests: `npm run db:test`
- Run offline endpoint/provider tests: `npm run test:baseline`
- Run disposable local Auth/REST integration tests: `npm run test:auth`
- Run browser checks: `npm run build:e2e` then `npm run test:e2e -- src/tests/specs/auth/auth.spec.ts --workers=2`
- Restore normal build: `npm run build`
- Restart `npm run dev` after server changes.

The migration grants service_role only SELECT/INSERT on assets. It retains no table access to personal watchlists, curation or admin assignments. Browser users still cannot register arbitrary catalog entries through REST; existing admin permissions remain unchanged. A Supabase secret is still broadly privileged for Auth APIs and must remain server-only.

## Evidence and limits

Offline tests prove malformed/mismatched provider data cannot reach registration, caller verification precedes writes, extra privilege fields are rejected, and failures/rate limits are explicit. SQL tests prove grants and RLS. Local integration tests exercise the real Auth and PostgREST APIs with disposable accounts and a simulated Yahoo response. Browser tests simulate external APIs and verify save/error UI behavior. None establishes perpetual Yahoo availability or market-data licensing rights.

Validation allows ten attempts per verified account per minute, caps concurrent operations at eight, and bounds limiter entries to 1,000. Limits are process-local and reset with the server; a multi-instance deployment needs a shared limiter. Provider calls share a twelve-second timeout. There is no freshness threshold that would incorrectly reject a valid closed-market observation.

References: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [RLS and service keys](https://supabase.com/docs/guides/database/postgres/row-level-security). Registration uses current Auth verification rather than trusting browser session metadata; service credentials bypass RLS, so explicit table grants and narrowly scoped operations are essential.
