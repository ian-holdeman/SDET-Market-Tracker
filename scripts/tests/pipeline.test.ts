import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePipeline, pipelineWindow, jobAt, advanceReplay, selectedPipeline } from '../../src/telemetry/pipeline';
import { fetchPipeline } from '../../server/test-pipeline';

const now = Date.parse('2026-09-08T12:00:00Z');
const config = { repository: 'ian-holdeman/SDET-Market-Tracker', branch: 'main', token: 'fixture-only' };
function raw() {
  const run = { id: selectedPipeline.runId, run_number: selectedPipeline.number, run_attempt: 1, workflow_id: 348891072,
    path: '.github/workflows/playwright.yml', head_branch: 'main', head_sha: String(selectedPipeline.commit),
    repository: { full_name: config.repository }, head_repository: { full_name: config.repository },
    event: 'push', status: 'completed', conclusion: 'success', run_started_at: '2026-09-08T10:07:17Z' };
  const jobs = { total_count: 2, jobs: [
    { id: 102020492164, name: 'test', run_id: run.id, run_attempt: 1, head_sha: run.head_sha, status: 'completed', conclusion: 'success', started_at: '2026-09-08T10:07:20Z', completed_at: '2026-09-08T10:11:52Z' },
    { id: 102020491840, name: 'database', run_id: run.id, run_attempt: 1, head_sha: run.head_sha, status: 'completed', conclusion: 'success', started_at: '2026-09-08T10:07:19Z', completed_at: '2026-09-08T10:09:02Z' },
  ] };
  return { run, jobs };
}
async function fixture(patch?: (data: ReturnType<typeof raw>) => void) {
  const data = raw(); patch?.(data);
  const request: typeof fetch = async (url, options) => {
    assert.equal(options?.redirect, 'error');
    assert.equal((options?.headers as Record<string,string>).Authorization, 'Bearer fixture-only');
    assert.ok(options?.signal);
    return Response.json(String(url).includes('/jobs?') ? data.jobs : data.run);
  };
  return fetchPipeline(config, request, () => now);
}
test('job times normalize and overlapping wall time is not the sum of durations', async () => {
  const data = await fixture();
  const window = pipelineWindow(data.jobs);
  assert.equal(window.durationMs, 273000);
  assert.equal(window.overlapMs, 102000);
  assert.equal(data.jobs[0].startedAt, '2026-09-08T10:07:20.000Z');
  assert.equal(jobAt(data.jobs[0], window.start + 999), 'Not started');
  assert.equal(jobAt(data.jobs[0], window.start + 1000), 'In progress');
  assert.equal(jobAt(data.jobs[0], window.end), 'Succeeded');
  assert.equal(advanceReplay(2000, 500, 20, 10000), 10000);
  assert.equal(advanceReplay(2000, -500, 20, 10000), 2000);
  const sequential = structuredClone(data.jobs); sequential[1].completedAt = sequential[0].startedAt;
  assert.equal(pipelineWindow(sequential).overlapMs, 0);
  const zero = structuredClone(data.jobs); zero[1].completedAt = zero[1].startedAt;
  assert.equal(pipelineWindow(zero).overlapMs, 0);
});
test('source validation rejects foreign, mismatched, missing, failed and impossible evidence', async () => {
  const mutations: ((d: ReturnType<typeof raw>) => void)[] = [
    d => { d.run.head_repository.full_name = 'fork/repo'; }, d => { d.run.repository.full_name = 'fork/repo'; },
    d => { d.run.run_attempt = 2; }, d => { d.run.workflow_id++; }, d => { d.run.path = 'other.yml'; },
    d => { d.run.event = 'pull_request'; }, d => { d.run.head_branch = 'other'; }, d => { d.run.head_sha = 'b'.repeat(40); },
    d => { d.run.event = 'schedule'; }, // Nightly support must not broaden the selected historical source.
    d => { d.run.conclusion = 'failure'; }, d => { d.jobs.jobs.pop(); }, d => { d.jobs.total_count = 3; },
    d => { d.jobs.jobs[1] = d.jobs.jobs[0]; }, d => { d.jobs.jobs[0].run_attempt = 2; },
    d => { d.jobs.jobs[0].head_sha = 'b'.repeat(40); }, d => { d.jobs.jobs[0].conclusion = 'skipped'; },
    d => { d.jobs.jobs[0].started_at = ''; }, d => { d.jobs.jobs[0].completed_at = '2026-09-08T10:00:00Z'; },
    d => { d.jobs.jobs[0].started_at = '2026-02-30T10:00:00Z'; },
  ];
  for (const mutate of mutations) await assert.rejects(fixture(mutate));
  const data = await fixture();
  assert.throws(() => validatePipeline(data, now + 60000));
  assert.throws(() => validatePipeline({...data, url:'https://evil.invalid'}, now));
  assert.throws(() => validatePipeline({...data, expiresAt:'2099-01-01T00:00:00Z'}, now));
  const clean = validatePipeline({...data, token:'secret', jobs:data.jobs.map(j=>({...j, logs:'private'}))}, now);
  assert.equal(JSON.stringify(clean).includes('secret'), false);
  assert.equal(JSON.stringify(clean).includes('private'), false);
});
test('GitHub errors and oversized responses cannot produce a demonstration', async () => {
  for (const status of [403,404,410,429,500]) await assert.rejects(fetchPipeline(config, async()=>new Response('',{status}), ()=>now));
  await assert.rejects(fetchPipeline(config, async()=>new Response('x'.repeat(300001)), ()=>now));
  await assert.rejects(fetchPipeline({...config,repository:'other/repo'}, async()=>{throw Error('must not fetch');}, ()=>now));
});
test('browser completions use actual attempts, preserve retry outcomes and reject mismatched timing',async()=>{
  const {pipelineBrowserEvidence}=await import('../../src/tests/fixtures/pipeline');
  const {browserResultsAt}=await import('../../src/telemetry/pipeline');
  const data=await fixture(), report=pipelineBrowserEvidence();
  const parsed=validatePipeline({...data,browserEvidence:report},now);
  const start=Date.parse(report.startedAt);
  assert.equal(browserResultsAt(parsed,start+999).length,0);
  assert.equal(browserResultsAt(parsed,start+1000).length,1);
  assert.equal(browserResultsAt(parsed,start+61000).length,7);
  assert.equal(browserResultsAt(parsed,start).length,0);
  report.tests[0].attempts[0].status='failed';
  report.tests[0].attempts.push({retry:1,status:'passed',durationMs:0,startedAt:new Date(start+2000).toISOString()});
  assert.equal(browserResultsAt(validatePipeline({...data,browserEvidence:report},now),start+2000)[0].outcome,'flaky');
  for(const patch of [{runAttempt:2},{environment:'local'},{completedAt:'2026-09-08T11:00:00Z'}]) {
    assert.equal(validatePipeline({...data,browserEvidence:{...report,...patch}},now).browserEvidence,null);
  }
  report.tests[0].attempts[1].durationMs=999999;
  assert.equal(validatePipeline({...data,browserEvidence:report},now).browserEvidence,null);
});

