import React, { useEffect, useRef, useState } from 'react';
import { Play, MonitorPlay } from 'lucide-react';
import { parseRecordings, showcaseScenarios, type Recording } from './showcase';
import { verifyRecordingAvailability } from '../../services/recordingMedia';

const buttonStyle = 'rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400';

function RecordingPlayer({ recording, label }: { recording: Recording; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const [started, setStarted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(false);
  const [speed, setSpeed] = useState('1');
  useEffect(() => {
    alive.current = true;
    const element = video.current;
    return () => {
      alive.current = false;
      generation.current++;
      pending.current?.abort();
      element?.pause();
      element?.removeAttribute('src');
      element?.load();
    };
  }, []);
  useEffect(() => {
    if (!waiting) return;
    const timeout = window.setTimeout(() => {
      generation.current++;
      pending.current?.abort();
      const element = video.current;
      element?.pause(); element?.removeAttribute('src'); element?.load();
      setWaiting(false); setError(true);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [waiting]);
  const start = async () => {
    const element = video.current;
    if (!element) return;
    const attempt = ++generation.current;
    setError(false); setStarted(true); setWaiting(true);
    element.focus();
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      await verifyRecordingAvailability(recording.src, controller.signal);
      if (!alive.current || generation.current !== attempt) return;
      element.src = recording.src;
      element.playbackRate = Number(speed);
      await element.play();
    }
    catch { if (alive.current && generation.current === attempt) { setWaiting(false); setError(true); } }
  };
  return <>
    <div className="relative aspect-video bg-black" data-testid="recording-monitor">
      <video ref={video} poster={recording.poster}
        aria-label={`${label} recorded execution`} aria-describedby={`showcase-summary-${recording.id}`}
        data-testid="recording-video" tabIndex={0} preload="none" controls playsInline muted
        className="h-full w-full object-contain"
        onPlaying={() => { setWaiting(false); setError(false); setStarted(true); }}
        onCanPlay={() => setWaiting(false)} onWaiting={() => { if (started) setWaiting(true); }}
        onError={() => { setWaiting(false); setError(true); }}
      />
      {!started && !error && <div className="absolute inset-0 flex items-center justify-center bg-black/45">
        <button onClick={start} className={`${buttonStyle} bg-slate-950/90 flex items-center gap-2`}>
          <Play className="h-4 w-4" aria-hidden="true" />Play recording
        </button>
      </div>}
      {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0b0f19] px-4 text-center">
        <p role="alert" className="text-sm text-slate-300">Recording could not be played. Try again or choose another test.</p>
        <button className={buttonStyle} onClick={start}>Retry recording</button>
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-3 text-xs text-slate-400">
      <p role="status">{waiting ? 'Loading recording…' : `Recorded locally · ${recording.videoDurationSeconds.toFixed(1)}s · No audio`}</p>
      <label className="flex items-center gap-2">Playback speed
        <select style={{ colorScheme: 'dark' }} aria-label="Playback speed" value={speed} onChange={event => {
          setSpeed(event.target.value);
          if (video.current) video.current.playbackRate = Number(event.target.value);
        }} className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-200 focus-visible:outline-emerald-400">
          <option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option>
        </select>
      </label>
    </div>
  </>;
}

export function RecordedShowcase() {
  const [selected, setSelected] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true); setFailed(false);
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    (async () => {
      try {
        const response = await fetch('/recordings/manifest.json', { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) throw Error('Recording catalog unavailable');
        const content = await response.text();
        if (content.length > 32_000) throw Error('Recording catalog too large');
        const next = parseRecordings(JSON.parse(content));
        if (current) setRecordings(next);
      } catch { if (current) setFailed(true); }
      finally { window.clearTimeout(timeout); if (current) setLoading(false); }
    })();
    return () => { current = false; controller.abort(); window.clearTimeout(timeout); };
  }, [request]);
  const scenario = showcaseScenarios[selected];
  const recording = recordings.find(r => r.id === scenario.id);
  return <section aria-labelledby="recorded-showcase-heading" data-testid="recorded-showcase" className="space-y-4">
    <div className="pb-2 border-b border-slate-800">
      <h2 id="recorded-showcase-heading" className="text-xl font-bold text-white flex items-center gap-2"><MonitorPlay className="h-5 w-5 text-emerald-400" aria-hidden="true" />Test showcase</h2>
      <p className="text-xs text-slate-400 mt-1">Automated browser tests, recorded locally with test data.</p>
    </div>
    <div className="rounded-xl border border-slate-800 bg-[#0b0f19] overflow-hidden shadow-xl">
      <div role="tablist" aria-label="Featured tests" className="flex overflow-x-auto border-b border-slate-800 bg-slate-900/60 p-2 gap-1">
        {showcaseScenarios.map((item, index) => <button key={item.id} role="tab"
          id={`showcase-tab-${item.id}`} aria-controls={`showcase-panel-${item.id}`} aria-selected={selected === index}
          tabIndex={selected === index ? 0 : -1} ref={element => { tabs.current[index] = element; }}
          onClick={() => setSelected(index)} onKeyDown={event => {
            let next = index;
            if (event.key === 'ArrowRight') next = (index + 1) % showcaseScenarios.length;
            else if (event.key === 'ArrowLeft') next = (index + showcaseScenarios.length - 1) % showcaseScenarios.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = showcaseScenarios.length - 1;
            else return;
            event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
          }} className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${selected === index ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
          {item.label}
        </button>)}
      </div>
      {showcaseScenarios.map((item, index) => <div key={item.id} role="tabpanel" tabIndex={0}
        id={`showcase-panel-${item.id}`} aria-labelledby={`showcase-tab-${item.id}`} hidden={selected !== index}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-400">
        {selected === index && <>
          {recording ? <RecordingPlayer key={`${recording.id}-${recording.sha256}`} recording={recording} label={scenario.label} /> :
            <div className="aspect-video flex flex-col items-center justify-center gap-3 px-5 text-center bg-black/30" data-testid="recording-monitor">
              <p role="status" className="text-sm text-slate-400">{loading ? 'Loading recordings…' : failed ? 'Recordings are unavailable right now.' : 'This recording is not available yet.'}</p>
              {failed && <button className={buttonStyle} onClick={() => setRequest(n => n + 1)}>Retry loading recordings</button>}
            </div>}
          <div className="p-5 space-y-3">
            <p id={`showcase-summary-${scenario.id}`} className="text-sm text-slate-300">{scenario.summary}</p>
            <p className="text-xs text-slate-500">Curated demonstration. Current CI results appear in the dashboard above.</p>
            <details key={scenario.id} className="text-sm text-slate-400">
              <summary className="cursor-pointer w-fit text-slate-300 focus-visible:outline-emerald-400">About this test</summary>
              <div className="mt-4 space-y-4 break-words">
                <p>{scenario.significance}</p>
                <ul className="list-disc pl-5 space-y-1">{scenario.steps.map(step => <li key={step}>{step}</li>)}</ul>
                <p>{scenario.limits}</p>
                {recording && <dl className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-xs">
                  <dt>Capture outcome</dt><dd className="text-slate-200">{recording.outcome} · {recording.durationMs / 1000}s test execution</dd>
                  <dt>Attempts</dt><dd>{recording.attempts.map(a => `Attempt ${a.retry + 1}: ${a.status} (${a.durationMs / 1000}s)`).join('; ')}</dd>
                  <dt>Captured</dt><dd>{new Date(recording.capturedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} (UTC)</dd>
                  <dt>Environment</dt><dd>{recording.browser} · {recording.viewport}</dd>
                </dl>}
              </div>
            </details>
          </div>
        </>}
      </div>)}
    </div>
  </section>;
}
