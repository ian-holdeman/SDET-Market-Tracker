import { test, expect } from '../../fixtures/showcase-test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockApp } from '../../fixtures/auth';
import { feed } from '../../fixtures/testEvidence';
import { pipelineFixture, pipelineBrowserEvidence } from '../../fixtures/pipeline';
import { SettingsPage } from '../../pages/settings.page';
import { TheBoardPage } from '../../pages/the-board.page';
import { TheTestsPage } from '../../pages/the-tests.page';
import { PrivacyPage } from '../../pages/privacy.page';
import { HeaderComponent } from '../../pages/components/header.component';
import { ContactPage } from '../../pages/contact.page';
import { HomePage } from '../../pages/home.page';

import { contrast, textContrastInventory } from '../../pages/components/contrast';

async function prepareTheme(page: import('@playwright/test').Page, theme: 'dark'|'light', testInfo: import('@playwright/test').TestInfo) {
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
    const directory = testInfo.outputPath('visibility');
    await mkdir(directory, { recursive: true });
    const screenshot = async (name: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (!await page.getByRole('dialog').count()) await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${directory}/${name}.png`, fullPage: true });
      const root = await page.getByRole('dialog').count() ? page.getByRole('dialog') : page.getByRole('main');
      await writeFile(`${directory}/${name}-contrast.json`, JSON.stringify(await textContrastInventory(root), null, 2));
    };
    return { screenshot, verifyRequests: async () => {
    expect(await page.evaluate(() => (window as any).cspViolations)).toEqual(violations);
    expect([...destinations].sort()).toEqual(['http://127.0.0.1:3100', 'https://assets.parqet.com', 'https://supabase.example.invalid'].sort());
    } };
}

for (const theme of ['dark', 'light'] as const) {
  test(`Populated page and dialog readability in ${theme}`, async ({ page, context }, testInfo) => {
    const { screenshot, verifyRequests } = await prepareTheme(page, theme, testInfo);
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
    if (theme === 'light') {
      const changes = new HomePage(page).moverChanges;
      await expect(changes).toHaveCount(2);
      for (const change of await changes.all()) {
        expect.soft(await contrast(change)).toBeGreaterThanOrEqual(4.5);
        await change.hover();
        expect.soft(await contrast(change)).toBeGreaterThanOrEqual(4.5);
      }
    }
    await page.goto('/logic');
    expect(await contrast(page.getByRole('main').getByRole('button', { name: 'The Board', exact: true }))).toBeGreaterThanOrEqual(4.5);
    await screenshot('logic');
    await page.goto('/privacy');
    expect(await contrast(new PrivacyPage(page).article.getByRole('heading').first())).toBeGreaterThanOrEqual(4.5);
    await screenshot('privacy');
    const contact = new ContactPage(page);
    await contact.open();
    await screenshot('contact');
    if (theme === 'light') expect.soft(await contrast(contact.resume)).toBeGreaterThanOrEqual(4.5);
    await contact.resume.hover();
    await screenshot('contact-hover');
    if (theme === 'light') expect.soft(await contrast(contact.resume)).toBeGreaterThanOrEqual(4.5);
    await contact.close.click();
    await page.goto('/tests');
    const tests = new TheTestsPage(page);
    await expect(tests.results.value('pass-rate')).toHaveText('100%');
    await screenshot('tests');
    if (theme === 'light') expect.soft(await contrast(tests.showcase.tab('Watchlist re-login'))).toBeGreaterThanOrEqual(4.5);
    await page.getByRole('button', { name: 'Details for run #3' }).click();
    await screenshot('test-dialog');
    await page.keyboard.press('Escape');
    await verifyRequests();
  });

  test(`Mounted chart and focused timeframe survive appearance changes in ${theme}`, async ({ page, context }, testInfo) => {
    const { screenshot, verifyRequests } = await prepareTheme(page, theme, testInfo);
    await page.goto('/board?symbol=AAPL');
    const board = new TheBoardPage(page);
    await expect(board.chart('AAPL').line).toBeVisible();
    expect(await contrast(board.chart('AAPL').line, 'stroke')).toBeGreaterThanOrEqual(3);
    await screenshot('board');
    if (theme === 'light') expect.soft(await contrast(board.chart('AAPL').absoluteChange)).toBeGreaterThanOrEqual(4.5);
    const chartLine = await board.chart('AAPL').line.elementHandle();
    const path = await board.chart('AAPL').line.getAttribute('d');
    const header = new HeaderComponent(page);
    await header.switchAppearance(theme === 'dark' ? 'light' : 'dark');
    expect(await chartLine!.evaluate(element => element.isConnected)).toBe(true);
    await expect(board.chart('AAPL').line).toHaveAttribute('d', path!);
    await header.switchAppearance(theme);
    await board.chart('AAPL').timeframe('1D').focus();
    const themeTab = await context.newPage(); await themeTab.emulateMedia({ colorScheme: theme }); await mockApp(themeTab, true); await themeTab.goto('/settings');
    const themeSettings = new SettingsPage(themeTab);
    await themeSettings[theme === 'dark' ? 'light' : 'dark'].check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    expect(await chartLine!.evaluate(element => element.isConnected)).toBe(true);
    await expect(board.chart('AAPL').line).toHaveAttribute('d', path!);
    await expect(board.chart('AAPL').timeframe('1D')).toBeFocused();
    await themeSettings[theme].check(); await themeTab.close();
    await verifyRequests();
  });

  test(`Decoded playing video and focus survive appearance changes in ${theme}`, async ({ page, context }, testInfo) => {
    const { screenshot, verifyRequests } = await prepareTheme(page, theme, testInfo);
    await page.goto('/tests');
    const tests = new TheTestsPage(page), header = new HeaderComponent(page);
    await tests.showcase.play.click();
    await expect.poll(async () => (await tests.showcase.mediaState()).width).toBeGreaterThan(0);
    const video = await tests.showcase.video.elementHandle();
    await tests.showcase.speed.selectOption('2');
    await tests.showcase.video.evaluate((element: HTMLVideoElement) => { element.currentTime = 5; });
    await header.switchAppearance(theme === 'dark' ? 'light' : 'dark');
    expect(await video!.evaluate(element => element.isConnected)).toBe(true);
    const media = await tests.showcase.mediaState();
    expect(media.time).toBeGreaterThanOrEqual(5);
    expect(media.paused).toBe(false);
    expect(media.speed).toBe(2);
    await expect(tests.showcase.video).toHaveCSS('filter', 'none');
    await header.switchAppearance(theme);
    await tests.showcase.video.focus();
    const other = await context.newPage(); await other.emulateMedia({ colorScheme: theme }); await mockApp(other, true); await other.goto('/settings');
    await new HeaderComponent(other).switchAppearance(theme === 'dark' ? 'light' : 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    expect(await video!.evaluate(element => element.isConnected)).toBe(true);
    expect((await tests.showcase.mediaState()).time).toBeGreaterThan(0);
    await expect(tests.showcase.video).toBeFocused();
    await expect(tests.showcase.video).toHaveCSS('filter', 'none');
    await other.close();
    await verifyRequests();
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
    const directory = testInfo.outputPath('chart');
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
