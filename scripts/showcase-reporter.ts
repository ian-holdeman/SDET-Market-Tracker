import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scenarios } from './showcase-scenarios.mjs';

export default class ShowcaseReporter implements Reporter {
  private attempts: object[] = [];
  onTestEnd(test: TestCase, result: TestResult) {
    const scenario = scenarios.find(s => s.title === test.title && s.project === test.parent.project()?.name);
    if (!scenario) throw Error('Unexpected showcase test');
    const video = result.attachments.find(a => a.contentType === 'video/webm')?.path;
    this.attempts.push({ ...scenario, retry: result.retry, status: result.status,
      startedAt: result.startTime.toISOString(), durationMs: result.duration,
      video: video ?? null,
      videoSha256: video ? createHash('sha256').update(readFileSync(video)).digest('hex') : null,
    });
  }
  onEnd(result: FullResult) {
    const directory = process.env.SHOWCASE_DIRECTORY!;
    const provenance = JSON.parse(readFileSync(`${directory}/source.json`, 'utf8'));
    writeFileSync(`${directory}/capture.json`, JSON.stringify({ version: 1, ...provenance,
      outcome: result.status, attempts: this.attempts }, null, 2) + '\n');
  }
}
