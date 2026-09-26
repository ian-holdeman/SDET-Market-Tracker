import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const source = await readFile('public/icons/app.svg', 'utf8');
const badge = await readFile('public/icons/notification-badge.svg', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const icons = [
    { size: 192, name: 'app-192', svg: source },
    { size: 512, name: 'app-512', svg: source },
    { size: 512, name: 'maskable-512', svg: source.replace('rx="112"', 'rx="0"') },
    { size: 96, name: 'notification-badge', svg: badge },
  ];
  for (const { size, name, svg } of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{width:100%;height:100%}</style>${svg}`);
    await page.screenshot({ path: `public/icons/${name}.png`, omitBackground: true });
    await page.close();
  }
} finally { await browser.close(); }
