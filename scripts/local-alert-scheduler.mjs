import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import { localSupabase } from './local-supabase.mjs';

/** Local tooling must never schedule against a hosted database or application. */
export function localAlertConfig(env) {
  if (env.K_SERVICE || env.APP_DEPLOYMENT === 'cloud-run' ||
      env.SUPABASE_URL !== 'http://127.0.0.1:54321' ||
      env.VITE_SUPABASE_URL !== 'http://127.0.0.1:54321') {
    throw Error('Local alerts require the local Supabase stack. Hosted targets are refused.');
  }
  const callback = new URL(env.VITE_AUTH_REDIRECT_URL);
  if (callback.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(callback.hostname) ||
      callback.username || callback.password || callback.port !== String(env.PORT || 3000)) {
    throw Error('Local alerts require a loopback app URL matching PORT.');
  }
  if (typeof env.ALERT_SCHEDULER_SECRET !== 'string' || env.ALERT_SCHEDULER_SECRET.length < 32) {
    throw Error('Run npm run alerts:setup:local, then restart npm run dev.');
  }
  return {url: callback.origin + '/api/alerts/evaluate', secret: env.ALERT_SCHEDULER_SECRET};
}

export const nextAlertDelay = (now) => 300000 - now % 300000;

export async function checkLocalAlerts(config, request = fetch, signal = new AbortController().signal) {
  const response = await request(config.url, {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + config.secret, 'Content-Type': 'application/json'},
    body: '{}',
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(28000)]),
  });
  if (!response.ok) throw Error(`Local alert evaluation returned HTTP ${response.status}.`);
  const result = await response.json();
  if (!result || !['checked', 'events', 'accepted'].every(key => Number.isSafeInteger(result[key]) && result[key] >= 0)) {
    throw Error('Local alert evaluation returned an invalid result.');
  }
  return {checked: result.checked, events: result.events, accepted: result.accepted};
}

async function main() {
  dotenv.config({path: ['.env.local', '.env'], quiet: true});
  const setup = process.argv.includes('--setup');
  const secret = process.env.ALERT_SCHEDULER_SECRET || (setup ? randomBytes(32).toString('base64url') : '');
  const config = localAlertConfig({...process.env, ALERT_SCHEDULER_SECRET: secret});
  // Verify actual Docker configuration too, without printing credentials or resetting data.
  const status = localSupabase();
  if (process.env.SUPABASE_SECRET_KEY !== status.SECRET_KEY) {
    throw Error('The configured server key does not match local Supabase. No changes made.');
  }
  if (setup) {
    let content = readFileSync('.env.local', 'utf8');
    const existing = dotenv.parse(content).ALERT_SCHEDULER_SECRET;
    if (existing && existing !== secret) throw Error('Local scheduler configuration differs from the environment. No changes made.');
    if (!existing) {
      content = content.replace(/^ALERT_SCHEDULER_SECRET=.*(?:\r?\n|$)/gm, '');
      writeFileSync('.env.local', content + '\nALERT_SCHEDULER_SECRET=' + secret + '\n', {encoding:'utf8',mode:0o600});
    }
    console.log('Local scheduler key configured without printing it. Restart npm run dev, then run npm run alerts:local.');
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    do {
      try {
        const result = await checkLocalAlerts(config, fetch, controller.signal);
        console.log(`${new Date().toISOString()} Local alerts: ${result.checked} assets checked, ${result.events} events, ${result.accepted} pushes accepted.`);
      } catch (error) {
        if (controller.signal.aborted) break;
        // Fetch exceptions can contain request details. Never log credentials or raw bodies.
        console.error(error instanceof Error && error.message.startsWith('Local alert evaluation')
          ? error.message : 'Local alert evaluation unavailable. Check the app and local Supabase.');
        if (process.argv.includes('--once')) { process.exitCode = 1; break; }
      }
      if (process.argv.includes('--once')) break;
      await delay(nextAlertDelay(Date.now()), undefined, {signal:controller.signal});
    } while (!controller.signal.aborted);
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Local alert setup failed. Verify local Supabase, loopback URLs and scheduler configuration.');
    process.exitCode = 1;
  });
}
