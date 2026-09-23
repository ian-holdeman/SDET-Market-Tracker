import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const source = await readFile('public/icons/app.svg', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  for (const [size, maskable] of [[192, false], [512, false], [512, true]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%}</style>${maskable ? source.replace('rx="112"', 'rx="0"') : source}`);
    await page.screenshot({ path: `public/icons/${maskable ? 'maskable' : 'app'}-${size}.png`, omitBackground: true });
    await page.close();
  }
} finally { await browser.close(); }
