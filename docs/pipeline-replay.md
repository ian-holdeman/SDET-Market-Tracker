# Nightly pipeline replay

The CI Job Timeline replays genuine completed nightly attempts, including failure, cancellation and repeated nights at an unchanged commit. It is recorded evidence, not a visitor-triggered execution.

## Evidence shown

Run outcome, job timing and browser-case results remain independent. Missing or incomplete timing is labelled rather than filled with invented activity. Browser counts describe the available browser-project cases; a successful job does not establish missing individual case outcomes.

The latest nightly identity is selected by run order before attempt order. A late rerun of an older workflow cannot displace a newer night, and a new attempt cannot borrow results from an earlier attempt.

## Playback and updates

Visitors can inspect a shared timeline, use 20× playback and operate accessible controls with reduced motion. Active or focused playback remains stable during bounded verification. When a new result arrives, the interface offers an explicit update action rather than silently replacing the current interaction.

Confirmed unavailability removes live evidence. Displayed dates remain the original run dates rather than retrieval times.

## Historical archive

An independently retained archive provides an explicitly older demonstration. It keeps its original identity and timestamps, remains separate from latest-nightly status, and does not enter rolling metrics.

The archive does not automatically rotate to every new night. Integrity, expiry and revocation are independent from live-source availability; an archive cannot establish a missing current outcome.

## Limitations

Local tests cover selection, retries, missing evidence, playback continuity and failure recovery. They do not prove genuine GitHub scheduler delivery or current hosted availability. See [test evidence](test-telemetry.md) and [recorded demonstrations](test-recordings.md).
