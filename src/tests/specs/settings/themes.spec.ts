import { test, expect, type Locator } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mockApp } from '../../fixtures/auth';
import { feed } from '../../fixtures/testEvidence';
import { pipelineFixture, pipelineBrowserEvidence } from '../../fixtures/pipeline';
import { SettingsPage } from '../../pages/settings.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { TheTestsPage } from '../../pages/the-tests.page';
import { PrivacyPage } from '../../pages/privacy.page';

// Compute actual foreground/background contrast, compositing transparent ancestor surfaces.
async function contrast(locator: Locator, property: 'color' | 'stroke' = 'color') {
  return locator.evaluate((element, property) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const rgba = (color: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); };
    const ancestors = []; let node: Element | null = element;
    while (node) { ancestors.unshift(node); node = node.parentElement; }
    let background = [255, 255, 255];
    for (const ancestor of ancestors) {
      const c = rgba(getComputedStyle(ancestor).backgroundColor), a = c[3] / 255;
      background = background.map((v, i) => c[i] * a + v * (1 - a));
    }
    const foreground = rgba(getComputedStyle(element)[property]);
    const lum = (rgb: number[]) => rgb.slice(0, 3).map(v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const a = lum(background), b = lum(foreground);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }, property);
}

for (const theme of ['dark', 'light'] as const) {
  test(`Populated pages, charts and dialogs remain readable in ${theme}, with playback and focus preserved`, async ({ page, context }, testInfo) => {
    test.setTimeout(60000);
    const state = await mockApp(page, true); state.populated = true; state.watchlist = ['AAPL'];
    await page.route('**/api/test-history*', route => route.fulfill({ json: { ...feed(), fetchedAt: new Date().toISOString() } }));
    await page.route('**/api/test-pipeline', route => route.fulfill({ json: { ...pipelineFixture(), browserEvidence: pipelineBrowserEvidence() } }));
    await page.addInitScript(theme => localStorage.setItem('imt_appearance', theme), theme);
    const destinations = new Set<string>(), violations: string[] = [];
    page.on('request', request => destinations.add(new URL(request.url()).origin));
    await page.addInitScript(() => {
      (window as any).cspViolations = [];
      window.addEventListener('securitypolicyviolation', event => (window as any).cspViolations.push(event.violatedDirective));
    });
    const directory = `.telemetry/settings/${testInfo.project.name}/${theme}`;
    await mkdir(directory, { recursive: true });
    const screenshot = async (name: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (!await page.getByRole('dialog').count()) await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
    };
    await page.goto('/settings');
    const settings = new SettingsPage(page);
    await expect(settings.name).toHaveText('Test Member');
    expect(await contrast(settings.name)).toBeGreaterThanOrEqual(4.5);
    expect(await contrast(settings.privacy)).toBeGreaterThanOrEqual(4.5);
    await settings[theme].focus();
    await expect(settings[theme]).toBeFocused();
    await screenshot('settings');
    await settings.delete.click();
    expect(await contrast(settings.dialog.getByRole('heading'))).toBeGreaterThanOrEqual(4.5);
    await screenshot('delete-dialog');
    await page.keyboard.press('Escape');
    await expect(settings.delete).toBeFocused();
    await page.goto('/');
    await expect(page.getByTestId('test-snapshot').getByTestId('metric-value').first()).toBeVisible();
    await screenshot('home');
    await page.goto('/board?symbol=AAPL');
    const board = new TheBoardPage(page);
    await expect(board.chart('AAPL').line).toBeVisible();
    expect(await contrast(board.chart('AAPL').line, 'stroke')).toBeGreaterThanOrEqual(3);
    await screenshot('board');
    const chartLine = await board.chart('AAPL').line.elementHandle();
    const path = await board.chart('AAPL').line.getAttribute('d');
    await board.chart('AAPL').timeframe('1D').focus();
    const themeTab = await context.newPage(); await mockApp(themeTab, true); await themeTab.goto('/settings');
    const themeSettings = new SettingsPage(themeTab);
    await themeSettings[theme === 'dark' ? 'light' : 'dark'].check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    expect(await chartLine!.evaluate(element => element.isConnected)).toBe(true);
    await expect(board.chart('AAPL').line).toHaveAttribute('d', path!);
    await expect(board.chart('AAPL').timeframe('1D')).toBeFocused();
    await themeSettings[theme].check(); await themeTab.close();
    await page.goto('/logic');
    expect(await contrast(page.getByRole('main').getByRole('button', { name: 'The Board', exact: true }))).toBeGreaterThanOrEqual(4.5);
    await screenshot('logic');
    await page.goto('/privacy');
    expect(await contrast(new PrivacyPage(page).article.getByRole('heading').first())).toBeGreaterThanOrEqual(4.5);
    await screenshot('privacy');
    await page.goto('/tests');
    const tests = new TheTestsPage(page);
    await expect(tests.results.value('pass-rate')).toHaveText('100%');
    await screenshot('tests');
    await page.getByRole('button', { name: 'Details for run #3' }).click();
    await screenshot('test-dialog');
    await page.keyboard.press('Escape');
    await tests.showcase.play.click();
    await expect.poll(async () => (await tests.showcase.mediaState()).width).toBeGreaterThan(0);
    const video = await tests.showcase.video.elementHandle();
    await tests.showcase.video.focus();
    const other = await context.newPage(); await mockApp(other, true); await other.goto('/settings');
    const second = new SettingsPage(other);
    await second[theme === 'dark' ? 'light' : 'dark'].check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    expect(await video!.evaluate(element => element.isConnected)).toBe(true);
    expect((await tests.showcase.mediaState()).time).toBeGreaterThan(0);
    await expect(tests.showcase.video).toBeFocused();
    await expect(tests.showcase.video).toHaveCSS('filter', 'none');
    await other.close();
    expect(await page.evaluate(() => (window as any).cspViolations)).toEqual(violations);
    expect([...destinations].sort()).toEqual(['http://127.0.0.1:3100', 'https://assets.parqet.com', 'https://supabase.example.invalid'].sort());
  });
}

