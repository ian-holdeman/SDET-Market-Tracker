# Saving searched assets

Signed-in visitors can add supported search results to their private watchlist, including assets outside the shared curated Board.

## Behavior

The application verifies the account and the provider's asset identity before registering a previously unknown asset. Registration and watchlist saving are separate outcomes: a failed save does not appear as a successful addition.

Shared asset identity is separate from curation and ownership. Saving an asset does not add it to the curated Board, grant administrative authority or affect another person's watchlist. Removing shared curation does not erase private watchlists.

Provider outages and unsupported symbols remain distinct possibilities. A validation failure caused by an outage is not proof that an asset is invalid. Recovery allows another attempt without manufacturing a successful save.

## Evidence limits

Automated coverage includes malformed or mismatched provider data, rejected privilege fields, repeated registration, save/removal failure and recovery, persistence, and preservation of other saved assets. Database integration tests separately verify ownership and role boundaries.

Browser fixtures do not establish provider availability, market-data licensing rights or hosted database authorization. See [accounts](../supabase/README.md), [market data](market-data.md) and [test coverage](test-audit-implementation.md).
