import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { ObjectStore } from './object-store';
import { nightlyScope, nightlyIdentity, compareNightly, type NightlyIdentity } from '../src/telemetry/nightlyPipeline';

const maximum = 4096;
/** One selection marker, never an evidence publisher. CAS is captured before discovery. */
export class NightlyGuard {
  readonly name = 'snapshots/nightly-' + createHash('sha256').update(JSON.stringify(nightlyScope)).digest('hex') + '.json';
  constructor(private readonly objects: ObjectStore) {}
  async begin() {
    const stored = await this.objects.read(this.name, maximum);
    let highest: NightlyIdentity | null = null;
    if (stored) {
      const raw = JSON.parse(stored.bytes.toString('utf8'));
      if (raw.version !== 1 || Object.entries(nightlyScope).some(([k, v]) => raw.scope?.[k] !== v)) throw Error('Corrupt nightly continuity');
      highest = nightlyIdentity(raw.highest);
    }
    return { highest, save: async (raw: NightlyIdentity) => {
      const next = nightlyIdentity(raw);
      if (highest && compareNightly(next, highest) < 0) throw Error('Nightly rollback');
      const bytes = Buffer.from(JSON.stringify({ version: 1, scope: nightlyScope, highest: next }));
      await this.objects.put(this.name, bytes, stored?.generation ?? '0');
    } };
  }
}
/** Single-process local equivalent of the private conditional object store. */
export class LocalNightlyObjects implements ObjectStore {
  private writes = Promise.resolve();
  constructor(private readonly directory: string) {}
  private file(name: string) { return path.join(this.directory, createHash('sha256').update(name).digest('hex') + '.nightly.json'); }
  async read(name: string, maximumBytes: number) {
    let file;
    try { file = await open(this.file(name), 'r'); }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
    try {
      if ((await file.stat()).size > maximumBytes) throw Error('Nightly marker exceeds limit');
      const bytes = await file.readFile();
      if (bytes.length > maximumBytes) throw Error('Nightly marker exceeds limit');
      return { bytes, generation: createHash('sha256').update(bytes).digest('hex') };
    } finally { await file.close(); }
  }
  put(name: string, bytes: Buffer, expectedGeneration: string) {
    const write = async () => {
      const previous = await this.read(name, maximum);
      if ((previous?.generation ?? '0') !== expectedGeneration) throw Error('Nightly write precondition failed');
      await mkdir(this.directory, { recursive: true });
      const destination = this.file(name), temporary = destination + '.' + randomUUID() + '.tmp';
      try {
        const file = await open(temporary, 'wx', 0o600);
        try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
        await rename(temporary, destination);
      } finally { await unlink(temporary).catch(() => {}); }
    };
    this.writes = this.writes.catch(() => {}).then(write);
    return this.writes;
  }
}
