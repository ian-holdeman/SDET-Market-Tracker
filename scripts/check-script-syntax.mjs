import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
for (const file of readdirSync(new URL('./',import.meta.url)).filter(file=>file.endsWith('.mjs'))) {
  const result = spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,import.meta.url))],{stdio:'inherit',windowsHide:true});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
