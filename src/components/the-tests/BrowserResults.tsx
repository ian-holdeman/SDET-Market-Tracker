import React from 'react';
import { Check, CircleMinus } from 'lucide-react';
import { browserResultsAt, type Pipeline } from '../../telemetry/pipeline';

export function BrowserResults({data,time}:{data:Pipeline;time:number}) {
  const evidence=data.browserEvidence, completed=browserResultsAt(data,time);
  const passed=completed.filter(test=>test.outcome==='passed').length;
  const other=completed.length-passed;
  const rows=(tests:typeof completed)=>tests.map(test=>{
    const clean=test.outcome==='passed';
    const name=test.name.startsWith(test.file+' › ')?test.name.slice(test.file.length+3):test.name;
    return <li key={test.id} className="flex items-start gap-2.5 py-2 text-xs leading-5">
      {clean?<Check className="mt-0.5 h-4 w-4 shrink-0 text-positive-ink-400" aria-hidden="true"/>:<CircleMinus className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink-300" aria-hidden="true"/>}
      <div className="min-w-0"><p className="text-ink-strong break-words">{name}<span className={clean?'sr-only':'ml-2 text-warning-ink-300'}> {test.outcome}</span></p><p className="text-ink-subtle break-words">{test.project}</p></div>
    </li>;
  });
  return <section aria-label="Browser results" className="rounded-lg border border-line bg-surface-950 px-4 py-3">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold text-ink-secondary">Browser tests</h3>
      {evidence && evidence.planned>0 && <p role="status" aria-atomic="true" className="text-sm tabular-nums font-semibold text-positive-ink-400">{passed} / {evidence.planned} passed{other>0&&<span className="text-warning-ink-300"> · {other} other</span>}</p>}
    </div>
    <div className="h-64 overflow-y-auto mt-2" tabIndex={0} aria-label="Recent results" >
      {!evidence?<p className="py-3 text-xs text-ink-subtle">Browser results unavailable.</p>:!evidence.planned?<p className="py-3 text-xs text-ink-subtle">No browser cases recorded.</p>:completed.length===0?<p className="py-3 text-xs text-ink-subtle">Waiting for browser results…</p>:<ul aria-label="Recent browser results">{rows(completed.slice(-4))}</ul>}
    </div>
    {evidence && evidence.planned>0 && <details className="border-t border-line pt-2 text-xs text-ink-muted">
      <summary className="cursor-pointer w-fit focus-visible:outline-focus-positive">All completed results</summary>
      <div className="max-h-80 overflow-y-auto mt-2" tabIndex={0} aria-label="Completed results"><ul aria-label="All completed browser results">{rows(completed)}</ul></div>
    </details>}
  </section>;
}