test('pipeline reads only the selected sanitized artifact and never forwards credentials to storage',async()=>{
  const {zipSync,strToU8}=await import('fflate');
  const {pipelineBrowserEvidence}=await import('../../src/tests/fixtures/pipeline');
  const source=raw(), report=pipelineBrowserEvidence();let expired=false, downloaded=0;
  const request:typeof fetch=async(url,options)=>{
    const path=String(url);
    if(path.startsWith('https://fixture.blob.core.windows.net/')) {
      downloaded++;assert.equal(options?.headers,undefined);assert.equal(options?.redirect,'error');
      return new Response(zipSync({'telemetry.json':strToU8(JSON.stringify({...report,stdout:'private',tests:report.tests.map(t=>({...t,errors:['private']}))}))}));
    }
    assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer fixture-only');
    if(path.includes('/artifacts?'))return Response.json({artifacts:[{id:123,name:`test-evidence-v1-${selectedPipeline.runId}-1`,expired,size_in_bytes:1000,workflow_run:{id:selectedPipeline.runId,head_sha:selectedPipeline.commit,head_branch:'main'}}]});
    if(path.endsWith('/zip'))return new Response(null,{status:302,headers:{location:'https://fixture.blob.core.windows.net/report'}});
    return Response.json(path.includes('/jobs?')?source.jobs:source.run);
  };
  const data=await fetchPipeline(config,request,()=>now);
  assert.equal(data.browserEvidence?.tests.length,7);assert.equal(JSON.stringify(data).includes('private'),false);
  expired=true;
  const missing=await fetchPipeline(config,request,()=>now);
  assert.equal(missing.browserEvidence,null);assert.equal(missing.jobs.length,2);assert.equal(downloaded,1);
});
