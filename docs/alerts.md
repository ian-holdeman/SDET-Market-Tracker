# Private price alerts

Each asset's saved alerts appear by target price, highest to lowest, including after edits and reloads.

Signed-in accounts can create up to four independent alerts per asset, including searched assets. The expanded asset bell offers inclusive **At or above** and **At or below** targets in the actual quoted currency or unit, with up to two decimal places. Zero and negative targets are supported. Alerts are independent of watchlists.

A fresh qualifying observation creates one private history event. A rule remains active after triggering and rearms only after a valid observation leaves its qualifying range. Editing the comparison or target starts a new evaluation generation; saving unchanged values does not rearm it. Rules can be added, edited or deleted. Recent history survives rule deletion.

The header bell opens a rolling 30-day history. Opening the list does not mark every entry read. Opening an entry or using its **Mark as read** action saves that entry's read status across devices. Notification Settings controls optional delivery for the current browser installation; history works without notification permission.

With notifications enabled, any signed-in user can select **Send test notification** in Settings. It uses the current installation's browser-notification or Web Push channel, labels the message as a test, and creates no price rule or history event. Push tests are limited to one every 30 seconds. A successful test checks delivery in that moment; it does not verify price evaluation or guarantee later OS delivery.

## Evidence and delivery limits

Evaluation targets a five-minute cadence when a trusted server scheduler is configured. Capacity, provider availability and scheduling delays can extend it. Brief crossings between observations may be missed. Alerts use validated Yahoo sampled closes, with provider time separate from retrieval time and a 15-minute freshness ceiling. Regular, premarket and postmarket samples require matching dated session metadata; crypto can use continuous observations. Old or unsupported observations do not trigger or rearm a rule. The Board's regular-session quote and chart data are not combined into artificial crossings. These are provider observations, not independently certified prices.

Ordinary browser notifications operate while an open tab executes and do not replay missed notifications on reopening or resuming after suspension. Installed Android contexts can explicitly opt into background Web Push when the server is configured. Each opted-in installation receives its own delivery attempt; a shared browser installation suppresses duplicates. Up to ten push installations are supported per account. Email is not included.

Push-service acceptance is not proof of device display. Browser permission, network availability, OS restrictions and battery settings affect delivery. A lost response or terminated worker can miss a system notification while the private history remains. Physical Galaxy/Brave/Chrome delivery has not been established by the automated tests.

## Architecture and verification

Supabase UUID ownership, explicit grants and row-level security protect rules and history, including against other users and application admins. A database transaction locks evaluation state and creates unique events atomically. Generation checks reject stale edits and evaluation results; history expiry never erases rule memory. A bounded outbox separates transport failures from durable history.

Web Push uses server-side VAPID credentials and a validated browser transport endpoint. Push payloads contain opaque IDs; the worker must recheck an installation capability and active account session before retrieving private details. Opt-out and sign-out disable this installation, with pending offline revocation retried later. No private content enters the public offline cache. See the application's privacy notice for data and retention details.

Deterministic tests cover observations, injected transport failures and worker display checks. Local SQL and Auth tests cover concurrent limits, ownership, retries, edits, deletion and expiry. Playwright scenarios exercise the rule form, read state, permission failure, focus and ordinary notification baselines in desktop Chromium and mobile WebKit. Mocked browsers do not prove hosted scheduling, real OAuth, actual push delivery or independent financial accuracy. Commands and the broader evidence model are documented in [test telemetry](test-telemetry.md).
