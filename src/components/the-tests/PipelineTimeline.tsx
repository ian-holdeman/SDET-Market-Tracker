import React, { useEffect, useState, useRef } from 'react';
import { ChartNoAxesGantt, Play, Pause, ArrowUpRight } from 'lucide-react';
import { usePipeline } from '../../services/pipelineService';
import { advanceReplay, jobAt, pipelineWindow, type Pipeline } from '../../telemetry/pipeline';
import { nightlyReplay, type NightlyEnvelope } from '../../telemetry/nightlyPipeline';
import { BrowserResults } from './BrowserResults';
import { summarize } from '../../telemetry/contract';
import { durationLabel } from '../../telemetry/presentation';

const control='inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-900 px-3 py-2 text-sm font-semibold text-ink-strong hover:bg-surface-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-positive disabled:opacity-50 disabled:cursor-not-allowed';
const labels: Record<string,string>={test:'Browser & offline',database:'Database & Auth'};
const descriptions={test:'Build, offline checks, and headless browser tests.',database:'Local Supabase containers, database checks, and Auth integration.'};
function Replay({data,onInteraction}:{data:Pipeline;onInteraction?:(busy:boolean)=>void}) {
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
  const [focused,setFocused]=useState(false);
  useEffect(()=>{onInteraction?.(playing || focused || elapsed < duration);},[playing,focused,elapsed,duration,onInteraction]);
  const percentage=(time:number)=>duration?time/duration*100:0;
  const finished=elapsed>=duration;
  const toggle=()=>{if(finished)setElapsed(0);setPlaying(!playing);};
  return <div className="space-y-5" onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false);}}>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <p>{data.source === 'archive' ? 'Archived historical run' : data.source === 'nightly' ? 'Scheduled run' : 'Historical run'} #{data.number} · {new Date(data.startedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})} (UTC)</p>
      <a className="inline-flex items-center gap-1 text-positive-ink-400 hover:underline focus-visible:outline-focus-positive" href={data.url} target="_blank" rel="noreferrer">View run #{data.number} on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
    </div>
    <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
      <p><span className="text-xl sm:text-2xl font-bold tabular-nums text-ink-heading">{durationLabel(duration)}</span> <span className="text-ink-muted">{data.source==='nightly'?'recorded job window':'job window'}</span></p>
      <p><span className="text-xl sm:text-2xl font-bold tabular-nums text-positive-ink-400">{data.jobs.length===2&&data.jobs.some(j=>j.name==='test')&&data.jobs.some(j=>j.name==='database')?durationLabel(window.overlapMs):'Unavailable'}</span> <span className="text-ink-muted">overlap</span></p>
    </div>
    <div className="space-y-5" aria-label="Parallel job timeline">
      {data.jobs.map(job=>{
        const offset=Date.parse(job.startedAt)-window.start, length=Date.parse(job.completedAt)-Date.parse(job.startedAt);
        const progress=length?Math.max(0,Math.min(1,(elapsed-offset)/length))*100:100;
        const state=jobAt(job,window.start+elapsed);
        return <div key={job.id} data-testid={`pipeline-job-${job.name}`} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <h3 className="font-semibold text-ink-strong">{labels[job.name] ?? job.name}</h3>
            <p className="text-xs text-ink-muted"><span className="text-sm font-semibold tabular-nums text-ink-strong">{durationLabel(length)}</span> <span aria-hidden="true">·</span> <span className={state==='Succeeded'?'text-positive-ink-400':state==='In progress'||state==='Not started'?'text-ink-secondary':'text-warning-ink-300'}>{state}</span></p>
          </div>
          <div className="relative h-8 overflow-hidden rounded-lg bg-surface-950 border border-line" aria-hidden="true">
            <div className={job.outcome==='success'?'absolute inset-y-0 rounded bg-positive-400/15 border border-positive-400/30':'absolute inset-y-0 rounded bg-warning-400/15 border border-warning-400/30'} style={{left:`${percentage(offset)}%`,width:`${percentage(length)}%`,minWidth:length===0?'2px':undefined}}>
              <div className={job.outcome==='success'?'h-full rounded bg-positive-400/70':'h-full rounded bg-warning-400/70'} style={{width:`${progress}%`}} />
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
        <p>Browser results use sanitized case evidence and actual completion times. Offline, database, and Auth checks are represented by job summaries. Provider calls in browser tests are mocked.</p><p>{data.source === 'archive' ? 'Independently retained historical evidence. Archive availability is rechecked every minute; this does not verify current CI or production correctness.' : 'Recorded evidence only. Scheduled source selection is rechecked every minute.'}</p>
      </div>
    </details>
  </div>;
}
const playbackKey=(data:Pipeline)=>JSON.stringify([data.source,data.runId,data.attempt,data.commit,data.startedAt,data.jobs]);
export function PipelineTimeline() {
  const {data,loading,retry}=usePipeline();
  const nightly:NightlyEnvelope|null=data?.version===2&&'scope' in data?data:null;
  const candidate=nightly?(nightlyReplay(nightly)??nightly.archive):data as Pipeline|null;
  const independentCases=nightly?.latest?.browserEvidence ? summarize(nightly.latest.browserEvidence) : null;
  const [displayed,setDisplayed]=useState<Pipeline|null>(null),[busy,setBusy]=useState(false);
  const section=useRef<HTMLElement>(null);
  const handoff=useRef<{key:string;until:number}|null>(null);
  const changed=!!candidate&&!!displayed&&playbackKey(candidate)!==playbackKey(displayed);
  const revoked=!data||(!!nightly&&nightly.state!=='verified'&&displayed?.source==='nightly');
  useEffect(()=>{
    if(revoked||!displayed||!changed||!busy)setDisplayed(candidate);
  },[data,busy,revoked,changed]);
  useEffect(()=>{
    if(!changed||!busy||revoked||!displayed) { handoff.current=null; return; }
    const key=playbackKey(displayed);
    if(handoff.current?.key!==key)handoff.current={key,until:Date.now()+60000};
    // Old live evidence is no longer revalidated once a newer selection wins.
    // A bounded handoff cannot retain it indefinitely after upstream removal.
    const timer=setTimeout(()=>{setBusy(false);setDisplayed(candidate);},Math.max(0,handoff.current.until-Date.now()));
    return()=>clearTimeout(timer);
  },[changed,busy,revoked,data]);
  const loadNewest=()=>{setBusy(false);setDisplayed(candidate);};
  return <section ref={section} data-testid="pipeline-timeline" aria-labelledby="pipeline-heading" className="rounded-xl border border-line bg-evidence-surface p-5 sm:p-7 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-x-3"><h2 id="pipeline-heading" className="text-lg font-bold text-ink-heading flex items-center gap-2.5"><ChartNoAxesGantt className="h-5 w-5 text-positive-ink-400 shrink-0" aria-hidden="true" />CI Job Timeline</h2><p role="status" aria-label="Source verification" className="min-h-4 text-xs text-ink-subtle">{data && loading ? 'Checking source…' : ''}</p></div>
    {nightly&&<div data-testid="latest-nightly" className="text-xs text-ink-muted space-y-2">
      <p>{nightly.latest?'Latest nightly #'+nightly.latest.number+' · attempt '+nightly.latest.attempt+' · '+nightly.latest.outcome.replaceAll('_',' '):nightly.state==='empty'?'No completed scheduled run has been verified.':'Latest nightly could not be verified.'}</p>
      {nightly.latest&&<a className="inline-block text-info-ink-400 hover:underline" href={'https://github.com/'+nightly.scope.repository+'/actions/runs/'+nightly.latest.runId+'/attempts/'+nightly.latest.attempt} target="_blank" rel="noreferrer">Latest nightly source · {new Date(nightly.latest.createdAt).toLocaleDateString('en-US',{timeZone:'UTC'})} (UTC)</a>}
      {nightly.highest&&!nightly.latest&&<p>Previously observed run #{nightly.highest.number}, attempt {nightly.highest.attempt}, is unavailable.</p>}
      {nightly.active&&<p>Run #{nightly.active.number}, attempt {nightly.active.attempt}, has not completed.</p>}
      {nightly.continuity==='unavailable'&&<p>Saved selection continuity could not be verified.</p>}
      {nightly.latest?.jobsState!=='available'&&nightly.latest&&<p>Job evidence {nightly.latest.jobsState}; missing or unexpected jobs and missing timing cannot establish a complete pipeline.</p>}
      {nightly.latest?.jobs.filter(j=>!j.startedAt||!j.completedAt).map(j=><p key={j.id}>{j.name}: {j.outcome.replaceAll('_',' ')} · timing unavailable</p>)}
      {nightly.latest&&nightly.latest.browserState!=='available'&&<p>Latest nightly browser evidence: {nightly.latest.browserState}.</p>}
      {independentCases && <p data-testid="latest-browser-counts">Browser cases: {independentCases.passed} / {independentCases.total} passed · {independentCases.flaky} flaky · {independentCases.failed} failed · {independentCases.incomplete + independentCases.interrupted} incomplete · {independentCases.skipped} skipped.</p>}
      {nightly.latest?.browserEvidence && !nightlyReplay(nightly)?.browserEvidence && <p>Case outcomes are available independently; their timing cannot be aligned with a validated browser job.</p>}
      {nightly.latest?.browserEvidence?.runnerStatus==='incomplete'&&<p>Browser evidence is incomplete; missing attempts are not passes.</p>}
      {nightly.state!=='verified'&&<button className={control} onClick={retry}>Retry pipeline evidence</button>}
    </div>}
    {changed&&busy&&!revoked&&<button className={control} onClick={loadNewest}>Load newest nightly</button>}
    {displayed?<Replay key={playbackKey(displayed)} data={displayed} onInteraction={setBusy}/>:<div className="min-h-56 flex flex-col justify-center items-center gap-4 text-center">
      <p role="status" className="text-sm text-ink-muted">{loading?'Loading pipeline evidence…':nightly?.latest?'No validated job intervals are available for replay.':'Pipeline evidence is unavailable right now.'}</p>
      {!loading&&!nightly&&<button className={control} onClick={retry}>Retry pipeline evidence</button>}
    </div>}
    {nightly?.archive&&candidate?.source!=='archive'&&<details className="text-xs text-ink-muted"><summary className="cursor-pointer">Older archived run #{nightly.archive.number}</summary><div className="mt-4"><Replay key={playbackKey(nightly.archive)} data={nightly.archive}/></div></details>}
    {nightly&&displayed?.source==='archive'&&<p className="text-xs text-ink-muted">Older archived run #{displayed.number}. This retained demonstration does not establish the latest nightly outcome.</p>}
  </section>;
}
