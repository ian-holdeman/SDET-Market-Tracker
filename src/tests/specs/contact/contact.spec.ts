import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { ContactPage, ResumePage } from '../../pages/contact.page';
import { mockApp } from '../../fixtures/auth';

test.beforeEach(async ({ page }) => {
  const state = await mockApp(page);
  state.populated = true;
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
});

test('resume link opens a rendered PDF preview and downloads only when requested', async ({ page }, info) => {
  await page.goto('/');
  const contact = new ContactPage(page);
  await contact.open();
  const downloads: string[] = [];
  page.on('download', value => downloads.push(value.suggestedFilename()));
  const popupPromise = page.waitForEvent('popup');
  await contact.resume.click();
  const popup = await popupPromise;
  popup.on('download', value => downloads.push(value.suggestedFilename()));
  const resume = new ResumePage(popup);
  await expect(popup).toHaveURL(/\/resume$/);
  await expect(resume.heading).toBeVisible();
  await expect(resume.sheets).toHaveCount(2);
  await expect(resume.sheet(1)).toContainText('I’m a Senior SDET');
  await expect(resume.sheet(2)).toContainText('Quality Automation Engineer');
  await expect(resume.sheet(2)).toContainText('References available upon request');
  for (const number of [1, 2]) {
    await expect(resume.sheet(number)).toHaveAttribute('aria-busy', 'false');
    const ink = await resume.canvas(number).evaluate((element: HTMLCanvasElement) => {
      const data = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
      let dark = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] && data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100) dark++;
      return dark;
    });
    expect(ink).toBeGreaterThan(1000);
  }
  expect(downloads).toEqual([]);
  expect(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await popup.emulateMedia({ colorScheme: 'dark' });
  await expect(popup.locator('html')).toHaveAttribute('data-theme', 'dark');
  await popup.screenshot({ path: info.outputPath('resume-dark.png'), fullPage: true });
  await popup.emulateMedia({ colorScheme: 'light' });
  await expect(popup.locator('html')).toHaveAttribute('data-theme', 'light');
  await popup.screenshot({ path: info.outputPath('resume-light.png'), fullPage: true });
  const downloadPromise = popup.waitForEvent('download');
  await resume.download.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Ian-Holdeman-Resume.pdf');
  const file = await download.path();
  expect(await readFile(file!)).toEqual(await readFile('public/resume.pdf'));
  await popup.reload();
  await expect(resume.sheet(2)).toHaveAttribute('aria-busy', 'false');
  expect(downloads).toHaveLength(1);
  await popup.close();
  await expect(contact.dialog).toBeVisible();
});

test('public resume is a real PDF and matches the approved main document', async ({ request }) => {
  const response = await request.get('/resume.pdf');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['content-disposition'] || '').not.toContain('attachment');
  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  expect(body).toEqual(await readFile('docs/resume/ian-holdeman-resume.pdf'));
});

for (const colorScheme of ['dark', 'light'] as const) {
  test(`contact keeps keyboard focus, closes reliably, and fits the ${colorScheme} palette`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    const contact = new ContactPage(page);
    await contact.open();
    await expect(contact.dialog).toBeVisible();
    await expect(contact.dialog).toContainText('Engineering inquires and SDET opportunities');
    await expect(contact.dialog).not.toContainText('Custom Build');
    await expect(contact.dialog).not.toContainText('Open to Roles');
    await expect(contact.close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(contact.footerClose).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(contact.close).toBeFocused();
    await contact.resume.focus();
    await expect(contact.resume).toBeInViewport();
    expect(await contact.dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`contact-${colorScheme}.png`) });
    await page.keyboard.press('Escape');
    await expect(contact.dialog).not.toBeVisible();
    await expect(contact.opener).toBeFocused();
    await contact.open();
    await contact.close.click();
    await expect(contact.opener).toBeFocused();
  });
}

for (const failure of ['missing', 'html fallback', 'corrupt PDF', 'worker unavailable'] as const) {
  test(`resume preview reports ${failure} and recovers on retry without downloading`, async ({ page }) => {
    let failing = true;
    await page.route(failure === 'worker unavailable' ? '**/pdf.worker*.mjs' : '**/resume.pdf', route => {
      if (!failing) return route.continue();
      if (failure === 'worker unavailable') return route.abort();
      return route.fulfill({ status: failure === 'missing' ? 404 : 200,
        contentType: failure === 'html fallback' ? 'text/html' : 'application/pdf',
        body: failure === 'corrupt PDF' ? '%PDF-1.7\nnot a PDF document' : '<html>Unavailable</html>' });
    });
    const downloads: string[] = [];
    page.on('download', value => downloads.push(value.suggestedFilename()));
    await page.goto('/resume');
    const resume = new ResumePage(page);
    await expect(resume.error).toContainText('The resume preview could not be loaded');
    await expect(resume.sheets).toHaveCount(0);
    failing = false;
    await resume.retry.click();
    await expect(resume.sheet(2)).toHaveAttribute('aria-busy', 'false');
    await expect(resume.error).toHaveCount(0);
    expect(downloads).toEqual([]);
  });
}

test('a stalled PDF request times out and a late response cannot replace a retry', async ({ page }) => {
  await page.clock.install();
  let release!: () => void;
  let began = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/resume.pdf', async route => {
    began = true;
    await gate;
    await route.fulfill({ status: 503, body: 'late failure' });
  }, { times: 1 });
  const resume = new ResumePage(page);
  await page.goto('/resume');
  await expect.poll(() => began).toBe(true);
  await page.clock.runFor(15_100);
  await expect(resume.error).toBeVisible();
  await resume.retry.click();
  await expect(resume.sheet(2)).toHaveAttribute('aria-busy', 'false');
  release();
  await expect(resume.error).toHaveCount(0);
  await expect(resume.sheet(2)).toContainText('References available upon request');
});
