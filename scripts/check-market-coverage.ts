import express from 'express';
import { writeFile } from 'node:fs/promises';
import { marketRouter } from '../server/market';
import { INITIAL_BOARD_STOCKS } from '../src/data/marketData';
const app=express(); app.use(marketRouter());
const server=app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${(server.address() as any).port}`;
try {
  const symbols=INITIAL_BOARD_STOCKS.map(s=>s.symbol);
  const batch=await (await fetch(base+'/api/quotes?symbols='+encodeURIComponent(symbols.join(',')))).json();
  const rows: any[]=[]; let index=0;
  await Promise.all(Array.from({length:3},async()=>{while(index<symbols.length){
    const symbol=symbols[index++];
    const q=batch.quotes?.find((q:any)=>q.symbol===symbol);
    const response=await fetch(base+'/api/price-activity?symbol='+encodeURIComponent(symbol));const h=await response.json();
    const number=(n:any)=>typeof n==='number'&&Number.isFinite(n);
    rows.push({symbol,quote:!!q,previousClose:number(q?.prevClose),dayRange:number(q?.dayLow)&&number(q?.dayHigh),yearRange:number(q?.fiftyTwoWeekLow)&&number(q?.fiftyTwoWeekHigh),volume:q?.assetType==='Index'||q?.assetType==='Bond Yield'?'not-applicable':number(q?.volume),monthChange:number(h.month?.changePercent),yearChange:number(h.year?.changePercent),historyHTTP:response.status});
  }}));
  rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  const gaps=rows.filter(r=>!r.quote||!r.previousClose||!r.dayRange||!r.yearRange||r.volume===false||!r.monthChange||!r.yearChange);
  const report={checkedAt:new Date().toISOString(),count:rows.length,complete:rows.length-gaps.length,gaps,rows};
  await writeFile('docs/market-coverage.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({count:report.count,complete:report.complete,gaps},null,2));
  if(rows.length!==88||rows.some(r=>!r.quote||r.historyHTTP!==200))process.exitCode=1;
} finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
