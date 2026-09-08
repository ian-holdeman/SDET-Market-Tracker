import {validateEvidence,testOutcome,type Evidence} from './contract';
// Curated source identity, not a cached result. Changing the featured run is a reviewed code change.
export const selectedPipeline = {
  repository: 'ian-holdeman/SDET-Market-Tracker', branch: 'main', workflow: '.github/workflows/playwright.yml',
  workflowId: 348891072, runId: 34259098175, attempt: 1, number: 30,
  commit: '7b3b9f6049cb809f5fffa96c1ac8054fb89c1b18',
} as const;
export const pipelineUrl = `https://github.com/${selectedPipeline.repository}/actions/runs/${selectedPipeline.runId}/attempts/${selectedPipeline.attempt}`;
export type PipelineJob = { id: number; name: 'test' | 'database'; startedAt: string; completedAt: string; outcome: 'success' };
export type Pipeline = { version: 1; runId: number; attempt: number; number: number; repository: string; branch: string;
  workflow: string; workflowId: number; commit: string; url: string; startedAt: string; outcome: 'success';
  checkedAt: string; expiresAt: string; jobs: PipelineJob[]; browserEvidence?: Evidence|null;
  source?: 'archive'; archivePublishedAt?: string };
export function pipelineDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) throw Error('Invalid pipeline timestamp');
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw Error('Invalid pipeline timestamp');
  const normalized = new Date(time).toISOString();
  if (normalized !== value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z')) throw Error('Invalid calendar date');
  return normalized;
}
export function validatePipeline(raw: unknown, now = Date.now()): Pipeline {
  if (!raw || typeof raw !== 'object') throw Error('Invalid pipeline');
  const r = raw as Pipeline;
  const archived = r.source === 'archive';
  const identity = archived ? { ...selectedPipeline, runId: r.runId, attempt: r.attempt, number: r.number, commit: r.commit } : selectedPipeline;
  if ((r.source !== undefined && !archived) || ![identity.runId,identity.attempt,identity.number].every(v=>Number.isSafeInteger(v)&&v>0) || !/^[a-f0-9]{40}$/.test(identity.commit) ||
    r.version !== 1 || Object.entries(identity).some(([key,value]) => r[key as keyof Pipeline] !== value) ||
    r.url !== `https://github.com/${identity.repository}/actions/runs/${identity.runId}/attempts/${identity.attempt}` || r.outcome !== 'success' || !Array.isArray(r.jobs) || r.jobs.length !== 2) throw Error('Untrusted pipeline');
  const checkedAt=pipelineDate(r.checkedAt), expiresAt=pipelineDate(r.expiresAt), startedAt=pipelineDate(r.startedAt);
  const checked=Date.parse(checkedAt), expires=Date.parse(expiresAt), start=Date.parse(startedAt);
  if (checked > now + 5000 || expires <= now || expires <= checked || expires - checked > 60000 || start > checked) throw Error('Expired or invalid pipeline verification');
  const archivePublishedAt = archived ? pipelineDate(r.archivePublishedAt) : undefined;
  if (archivePublishedAt && (Date.parse(archivePublishedAt) > checked || Date.parse(archivePublishedAt) < start)) throw Error('Invalid archive publication time');
  const jobs: PipelineJob[] = r.jobs.map(j=> {
    if (!j || !['test','database'].includes(j.name) || !Number.isSafeInteger(j.id) || j.id <= 0 || j.outcome !== 'success') throw Error('Invalid job');
    const startedAt=pipelineDate(j.startedAt), completedAt=pipelineDate(j.completedAt);
    const begin=Date.parse(startedAt), end=Date.parse(completedAt);
    if (begin < start || end < begin || end > checked || end - start > 86400000) throw Error('Invalid job interval');
    return {id:j.id,name:j.name,startedAt,completedAt,outcome:j.outcome};
  });
  if(new Set(jobs.map(j=>j.name)).size!==2 || new Set(jobs.map(j=>j.id)).size!==2)throw Error('Duplicate job');
  jobs.sort((a,b)=>a.name==='test'?-1:b.name==='test'?1:0);
  let browserEvidence: Evidence|null=null;
  try {
    if(r.browserEvidence) {
      const e=validateEvidence(r.browserEvidence), job=jobs.find(j=>j.name==='test')!;
      const begin=Date.parse(pipelineDate(e.startedAt)), end=Date.parse(pipelineDate(e.completedAt));
      if(e.environment!=='github-actions' || e.runId!==String(identity.runId) || e.runAttempt!==identity.attempt || e.commitSha!==identity.commit || begin<Date.parse(job.startedAt) || end>Date.parse(job.completedAt))throw Error();
      for(const t of e.tests)for(const a of t.attempts) {
        const start=Date.parse(pipelineDate(a.startedAt));
        if(start<begin || start+a.durationMs>end)throw Error();
      }
      browserEvidence=e;
    }
  } catch { /* Unusable case evidence must not imply successful cases or hide valid job timing. */ }
  if (archived && !browserEvidence) throw Error('Archive has no valid case evidence');
  return {version:1,...identity,url:r.url,startedAt,outcome:'success',checkedAt,expiresAt,jobs,browserEvidence,
    ...(archived ? {source:'archive' as const,archivePublishedAt} : {})};
}
export function pipelineWindow(jobs: PipelineJob[]) {
  const start=Math.min(...jobs.map(j=>Date.parse(j.startedAt))), end=Math.max(...jobs.map(j=>Date.parse(j.completedAt)));
  const overlapMs=Math.max(0,Math.min(...jobs.map(j=>Date.parse(j.completedAt)))-Math.max(...jobs.map(j=>Date.parse(j.startedAt))));
  return {start,end,durationMs:end-start,overlapMs};
}
export function jobAt(job: PipelineJob, time: number) {
  return time < Date.parse(job.startedAt) ? 'Not started' : time < Date.parse(job.completedAt) ? 'In progress' : 'Succeeded';
}
export function advanceReplay(elapsed: number, delta: number, speed: number, duration: number) {
  return Math.min(duration,elapsed + Math.max(0,delta)*speed);
}

export function browserResultsAt(data: Pipeline,time:number) {
  return (data.browserEvidence?.tests ?? []).flatMap(test=>{
    const last=test.attempts.at(-1);
    if(!last)return [];
    const completedAt=Date.parse(last.startedAt)+last.durationMs;
    return completedAt<=time?[{...test,completedAt,outcome:testOutcome(test)}]:[];
  }).sort((a,b)=>a.completedAt-b.completedAt || a.id.localeCompare(b.id));
}
