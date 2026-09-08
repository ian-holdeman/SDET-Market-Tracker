import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseRecordings, type Recording } from '../src/components/the-tests/showcase';
import { scenarios } from './showcase-scenarios.mjs';

const hash = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const directory = path.resolve(JSON.parse(readFileSync('.telemetry/showcase/latest.json', 'utf8')).directory);
if (!directory.startsWith(path.resolve('.telemetry/showcase') + path.sep)) throw Error('Invalid private capture directory');
const prepared = path.join(directory, 'prepared');
const report = JSON.parse(readFileSync(path.join(directory, 'capture.json'), 'utf8'));
if (report.version !== 1 || report.outcome !== 'passed' || !Array.isArray(report.attempts)) throw Error('Capture did not complete successfully. Inspect its private results.');
const fingerprint = createHash('sha256').update(JSON.stringify(report.sourceFiles)).digest('hex');
if (fingerprint !== report.sourceDigest) throw Error('Source fingerprint mismatch');

if (process.argv.includes('--reviewed')) {
  // This explicit local promotion happens only after viewing the clips and posters.
  const manifest = JSON.parse(readFileSync(path.join(prepared, 'manifest.json'), 'utf8'));
  const recordings = parseRecordings(manifest);
  if (recordings.length !== 4) throw Error('Expected all four selected recordings');
  const checksums = JSON.parse(readFileSync(path.join(prepared, 'checksums.json'), 'utf8'));
  const publicDirectory = path.resolve('public/recordings');
  mkdirSync(publicDirectory, { recursive: true });
  for (const recording of recordings) {
    for (const url of [recording.src, recording.poster]) {
      const name = path.basename(url), source = path.join(prepared, name);
      if (hash(source) !== checksums[name] || (url === recording.src && hash(source) !== recording.sha256)) throw Error('Reviewed asset has changed');
      copyFileSync(source, path.join(publicDirectory, name));
    }
  }
  writeFileSync(path.join(publicDirectory, 'manifest.json'), JSON.stringify({ version: 1, recordings }, null, 2) + '\n');
  console.log('Promoted four reviewed recordings to local public assets. No remote publication performed.');
} else {
  const ffmpeg = process.env.SHOWCASE_FFMPEG;
  if (!ffmpeg) throw Error('Set SHOWCASE_FFMPEG to an FFmpeg executable with libx264.');
  mkdirSync(prepared, { recursive: true });
  const recordings: Recording[] = [];
  for (const scenario of scenarios) {
    const attempts = report.attempts.filter((a: any) => a.id === scenario.id);
    const last = attempts.at(-1);
    if (!last || last.title !== scenario.title || last.file !== scenario.file || last.project !== scenario.project || !last.video) throw Error('Missing or mismatched scenario recording');
    const video = path.resolve(last.video);
    if (!video.startsWith(path.join(directory, 'videos') + path.sep) || hash(video) !== last.videoSha256) throw Error('Invalid recording path or checksum');
    const info = spawnSync(ffmpeg, ['-hide_banner', '-i', video], { encoding: 'utf8', windowsHide: true });
    const duration = info.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!duration || /Audio:/.test(info.stderr)) throw Error('Expected a silent recording with a known duration');
    const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]);
    const encoded = path.join(directory, `${scenario.id}.mp4`);
    const encode = spawnSync(ffmpeg, ['-y', '-i', video, '-c:v', 'libx264', '-crf', '22', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', encoded], { encoding: 'utf8', windowsHide: true });
    if (encode.status !== 0) throw Error('MP4 encoding requires FFmpeg with libx264: ' + encode.stderr);
    if (statSync(encoded).size > 8 * 1024 * 1024) throw Error('Encoded recording exceeds the public 8 MiB limit');
    const mediaHash = hash(encoded);
    const base = `${scenario.id}-${mediaHash.slice(0, 12)}`;
    copyFileSync(encoded, path.join(prepared, `${base}.mp4`));
    const poster = spawnSync(ffmpeg, ['-y', '-ss', String(Math.min(seconds / 2, 2)), '-i', video, '-frames:v', '1', path.join(prepared, `${base}.png`)], { encoding: 'utf8', windowsHide: true });
    if (poster.status !== 0) throw Error('Poster generation failed: ' + poster.stderr);
    const review = path.join(directory, 'review', scenario.id);
    mkdirSync(review, { recursive: true });
    const frames = spawnSync(ffmpeg, ['-y', '-i', video, '-r', '5', path.join(review, '%04d.png')], { encoding: 'utf8', windowsHide: true });
    if (frames.status !== 0) throw Error('Review frame generation failed');
    recordings.push({ id: scenario.id, src: `/recordings/${base}.mp4`, poster: `/recordings/${base}.png`,
      sha256: mediaHash, originalSha256: last.videoSha256, testTitle: scenario.title, sourceFile: scenario.file,
      sourceFileSha256: report.sourceFiles[scenario.file], commit: report.commit, sourceDigest: report.sourceDigest,
      workingTreeModified: report.workingTreeModified, capturedAt: last.startedAt,
      browser: scenario.project === 'mobile-webkit' ? 'WebKit · iPhone 13 emulation · Windows' : 'Chromium · Windows',
      viewport: scenario.project === 'mobile-webkit' ? '390 × 664' : '1440 × 900',
      node: report.node, playwright: report.playwright,
      outcome: last.status === 'passed' ? (attempts.length === 2 ? 'flaky' : 'passed') : 'failed',
      durationMs: last.durationMs, videoDurationSeconds: seconds,
      attempts: attempts.map((a: any) => ({ retry: a.retry, status: a.status, durationMs: a.durationMs })),
    });
  }
  const manifest = { version: 1, recordings: parseRecordings({ version: 1, recordings }) };
  writeFileSync(path.join(prepared, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const checksums = Object.fromEntries(readdirSync(prepared).filter(name => /\.(mp4|png)$/.test(name)).map(name => [name, hash(path.join(prepared, name))]));
  writeFileSync(path.join(prepared, 'checksums.json'), JSON.stringify(checksums, null, 2));
  console.log(`Prepared private assets in ${prepared}. Review full clips and posters before --reviewed.`);
}
