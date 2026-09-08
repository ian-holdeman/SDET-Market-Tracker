import { Router } from 'express';
import { serverSupabase } from './account';
import { providerSymbol, validateQuoteResponse } from './market';
import { providerJson } from './provider-json';

/** A quote must match the requested identity and pass the same checks as displayed data. */
export async function validateAsset(symbol: string, request: typeof fetch = fetch) {
  const signal = AbortSignal.timeout(12000);
  let lastError: unknown;
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const response = await request(`https://${host}/v8/finance/chart/${encodeURIComponent(providerSymbol(symbol))}?range=5d&interval=1d`, { signal, redirect: 'error' });
      if (!response.ok) throw new Error('Provider unavailable or symbol not found');
      validateQuoteResponse(await providerJson(response), symbol);
      return;
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

type Dependencies = {
  verify: (token: string) => Promise<string | null>;
  claim?: (verifiedUser: string) => Promise<boolean>;
  validate: (symbol: string) => Promise<void>;
  register: (symbol: string) => Promise<void>;
};

export function assetRouter(deps: Dependencies | null, origin: string | null) {
  const router = Router();
  // Bound both provider concurrency and per-account attempts, including failures.
  // This is a single-process guard, not a distributed rate limiter.
  const attempts = new Map<string, { count: number; expires: number }>();
  let active = 0;
  router.post('/api/assets/register', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!deps || !origin) return res.status(503).json({ error: 'Saving searched assets is not configured on this server.' });
    if (req.get('origin') && req.get('origin') !== origin) return res.status(403).json({ error: 'Request origin is not allowed.' });
    const token = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Sign in again before saving this asset.' });
    if (Object.keys(req.query).length || !req.body || Object.keys(req.body).length !== 1 || typeof req.body.symbol !== 'string') {
      return res.status(400).json({ error: 'Provide only an asset symbol.' });
    }
    const symbol = req.body.symbol.trim().toUpperCase();
    if (!/^[A-Z0-9^][A-Z0-9.^=-]{0,31}$/.test(symbol)) return res.status(400).json({ error: 'The asset symbol is invalid.' });
    if (active >= 8) return res.status(429).json({ error: 'Asset validation is busy. Please retry shortly.' });
    active++;
    try {
      let user: string | null;
      try { user = await deps.verify(token); }
      catch { return res.status(503).json({ error: 'Account verification is unavailable. Your watchlist has not changed.' }); }
      if (!user) return res.status(401).json({ error: 'Your account could not be verified. Sign in again.' });
      if (deps.claim) {
        try {
          if (!await deps.claim(user)) return res.status(429).json({ error: 'Too many symbol validation attempts. Please retry in a minute.' });
        } catch { return res.status(503).json({ error: 'Asset validation is unavailable. Your watchlist has not changed.' }); }
      }
      const now = Date.now();
      for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
      const budget = attempts.get(user) ?? { count: 0, expires: now + 60000 };
      if (budget.count >= 10 || (!attempts.has(user) && attempts.size >= 1000)) {
        return res.status(429).json({ error: 'Too many symbol validation attempts. Please retry in a minute.' });
      }
      budget.count++; attempts.set(user, budget);
      try { await deps.validate(symbol); }
      catch { return res.status(502).json({ error: 'Yahoo could not validate this symbol. It may be unavailable or unsupported. Your watchlist has not changed.' }); }
      try { await deps.register(symbol); }
      catch { return res.status(502).json({ error: 'Asset registration was not confirmed. Your watchlist has not changed; please retry.' }); }
      return res.json({ symbol });
    } finally { active--; }
  });
  return router;
}

export function configuredAssetRouter(env: NodeJS.ProcessEnv) {
  const config = serverSupabase(env);
  if (!config) return assetRouter(null, null);
  const { client, origin } = config;
  return assetRouter({
    claim: async verifiedUser => {
      const {data,error} = await client.rpc('claim_asset_registration', { verified_user: verifiedUser });
      if (error || typeof data !== 'boolean') throw Error('Registration budget unavailable');
      return data;
    },
    verify: async token => {
      const { data, error } = await client.auth.getUser(token);
      if (error && (!error.status || error.status >= 500)) throw error;
      return error ? null : data.user?.id ?? null;
    },
    validate: validateAsset,
    register: async symbol => {
      // INSERT ... ON CONFLICT DO NOTHING supports retries/races, without UPDATE privileges.
      const { error } = await client.from('assets').upsert({ symbol }, { onConflict: 'symbol', ignoreDuplicates: true });
      if (error) throw error;
    },
  }, origin);
}