for (const theme of ['dark', 'light'] as const) {
  test(`Negative charts, hover labels and unavailable states remain readable in ${theme}`, async ({ page }, testInfo) => {
    const state = await mockApp(page, true); state.populated = true; state.falling = true; state.watchlist = ['AAPL'];
    await page.addInitScript(value => localStorage.setItem('imt_appearance', value), theme);
    await page.goto('/board');
    const board = new TheBoardPage(page);
    await expect(board.header.profileButton).toBeVisible();
    await board.allAssets.click();
    await board.assetRow('AAPL').click();
    const chart = board.chart('AAPL');
    await expect(chart.line).toBeVisible();
    expect(await contrast(chart.line, 'stroke')).toBeGreaterThanOrEqual(3);
    await chart.surface.hover();
    await expect(chart.highLabel).toBeVisible();
    expect(await contrast(chart.highLabel)).toBeGreaterThanOrEqual(4.5);
    const directory = `.telemetry/settings/${testInfo.project.name}/${theme}`;
    await mkdir(directory, { recursive: true });
    await chart.card.screenshot({ path: `${directory}/negative-chart.png` });
    await page.route('**/api/candles?*', route => route.fulfill({ status: 502, json: { error: 'Deliberate unavailable chart fixture' } }));
    await page.reload();
    await expect(board.header.profileButton).toBeVisible();
    // Selecting the row persisted its asset URL, so reload already reopens this card.
    await expect(chart.card.getByText('Historical data unavailable for this period.', { exact: true })).toBeVisible();
    expect(await contrast(chart.card.getByText('Historical data unavailable for this period.', { exact: true }))).toBeGreaterThanOrEqual(4.5);
    await chart.card.screenshot({ path: `${directory}/unavailable-chart.png` });
  });
}
