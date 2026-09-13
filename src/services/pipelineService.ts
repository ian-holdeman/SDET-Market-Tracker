import { useEffect, useState } from 'react';
import { validatePipeline, type Pipeline } from '../telemetry/pipeline';
import { validateNightly, type NightlyEnvelope } from '../telemetry/nightlyPipeline';

export function usePipeline() {
  const [data,setData]=useState<Pipeline|NightlyEnvelope|null>(null), [loading,setLoading]=useState(true), [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let alive=true;let expiry:ReturnType<typeof setTimeout>|undefined;
    const deadline=setTimeout(()=>controller.abort(),12000);
    // Keep the last verified historical run mounted during the bounded refresh.
    setLoading(true);
    (async()=>{
      const response=await fetch('/api/test-pipeline',{signal:controller.signal,cache:'no-store'});
      if(!response.ok || !response.body)throw Error('Unavailable pipeline');
      const reader=response.body.getReader();let text='';const decoder=new TextDecoder();let bytes=0;
      try {
        while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>2200000)throw Error('Oversized pipeline');text+=decoder.decode(part.value,{stream:true});}
        text+=decoder.decode();
      } finally {await reader.cancel();}
      const raw=JSON.parse(text);
      const value=raw?.version===2?validateNightly(raw):validatePipeline(raw);
      if(!alive || controller.signal.aborted)return;
      setData(value);
      expiry=setTimeout(()=>{setRevision(n=>n+1);},Math.max(0,Date.parse(value.expiresAt)-Date.now()));
    })().catch(()=>{if(alive)setData(null);}).finally(()=>{clearTimeout(deadline);if(alive)setLoading(false);});
    // Revalidate on return without remounting unchanged historical evidence.
    const visibility=()=>{if(!document.hidden){setRevision(n=>n+1);}};
    document.addEventListener('visibilitychange',visibility);
    return ()=>{alive=false;controller.abort();clearTimeout(deadline);clearTimeout(expiry);document.removeEventListener('visibilitychange',visibility);};
  },[revision]);
  return {data,loading,retry:()=>setRevision(n=>n+1)};
}
