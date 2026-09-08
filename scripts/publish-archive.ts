import dotenv from 'dotenv';
import { PipelineArchive } from '../server/test-archive';
import { GoogleObjectStore } from '../server/object-store';
import { historyConfig } from '../server/test-history';
import { fetchPipeline } from '../server/test-pipeline';

// Owner/CI command only. No local evidence-file import and no public write endpoint.
dotenv.config({path:['.env.local','.env'],quiet:true});
const command = process.argv[2];
try {
  if (!['publish','revoke','restore'].includes(command) || process.argv.length !== 3) throw Error('Usage: npm run archive -- publish|revoke|restore');
  const config = historyConfig(process.env);
  if (!config || !process.env.TEST_ARCHIVE_BUCKET) throw Error('Archive publication configuration is required');
  const archive = new PipelineArchive(new GoogleObjectStore(process.env.TEST_ARCHIVE_BUCKET));
  if (command === 'revoke') {
    await archive.revoke();
    console.log('Archive selection revoked; retained object versions require deliberate owner cleanup.');
  } else {
    const verified = await fetchPipeline(config);
    await archive.publish(verified, command === 'restore');
    const stored = await archive.read();
    if (!stored) throw Error('Stored archive verification failed');
    console.log(JSON.stringify({run:stored.runId,attempt:stored.attempt,commit:stored.commit,publishedAt:stored.archivePublishedAt}));
  }
} catch {
  console.error('Archive operation failed; no successful publication or revocation is claimed. Inspect permissions and source evidence privately.');
  process.exitCode = 1;
}
