import { selectedPipeline, pipelineUrl } from '../../telemetry/pipeline';
// Deterministic presentation fixture. Never published or used by the application server.
export function pipelineFixture(now=Date.now()) {
  return {version:1,...selectedPipeline,url:pipelineUrl,startedAt:'2026-09-08T10:07:17.000Z',outcome:'success',
    checkedAt:new Date(now).toISOString(),expiresAt:new Date(now+60000).toISOString(),jobs:[
      {id:102020492164,name:'test',startedAt:'2026-09-08T10:07:20.000Z',completedAt:'2026-09-08T10:11:52.000Z',outcome:'success'},
      {id:102020491840,name:'database',startedAt:'2026-09-08T10:07:19.000Z',completedAt:'2026-09-08T10:09:02.000Z',outcome:'success'},
    ]};
}
import { evidence } from './testEvidence';
export function pipelineBrowserEvidence() {
  const report=evidence();
  Object.assign(report,{runId:String(selectedPipeline.runId),commitSha:selectedPipeline.commit,startedAt:'2026-09-08T10:09:00.000Z',completedAt:'2026-09-08T10:11:00.000Z',planned:7});
  report.tests=Array.from({length:7},(_,i)=>({...report.tests[0],id:`case-${i}`,name:`Watchlist ownership scenario ${i+1}`,project:i%2?'mobile-safari':'chromium-desktop',attempts:[{retry:0,status:'passed' as const,durationMs:1000,startedAt:new Date(Date.parse(report.startedAt)+i*10000).toISOString()}]}));
  return report;
}
