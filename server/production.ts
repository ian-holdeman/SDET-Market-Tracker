import { createECDH } from 'node:crypto';
import { readSupabaseConfig } from '../src/lib/supabaseConfig';
import { historyConfig } from './test-history';
import { selectedPipeline } from '../src/telemetry/pipeline';

export function productionConfig(env: NodeJS.ProcessEnv, build: unknown) {
  if (!env.K_SERVICE && env.APP_DEPLOYMENT !== 'cloud-run') return null;
  const fail = (): never => { throw Error('Production configuration is incomplete or inconsistent; check the private deployment configuration.'); };
  try {
    const publicConfig = readSupabaseConfig(env);
    const history = historyConfig(env);
    const origin = new URL(env.APP_ORIGIN || '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
        !/^[a-z0-9-]+\.supabase\.co$/.test(new URL(publicConfig.url).hostname) ||
        publicConfig.redirectUrl !== `${origin.origin}/auth/callback` || env.SUPABASE_URL !== publicConfig.url ||
        !/^sb_secret_[A-Za-z0-9_-]+$/.test(env.SUPABASE_SECRET_KEY || '') ||
        history?.repository !== selectedPipeline.repository || history?.branch !== selectedPipeline.branch) fail();
    // The deployment renderer pins these secrets, but runtime must also reject
    // incomplete revisions rather than serving a healthy app with delivery off.
    if (!env.ALERT_SCHEDULER_SECRET || env.ALERT_SCHEDULER_SECRET.length < 32 || /\s/.test(env.ALERT_SCHEDULER_SECRET) ||
        !/^[A-Za-z0-9_-]{87}$/.test(env.ALERT_VAPID_PUBLIC_KEY || '') ||
        !/^[A-Za-z0-9_-]{43}$/.test(env.ALERT_VAPID_PRIVATE_KEY || '') || env.ALERT_VAPID_SUBJECT !== origin.origin) fail();
    const deliveryKey = createECDH('prime256v1');
    deliveryKey.setPrivateKey(Buffer.from(env.ALERT_VAPID_PRIVATE_KEY!, 'base64url'));
    if (!deliveryKey.getPublicKey().equals(Buffer.from(env.ALERT_VAPID_PUBLIC_KEY!, 'base64url'))) fail();
    const manifest = build as { version?: number; publicConfig?: typeof publicConfig; releaseCommit?: string };
    if (manifest?.version !== 1 || !/^[a-f0-9]{40}$/.test(manifest.releaseCommit || '') ||
        !manifest.publicConfig || ['url','key','redirectUrl'].some(k => manifest.publicConfig![k] !== publicConfig[k])) fail();
    const buckets = [env.TEST_SNAPSHOT_BUCKET, env.TEST_ARCHIVE_BUCKET];
    if (buckets.some(b => !b || !/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(b)) || buckets[0] === buckets[1] || env.TEST_SNAPSHOT_DIRECTORY ||
        env.STORAGE_EMULATOR_HOST || env.GOOGLE_APPLICATION_CREDENTIALS) fail();
    return { origin: origin.origin, releaseCommit: manifest.releaseCommit! };
  } catch { return fail(); }
}
