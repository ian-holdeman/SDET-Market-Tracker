import {spawnSync} from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true, env: {...process.env, IMT_BROWSER_SUITE: 'smoke'},
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
