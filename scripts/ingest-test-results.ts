import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, terminate } from 'firebase/firestore';
import { readFirebaseConfig } from '../src/lib/firebaseConfig';
import { summarizeReport } from './test-report';

config({ path: ['.env.local', '.env'], quiet: true });

async function ingest() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--write')) throw new Error('Usage: npm run test:e2e:ingest -- [--write]');
  const report = summarizeReport(JSON.parse(await readFile('test-results/results.json', 'utf8')));
  const payload = {
    ...report,
    runId: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_RUN_ID}_${process.env.GITHUB_RUN_ATTEMPT || '1'}`
      : `run_${randomUUID()}`,
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || 'local',
    commitSha: process.env.GITHUB_SHA?.slice(0, 7) || 'local',
    commitMessage: process.env.GITHUB_COMMIT_MESSAGE || 'Playwright validation run',
    environment: process.env.CI ? 'github-actions' : 'local',
    createdAt: new Date().toISOString(),
  };
  if (!args.includes('--write')) {
    console.log(`Validated report: ${report.status}, ${report.totalTests} tests. Dry run; no Firebase connection or write. Use --write to publish intentionally.`);
    return;
  }
  const { config: firebaseConfig, databaseId } = readFirebaseConfig(process.env);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, databaseId);
  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      setDoc(doc(db, 'test_runs', payload.runId), payload),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Telemetry write timed out; remote outcome is unknown.')), 15000);
      }),
    ]);
    console.log(`Published test run ${payload.runId}: ${payload.status}`);
  } finally {
    clearTimeout(timer!);
    await terminate(db);
    await deleteApp(app);
  }
}

ingest().catch((error) => {
  console.error(`Telemetry ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
