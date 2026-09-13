import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { historyConfig } from '../server/test-history';
import { fetchNightly } from '../server/nightly-pipeline';

dotenv.config({path:['.env.local','.env'],quiet:true});
const config=historyConfig(process.env);
if(!config)throw Error('Configure server-only test history access before verification.');
const evidence=await fetchNightly(config);
mkdirSync('.telemetry/pipeline',{recursive:true});
writeFileSync('.telemetry/pipeline/verified.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({state:evidence.state,latest:evidence.latest,active:evidence.active},null,2));
console.log('Read-only verification saved privately. No CI execution or publication performed.');
