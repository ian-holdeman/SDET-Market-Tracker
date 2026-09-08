import dotenv from 'dotenv';
import {mkdir, readdir, writeFile, unlink} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {providerJson} from '../server/provider-json';
import {validateQuoteResponse} from '../server/market';
import {comparePair, type Observation} from './market-comparison';

// Owner-operated personal research only. No app endpoint, CI job or public artifact.
const directory = path.resolve('output/private-market-comparison');
const ownedFile = /^comparison-\d{13}\.json$/;
const object = (value:unknown):Record<string,unknown> => value && typeof value === 'object' ? value as Record<string,unknown> : {};
async function prune(clear=false) {
  const names = (await readdir(directory)).filter(name => ownedFile.test(name)).sort().reverse();
  for (const [index,name] of names.entries()) {
    if (clear || index >= 10 || Number(name.slice(11,24)) < Date.now()-30*86400000) {
      const file = path.resolve(directory,name);
      if (path.dirname(file) !== directory) throw Error('Invalid private evidence path');
      await unlink(file);
    }
  }
}
async function run() {
  if (process.env.CI || process.env.K_SERVICE) throw Error('Run this personal comparison locally, outside CI and production.');
  const mode = process.argv.slice(2);
  if (mode.length !== 1 || !['--run','--clear'].includes(mode[0])) throw Error('Use --run for a private live check or --clear to remove retained comparison files.');
  await mkdir(directory,{recursive:true});
  if (mode[0] === '--clear') { await prune(true); console.log('Private comparison files removed.'); return; }
  dotenv.config({path:['.env.local','.env'],quiet:true});
  const key = process.env.FINNHUB_API_KEY;
  if (!key?.trim()) throw Error('Set server-only FINNHUB_API_KEY in ignored .env.local.');
  const results = [];
  for (const symbol of ['AAPL','MSFT','NVDA']) {
    const get = async (url:string, headers:Record<string,string>) => {
      try {
        const response = await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});
        return {body:await providerJson(response,1_000_000),fetchedAt:new Date().toISOString()};
      } catch { return {body:null,fetchedAt:new Date().toISOString()}; }
    };
    const [y,f] = await Promise.all([
      get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m&includePrePost=false&events=div%2Csplits`,{'User-Agent':'Mozilla/5.0',Accept:'application/json'}),
      get(`https://finnhub.io/api/v1/quote?symbol=${symbol}`,{'X-Finnhub-Token':key,Accept:'application/json'}),
    ]);
    const now = Date.now();
    let yahoo:Observation|null = null, finnhub:Observation|null = null;
    let session:{start:number;end:number}|null = null, corporateAction = false;
    try {
      const quote = validateQuoteResponse(y.body,symbol,now);
      yahoo = {symbol,price:quote.price,observedAt:Date.parse(quote.asOf),currency:quote.currency ?? ''};
      const entries = object(object(y.body).chart).result;
      const chart = object(Array.isArray(entries) ? entries[0] : null);
      const regular = object(object(object(chart.meta).currentTradingPeriod).regular);
      if (typeof regular.start === 'number' && typeof regular.end === 'number') session = {start:regular.start*1000,end:regular.end*1000};
      corporateAction = Object.values(object(chart.events)).some(value => Object.keys(object(value)).length > 0);
    } catch { /* Missing/invalid data remains unavailable, never zero. */ }
    const value = object(f.body);
    if (typeof value.c === 'number' && typeof value.t === 'number') finnhub = {symbol,price:value.c,observedAt:value.t*1000,currency:'USD'};
    const comparison = corporateAction
      ? {status:'inconclusive',reason:'A corporate-action day needs a separate share-basis review',difference:null,tolerance:null}
      : comparePair({symbol,yahoo,finnhub,session},now);
    results.push({symbol,yahoo,finnhub,session,retrievedAt:{yahoo:y.fetchedAt,finnhub:f.fetchedAt},...comparison});
  }
  const report = {version:1,createdAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),
    dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).trim(),
    purpose:'Private personal cross-feed diagnostic; no redistribution or public accuracy claim',
    policy:{symbols:['AAPL','MSFT','NVDA'],currency:'USD',relativeTolerance:0.001,absoluteTolerance:0.05,maximumAgeMs:120000,maximumSkewMs:60000},results};
  const file = path.join(directory,`comparison-${Date.now()}.json`);
  await writeFile(file,JSON.stringify(report,null,2),{encoding:'utf8',flag:'wx'});
  await prune();
  console.log(`Private comparison evidence saved: ${file}`);
  if (results.some(result=>result.status==='outside-tolerance')) process.exitCode=1;
  else if (results.some(result=>result.status!=='within-tolerance')) process.exitCode=2;
}
run().catch(error => { console.error(error instanceof Error && /^(Use |Set server-only |Run this personal)/.test(error.message) ? error.message : 'Private comparison could not complete.'); process.exitCode=2; });
