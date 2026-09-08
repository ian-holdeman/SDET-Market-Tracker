import React, { useEffect, useState } from 'react';
import { ChartNoAxesGantt, Play, Pause, ArrowUpRight } from 'lucide-react';
import { usePipeline } from '../../services/pipelineService';
import { advanceReplay, jobAt, pipelineWindow, type Pipeline } from '../../telemetry/pipeline';
import { BrowserResults } from './BrowserResults';
import { durationLabel } from '../../telemetry/presentation';

const control='inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-900 px-3 py-2 text-sm font-semibold text-ink-strong hover:bg-surface-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-positive disabled:opacity-50 disabled:cursor-not-allowed';
const labels={test:'Browser & offline',database:'Database & Auth'};
const descriptions={test:'Build, offline checks, and headless browser tests.',database:'Local Supabase containers, database checks, and Auth integration.'};
function Replay({data}:{data:Pipeline}) {
  const window=pipelineWindow(data.jobs), duration=window.durationMs;
  const [elapsed,setElapsed]=useState(duration),[playing,setPlaying]=useState(false),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};
    media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    if(!playing || reduced)return;
    let previous=performance.now();
    const interval=setInterval(()=>{const now=performance.now();const delta=now-previous;previous=now;setElapsed(value=>advanceReplay(value,delta,20,duration));},100);
    const hide=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',hide);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',hide);};
  },[playing,reduced,duration]);
  useEffect(()=>{if(elapsed>=duration)setPlaying(false);},[elapsed,duration]);
  const percentage=(time:number)=>duration?time/duration*100:0;
  const finished=elapsed>=duration;
  const toggle=()=>{if(finished)setElapsed(0);setPlaying(!playing);};
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <p>{data.source === 'archive' ? 'Archived historical run' : 'Historical run'} #{data.number} · {new Date(data.startedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})} (UTC)</p>
      <a className="inline-flex items-center gap-1 text-positive-ink-400 hover:underline focus-visible:outline-focus-positive" href={data.url} target="_blank" rel="noreferrer">View run #{data.number} on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
    </div>
    <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
      <p><span className="text-xl sm:text-2xl font-bold tabular-nums text-ink-heading">{durationLabel(duration)}</span> <span className="text-ink-muted">job window</span></p>
      <p><span className="text-xl sm:text-2xl font-bold tabular-nums text-positive-ink-400">{durationLabel(window.overlapMs)}</span> <span className="text-ink-muted">overlap</span></p>
    </div>
    <div className="space-y-5" aria-label="Parallel job timeline">
      {data.jobs.map(job=>{
        const offset=Date.parse(job.startedAt)-window.start, length=Date.parse(job.completedAt)-Date.parse(job.startedAt);
        const progress=length?Math.max(0,Math.min(1,(elapsed-offset)/length))*100:100;
        const state=jobAt(job,window.start+elapsed);
        return <div key={job.name} data-testid={`pipeline-job-${job.name}`} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <h3 className="font-semibold text-ink-strong">{labels[job.name]}</h3>
            <p className="text-xs text-ink-muted"><span className="text-sm font-semibold tabular-nums text-ink-strong">{durationLabel(length)}</span> <span aria-hidden="true">·</span> <span className={state==='Succeeded'?'text-positive-ink-400':'text-ink-secondary'}>{state}</span></p>
          </div>
          <div className="relative h-8 overflow-hidden rounded-lg bg-surface-950 border border-line" aria-hidden="true">
            <div className="absolute inset-y-0 rounded bg-positive-400/15 border border-positive-400/30" style={{left:`${percentage(offset)}%`,width:`${percentage(length)}%`,minWidth:length===0?'2px':undefined}}>
              <div className="h-full rounded bg-positive-400/70" style={{width:`${progress}%`}} />
            </div>
            {!reduced && <div className="absolute inset-y-0 w-px bg-white/80" style={{left:`${Math.min(99.8,percentage(elapsed))}%`}} />}
          </div>
          <p className="sr-only">Starts +{durationLabel(offset)} · ends +{durationLabel(offset+length)}</p>
        </div>;
      })}
      <div className="flex justify-between text-xs tabular-nums text-ink-subtle" aria-hidden="true"><span>0s</span><span>{durationLabel(duration/2)}</span><span>{durationLabel(duration)}</span></div>
    </div>
    <div className="border-t border-line pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button className={control} disabled={reduced || duration===0} onClick={toggle} aria-label={playing?'Pause replay':finished?'Replay timeline':'Resume replay'}>{playing?<Pause className="h-4 w-4" aria-hidden="true" />:<Play className="h-4 w-4" aria-hidden="true" />}{playing?'Pause':finished?'Replay':'Resume'}</button>
        </div>
        <p className="text-xs text-ink-muted">20× replay</p>
      </div>
      <label className="block text-xs text-ink-muted">Replay position <span className="float-right tabular-nums">{durationLabel(elapsed)} / {durationLabel(duration)}</span>
        <input className="mt-2 block w-full h-6 accent-positive-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-positive" type="range" min="0" max={duration} step="1" value={elapsed} aria-label="Replay position" aria-valuetext={`${durationLabel(elapsed)} of ${durationLabel(duration)}`} onChange={e=>{setPlaying(false);setElapsed(Number(e.target.value));}} />
      </label>
      <p role="status" className={reduced ? "text-xs text-ink-muted" : "sr-only"}>{reduced?'Reduced motion: use the slider to explore.':playing?'Replaying recorded job timing.':finished?'Completed overview. Replay does not run CI.':'Replay paused. No jobs are running here.'}</p>
    </div>
    <BrowserResults data={data} time={window.start+elapsed}/>
    <details className="text-sm text-ink-muted">
      <summary className="cursor-pointer w-fit text-ink-secondary focus-visible:outline-focus-positive">About this pipeline</summary>
      <div className="mt-3 space-y-3 text-xs leading-relaxed">
        <p><strong className="text-ink-secondary">Browser & offline:</strong> {descriptions.test} Runs directly on a GitHub Ubuntu runner.</p>
        <p><strong className="text-ink-secondary">Database & Auth:</strong> {descriptions.database} Runs on a separate GitHub Ubuntu runner.</p>
        <p>GitHub attempt {data.attempt}. Durations include setup and cleanup; job success does not mean every step ran. Current results are in the dashboard above.</p>
        <p>Browser results use sanitized case evidence and actual completion times. Offline, database, and Auth checks are represented by job summaries. Provider calls in browser tests are mocked.</p><p>{data.source === 'archive' ? 'Independently retained historical evidence. Archive availability is rechecked every minute; this does not verify current CI or production correctness.' : 'Historical replay only. Source availability is rechecked every minute.'}</p>
      </div>
    </details>
  </>;
}
export function PipelineTimeline() {
  const {data,loading,retry}=usePipeline();
  return <section data-testid="pipeline-timeline" aria-labelledby="pipeline-heading" className="rounded-xl border border-line bg-evidence-surface p-5 sm:p-7 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-x-3"><h2 id="pipeline-heading" className="text-lg font-bold text-ink-heading flex items-center gap-2.5"><ChartNoAxesGantt className="h-5 w-5 text-positive-ink-400 shrink-0" aria-hidden="true" />CI Job Timeline</h2><p role="status" aria-label="Source verification" className="min-h-4 text-xs text-ink-subtle">{data && loading ? 'Checking source…' : ''}</p></div>
    {data?<Replay key={JSON.stringify([data.runId,data.attempt,data.commit,data.startedAt,data.jobs])} data={data}/>:<div className="min-h-56 flex flex-col justify-center items-center gap-4 text-center">
      <p role="status" className="text-sm text-ink-muted">{loading?'Loading pipeline evidence…':'Pipeline evidence is unavailable right now.'}</p>
      {!loading&&<button className={control} onClick={retry}>Retry pipeline evidence</button>}
    </div>}
  </section>;
}
