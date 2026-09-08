import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const config=JSON.parse(readFileSync(new URL('../deploy/production.json',import.meta.url),'utf8'));
const image=process.env.DEPLOY_IMAGE, key=process.env.PUBLIC_SUPABASE_PUBLISHABLE;
if (!image?.startsWith(config.registry+'@sha256:') || !/^[a-f0-9]{64}$/.test(image.split('@sha256:')[1]||'')) throw Error('An immutable image digest in the approved registry is required.');
if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||'')) throw Error('A public Supabase publishable value is required.');
const supabaseVersion=process.env.SUPABASE_SECRET_VERSION, historyVersion=process.env.HISTORY_SECRET_VERSION;
if (![supabaseVersion,historyVersion].every(v=>/^[1-9]\d*$/.test(v||''))) throw Error('Pin explicit positive Secret Manager versions.');
const environment={APP_DEPLOYMENT:'cloud-run',APP_ORIGIN:config.origin,SUPABASE_URL:config.supabaseUrl,VITE_SUPABASE_URL:config.supabaseUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_AUTH_REDIRECT_URL:config.origin+'/auth/callback',
  TEST_HISTORY_REPOSITORY:'ian-holdeman/SDET-Market-Tracker',TEST_HISTORY_BRANCH:'main',TEST_SNAPSHOT_BUCKET:config.snapshotBucket,TEST_ARCHIVE_BUCKET:config.archiveBucket};
// The required gcloud --project flag supplies the namespace. An explicit namespace
// makes gcloud fetch project metadata, which a service-scoped deployer does not need.
const service={apiVersion:'serving.knative.dev/v1',kind:'Service',metadata:{name:config.service,
  annotations:{'run.googleapis.com/ingress':'all','run.googleapis.com/minScale':String(config.minimumInstances),'run.googleapis.com/maxScale':String(config.maximumInstances)}},
  spec:{template:{metadata:{annotations:{'run.googleapis.com/execution-environment':'gen2','run.googleapis.com/cpu-throttling':'true','run.googleapis.com/startup-cpu-boost':'true'}},
    spec:{serviceAccountName:config.runtimeIdentity,containerConcurrency:config.concurrency,timeoutSeconds:config.requestTimeoutSeconds,
      containers:[{image,ports:[{containerPort:8080}],resources:{limits:{cpu:config.cpu,memory:config.memory}},
        startupProbe:{httpGet:{path:'/api/health',port:8080},periodSeconds:1,timeoutSeconds:1,failureThreshold:60},
        env:[...Object.entries(environment).map(([name,value])=>({name,value})),
          {name:'SUPABASE_SECRET_KEY',valueFrom:{secretKeyRef:{name:config.supabaseSecret,key:supabaseVersion}}},
          {name:'TEST_HISTORY_TOKEN',valueFrom:{secretKeyRef:{name:config.historySecret,key:historyVersion}}}]}]}},traffic:[{latestRevision:true,percent:100}]}};
const directory=new URL('../output/deployment/',import.meta.url);mkdirSync(directory,{recursive:true});
const output=new URL('service.json',directory);writeFileSync(output,JSON.stringify(service,null,2));console.log(fileURLToPath(output));
