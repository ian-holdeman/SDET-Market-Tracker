# Accounts and private data

Supabase provides Google authentication and database storage for private watchlists and shared asset curation. Public market browsing and test-evidence pages remain available without an account.

## Ownership and authority

Private watchlists belong to authenticated account identities. Database authorization enforces ownership independently of the interface. Editable profile information cannot grant administrative authority.

Board curation is a separate responsibility: administrators can curate shared assets without gaining access to other people's private watchlists. Registering a searched asset does not grant curation or role privileges.

## Account lifecycle

Visitors can remove individual saved assets, clear their watchlist or delete their account. Deletion is verified server-side, and a local session is cleared only after confirmed success. Uncertain failures remain visible.

Personal records and role assignments follow the deleted account; shared assets remain. A newly created account identity does not inherit the former identity's private data or authority, even when the email address is reused.

## Evidence and limits

Database and disposable authentication integration tests exercise ownership, cross-user isolation, role boundaries and deletion effects. Browser fixtures cover the corresponding interface but do not establish real provider behavior or database authorization by themselves.

Provider availability, logs, backups and recovery policies remain separate limits. See [privacy](../docs/privacy-security.md), [data handling](../docs/data-inventory.md), and [hosting](../docs/deployment.md).
