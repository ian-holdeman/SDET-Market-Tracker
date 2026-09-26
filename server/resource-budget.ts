import type { serverSupabase } from './account';

export class ResourceLimitError extends Error {
  constructor(readonly status: 429 | 503, message = 'Market requests are temporarily limited. Retry later.') { super(message); }
}

/** Shared admission plus a constant-size local rejection circuit. No visitor/IP
 * identifiers, and no fallback to unlimited work on a configured store failure. */
export function marketBudget(config: ReturnType<typeof serverSupabase>, clock = Date.now) {
  let blockedUntil = 0;
  let failure: ResourceLimitError | undefined;
  return async () => {
    // Unconfigured local previews still have process admission. Production
    // configuration separately requires the trusted Supabase configuration.
    if (!config) return;
    if (clock() < blockedUntil) throw failure;
    try {
      const { data, error } = await config.client.rpc('claim_market_budget').abortSignal(AbortSignal.timeout(2000));
      if (error || typeof data !== 'boolean') throw new ResourceLimitError(503, 'Market capacity could not be verified. Retry later.');
      if (!data) throw new ResourceLimitError(429);
    } catch (error) {
      failure = error instanceof ResourceLimitError ? error : new ResourceLimitError(503, 'Market capacity could not be verified. Retry later.');
      blockedUntil = clock() + (failure.status === 429 ? 30000 : 5000);
      throw failure;
    }
  };
}
