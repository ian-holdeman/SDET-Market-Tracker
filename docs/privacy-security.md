# Privacy and security

The application supports public market browsing, optional Google sign-in and private watchlists. Personal-data use is limited to operating those features; analytics, advertising, subscriptions, behavioral profiling and secondary use are excluded.

Ian Holdeman operates the project personally from Utah. Privacy contact: ianrholdeman@gmail.com. The application is intended for a general audience and is not directed at children under 13.

## Information and controls

Google authentication supplies basic account identity. Watchlists belong to authenticated accounts, with database-enforced ownership. Shared asset curation is separate from private watchlists and does not grant access to another person's saved assets.

Appearance choices stay in the browser and are not sent to the application server or associated with an account. They remain after sign-out or account deletion; clearing site storage removes them.

Visitors can remove saved assets, clear their own watchlist or delete their account. An uncertain deletion is not presented as success. Account deletion does not delete a Google identity, shared market assets, provider logs or backups.

## Providers and retention

Cloud Run serves the application; Supabase handles authentication and database records. Market and logo providers receive requests needed for their services. Fonts and demonstration media are served by the application.

Direct Parqet logo requests disclose network metadata and the requested symbol. Provider permission remains unresolved; no entitlement or provider retention period is asserted. Referrer suppression does not conceal a network address.

Provider logs, backups and recovery policies have retention separate from live application records. See the [data inventory](data-inventory.md) for the categories involved. This documentation does not claim universal compliance or complete backup erasure.

## Privacy requests

Privacy inquiries can be sent to the published contact address. Identity verification is proportionate to the requested access, correction or deletion; passwords and access tokens are not required. Email alone does not grant access to another account.

Correspondence is limited to handling the request and applicable obligations. A fixed mailbox retention period and a universal response deadline are not asserted. The in-application notice provides the public description of current processing.

## Evidence limits

Browser tests cover interface behavior and request construction. Database/authentication integration and dated hosted checks cover separate boundaries. They do not establish permanent provider behavior, universal security or legal certification. See [coverage](test-audit-implementation.md) and [hosting](deployment.md).
