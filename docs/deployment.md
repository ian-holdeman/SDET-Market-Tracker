# Hosting and availability

The application is hosted on [Google Cloud Run](https://sdet-market-tracker-855618435389.us-west1.run.app). Supabase provides authentication and database services, while private Cloud Storage retains validated test snapshots and a separate historical archive.

## Architecture and tradeoffs

Cloud Run scales to zero when idle. The design targets zero additional monthly cost and accepts cold starts as a tradeoff. Free allowances, storage/egress usage and provider availability constrain that target; it is not a billing guarantee.

Saved test evidence can improve the first useful display while current verification continues. Source validation and persistence finish within active requests, consistent with request-based CPU. Cache snapshots do not publish results or override upstream removal.

Supabase Free can pause after inactivity. Static application visits and repository activity are not equivalent to database use. No artificial keepalive is used. Provider recovery and backup limitations remain independent of application behavior.

## Separation of responsibilities

Application runtime access, deployment access and historical-archive publication have distinct responsibilities. Private watchlists are protected by database authorization. Shared catalog data is separate from account records, and local synthetic fixtures are not production data.

Test execution and evidence publication do not automatically deploy the application. A successful earlier run does not establish the state of a later deployed revision.

## Dated hosted evidence

Initial September 2026 checks covered public routes, both palettes, real Google sign-in/out, watchlist persistence, cross-user/admin isolation, account deletion, recordings, PDF delivery and evidence recovery.

The initial release commit passed [CI run 34270397946, attempt 1](https://github.com/ian-holdeman/SDET-Market-Tracker/actions/runs/34270397946), with both jobs successful and browser cases passing on their first attempt. That evidence applies to that release rather than later changes.

Bounded recovery checks covered denied storage, failed upstream access, overlapping evidence writers and rollback. A 402 ms health response observed after an instance restart excluded startup/traffic-change time and was not an end-to-end cold-start benchmark. A simultaneous 19-request sample returned responses in 183–1,393 ms; that sample is not a latency SLA.

## Remaining evidence limits

Real-origin cold starts, scheduled publication and affected functionality require revision-specific observations. Local fixtures and successful deployment commands cannot establish those outcomes. See [test-evidence measurements](test-telemetry.md#initial-load-measurements), [privacy](privacy-security.md), and [future plans](roadmap.md).
