import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Run explicitly after editing the approved source; never regenerate as part of a website build.
const source = new URL('../docs/resume/ian-holdeman-resume.html', import.meta.url);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(source.href);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, tagged: true });
  await writeFile(new URL('../docs/resume/ian-holdeman-resume.pdf', import.meta.url), pdf);
  await writeFile(new URL('../public/resume.pdf', import.meta.url), pdf);
  console.log('Updated main resume and public PDF. Inspect both pages and rerun the contact browser tests before delivery.');
} finally {
  await browser.close();
}
