import type { ObjectStore } from './object-store';
import { createHash } from 'node:crypto';
import { selectedPipeline, validatePipeline, pipelineDate, type Pipeline } from '../src/telemetry/pipeline';
const MAX_BYTES = 1_100_000;
const scope = { repository: selectedPipeline.repository, branch: selectedPipeline.branch, workflow: selectedPipeline.workflow, workflowId: selectedPipeline.workflowId };
const scopeKey = createHash('sha256').update(JSON.stringify(scope)).digest('hex');
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
type Selection = typeof scope & {version: 1; status: 'active'|'revoked'; publishedAt: string; digest?: string};

/** Writer authority is bucket IAM plus the trusted publication command, never a public endpoint. */
export class PipelineArchive {
  readonly selectionName = `archives/${scopeKey}/selection.json`;
  constructor(private objects: ObjectStore, private clock = Date.now) {}
  private selection(bytes: Buffer): Selection {
    const raw = JSON.parse(bytes.toString('utf8'));
    if (raw.version !== 1 || Object.entries(scope).some(([k,v]) => raw[k] !== v) ||
        !['active','revoked'].includes(raw.status) ||
        (raw.status === 'active' && !/^[a-f0-9]{64}$/.test(raw.digest))) throw Error('Invalid archive selection');
    if (Date.parse(pipelineDate(raw.publishedAt)) > this.clock()) throw Error('Future archive publication');
    return raw;
  }
  private objectName(hash: string) { return `archives/${scopeKey}/objects/${hash}.json`; }
  async read(): Promise<Pipeline | null> {
    const head = await this.objects.read(this.selectionName, 4096);
    if (!head) return null;
    const selected = this.selection(head.bytes);
    if (selected.status === 'revoked') return null;
    const object = await this.objects.read(this.objectName(selected.digest!), MAX_BYTES);
    if (!object || digest(object.bytes) !== selected.digest) throw Error('Archive integrity failure');
    const envelope = JSON.parse(object.bytes.toString('utf8'));
    if (envelope.version !== 1 || envelope.publishedAt !== selected.publishedAt) throw Error('Archive envelope mismatch');
    const now = this.clock();
    // checkedAt/expiresAt here cover private archive availability, never GitHub freshness.
    const result = validatePipeline({ ...envelope.pipeline, source: 'archive', archivePublishedAt: envelope.publishedAt,
      checkedAt: new Date(now).toISOString(), expiresAt: new Date(now+60000).toISOString() }, now);
    if (result.jobs.some(job => Date.parse(job.completedAt) > Date.parse(envelope.publishedAt))) throw Error('Archive published before jobs completed');
    // A revocation/replacement concurrent with this read must not serve its old selection.
    const confirmed = await this.objects.read(this.selectionName, 4096);
    if (!confirmed || confirmed.generation !== head.generation) throw Error('Archive selection changed');
    return result;
  }
  async publish(raw: unknown, restoreRevoked = false): Promise<void> {
    const now = this.clock(), pipeline = validatePipeline(raw, now);
    if (pipeline.source || !pipeline.browserEvidence?.completedAt || !pipeline.browserEvidence.planned ||
        pipeline.browserEvidence.runnerStatus === 'incomplete') throw Error('Archive requires verified live case evidence');
    const before = await this.objects.read(this.selectionName, 4096);
    if (before && this.selection(before.bytes).status === 'revoked' && !restoreRevoked) throw Error('Explicit restore of revoked archive required');
    const publishedAt = new Date(now).toISOString();
    const bytes = Buffer.from(JSON.stringify({version:1,publishedAt,pipeline}));
    if (bytes.length > MAX_BYTES) throw Error('Archive too large');
    const hash = digest(bytes), name = this.objectName(hash);
    const existing = await this.objects.read(name, MAX_BYTES);
    if (!existing) await this.objects.put(name, bytes, '0');
    const stored = await this.objects.read(name, MAX_BYTES);
    if (!stored || !stored.bytes.equals(bytes)) throw Error('Archive replacement verification failed');
    await this.objects.put(this.selectionName, Buffer.from(JSON.stringify({version:1,...scope,status:'active',publishedAt,digest:hash})), before?.generation ?? '0');
  }
  async revoke(): Promise<void> {
    const before = await this.objects.read(this.selectionName, 4096);
    // Owner revocation needs only the generation; corrupt contents carry no authority.
    await this.objects.put(this.selectionName, Buffer.from(JSON.stringify({version:1,...scope,status:'revoked',publishedAt:new Date(this.clock()).toISOString()})), before?.generation ?? '0');
  }
}
