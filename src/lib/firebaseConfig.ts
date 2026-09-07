type Environment = Record<string, string | undefined>;

/** Shared by the browser and telemetry CLI; never includes values in errors. */
export function readFirebaseConfig(env: Environment) {
  const value = (name: string) => env[`VITE_FIREBASE_${name}`]?.trim();
  const missing = ['API_KEY', 'PROJECT_ID', 'APP_ID'].filter((name) => {
    const entry = value(name);
    return !entry || /^(YOUR_|MY_|dummy-)/i.test(entry);
  });
  if (missing.length) {
    throw new Error(`Firebase is not configured. Set ${missing.map((name) => `VITE_FIREBASE_${name}`).join(', ')} in .env.local (see .env.example), then restart development or rebuild for production. Accounts and test history are unavailable until configured.`);
  }
  return {
    config: {
      apiKey: value('API_KEY'), projectId: value('PROJECT_ID'), appId: value('APP_ID'),
      authDomain: value('AUTH_DOMAIN'), storageBucket: value('STORAGE_BUCKET'),
      messagingSenderId: value('MESSAGING_SENDER_ID'),
    },
    databaseId: value('DATABASE_ID') || '(default)',
  };
}
