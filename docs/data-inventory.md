# Application data inventory

This overview describes the application's identified information flows. It is not a declaration of legal compliance or a guarantee about every provider's retention.

| Information | Purpose and handling |
| --- | --- |
| Network and request metadata | Application hosting and provider requests involve ordinary HTTP metadata, network addresses and requested symbols or paths. Hosting logs have separate retention. |
| Google account identity | Optional authentication supports private watchlists. The application does not request additional Google product access. |
| Private watchlist membership | Saved assets belong to an authenticated account and remain until removal, clearing or account deletion. Database authorization protects ownership. |
| Shared assets and curation | Public market identities are separate from personal watchlists. Account deletion does not remove shared assets. |
| Browser authentication state | Supports sign-in and session continuity. Confirmed sign-out/deletion clears app-specific authentication state; interrupted provider flows have their own lifecycle limits. |
| Appearance preference | An explicit Light/Dark choice stays in browser storage, survives sign-out/deletion and is removed by clearing site storage. |
| Test evidence | Sanitized project test results and original run identities, not visitor behavior. Live snapshots expire; historical demonstrations are labelled separately. |
| Contact email | Sending email involves the sender's provider and the project mailbox. The application has no embedded message-submission service. |

## External requests

The browser contacts the application host, Supabase and the configured logo provider. Market-data retrieval and test-evidence verification involve their respective external providers. Fonts, resume previews and demonstration media are served from the application origin.

Following Google Finance or GitHub links sends the visitor to those services. Referrer protections do not prevent destination services receiving network metadata or their own cookies.

Direct Parqet logo delivery remains enabled while provider permission is unresolved. No brokerage linking, account balances, payment data or transaction imports are part of the current feature set.

## Retention boundaries

Live personal records, browser state, provider logs, backups and historical test evidence have different lifecycles. Clearing a watchlist does not delete an account; deleting an account does not promise erasure from external logs or backups.

The application excludes analytics, advertising and behavioral profiling. See [privacy and security](privacy-security.md) for contact information, controls and limitations.
