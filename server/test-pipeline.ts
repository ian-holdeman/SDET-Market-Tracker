import { Router } from 'express';
import { readRunArtifact, type HistoryConfig } from './test-history';
import { validatePipeline, selectedPipeline, pipelineUrl, type Pipeline } from '../src/telemetry/pipeline';

async function boundedJson(response: Response) {
  if(!response.ok || !response.body)throw Error('Pipeline source unavailable');
  const reader=response.body.getReader(), chunks: Uint8Array[]=[]; let size=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>300000)throw Error('Pipeline response too large');chunks.push(value);}
  } finally {await reader.cancel();}
  const bytes=new Uint8Array(size); let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function fetchPipeline(config: HistoryConfig, request: typeof fetch=fetch, clock=Date.now): Promise<Pipeline> {
  const selected=selectedPipeline;
  if(config.repository!==selected.repository || config.branch!==selected.branch)throw Error('Pipeline source is not configured');
  const base=`https://api.github.com/repos/${selected.repository}/actions/runs/${selected.runId}/attempts/${selected.attempt}`;
  const signal=AbortSignal.timeout(10000);
  const options={headers:{Authorization:`Bearer ${config.token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},signal,redirect:'error' as const};
  const [run,listing]=await Promise.all([request(base,options).then(boundedJson),request(base+'/jobs?per_page=100',options).then(boundedJson)]);
  if(run.id!==selected.runId || run.run_attempt!==selected.attempt || run.run_number!==selected.number ||
    run.workflow_id!==selected.workflowId || run.path!==selected.workflow || run.head_branch!==selected.branch ||
    run.repository?.full_name!==selected.repository || run.head_repository?.full_name!==selected.repository ||
    run.head_sha!==selected.commit || !['push','workflow_dispatch'].includes(run.event) || run.status!=='completed' || run.conclusion!=='success' ||
    listing.total_count!==2 || !Array.isArray(listing.jobs) || listing.jobs.length!==2)throw Error('Invalid pipeline source');
  const jobs=listing.jobs.map((job: any)=>{
    if(job.run_id!==selected.runId || job.run_attempt!==selected.attempt || job.head_sha!==selected.commit || job.status!=='completed' || job.conclusion!=='success')throw Error('Mismatched pipeline job');
    return {id:job.id,name:job.name,startedAt:job.started_at,completedAt:job.completed_at,outcome:job.conclusion};
  });
  let browserEvidence=null;
  try {
    const artifacts=await request(`https://api.github.com/repos/${selected.repository}/actions/runs/${selected.runId}/artifacts?per_page=100`,options).then(boundedJson);
    if(!Array.isArray(artifacts.artifacts))throw Error('Invalid artifact listing');
    browserEvidence=(await readRunArtifact(config,{id:selected.runId,head_sha:selected.commit},selected.attempt,artifacts.artifacts,request,signal)).evidence;
  } catch { /* Job timing remains usable when the browser artifact is unavailable. */ }
  const now=clock();
  return validatePipeline({version:1,...selected,url:pipelineUrl,startedAt:run.run_started_at,outcome:run.conclusion,
    checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+60000).toISOString(),jobs,browserEvidence},now);
}
