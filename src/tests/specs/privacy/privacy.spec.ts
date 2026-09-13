import { test, expect } from '../../fixtures/showcase-test';
import { PrivacyPage } from '../../pages/privacy.page';
import { TheBoardPage } from '../../pages/the-board.page';

test.beforeEach(async ({ page }) => {
  await page.route('https://supabase.example.invalid/**', route => route.fulfill({ json: [{symbol:'MDB'}] }));
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Incidental data unavailable' } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});
test('privacy notice supports keyboard focus, scrolling and return to its opener', async ({ page }, info) => {
  const privacy = new PrivacyPage(page);
  await page.goto('/board');
  await privacy.opener.click();
  await expect(privacy.dialog).toBeVisible();
  await expect(privacy.close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await privacy.dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
  await privacy.contact.focus();
  await expect(privacy.contact).toHaveAttribute('href','mailto:ianrholdeman@gmail.com');
  expect(await privacy.dialog.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('privacy.png') });
  await page.keyboard.press('Escape');
  await expect(privacy.dialog).not.toBeVisible();
  await expect(privacy.opener).toBeFocused();
  await privacy.opener.click();
  await privacy.close.click();
  await expect(privacy.opener).toBeFocused();
});
test('font requests stay on the application origin and both families decode', async ({ page }) => {
  const externalFonts: string[]=[];
  page.on('request', r => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) externalFonts.push(r.url()); });
  await page.goto('/logic');
  const loaded = await page.evaluate(async () => {
    const faces = await Promise.all([document.fonts.load('400 16px "Plus Jakarta Sans"'), document.fonts.load('700 16px "JetBrains Mono"')]);
    return faces.every(list => list.length > 0 && list.every(face => face.status === 'loaded'));
  });
  expect(externalFonts).toEqual([]);
  expect(loaded).toBe(true);
});

test('the direct notice URL is public and sign-in links to the same notice', async ({ page }) => {
  const privacy = new PrivacyPage(page);
  await page.goto('/privacy');
  await expect(privacy.article).toBeVisible();
  await privacy.signIn.click();
  await expect(privacy.signInNotice).toHaveAttribute('href','/privacy');
});

test('searched assets keep the disclosed logo destination without a referrer or account credentials', async ({ page }) => {
  const destinations = new Set<string>();
  page.on('request', request => destinations.add(new URL(request.url()).origin));
  await page.route('https://assets.parqet.com/**', route => route.fulfill({ status: 404 }));
  await page.route('**/api/quotes?**', route => {
    const symbol = new URL(route.request().url()).searchParams.get('symbols')!;
    const now = new Date().toISOString();
    return route.fulfill({ json: { quotes: [{ symbol, name: symbol, assetType: 'Stock', exchangeName: 'NYQ',
      price: 100, prevClose: 99, change: 1, changePercent: 1, currency: 'USD', asOf: now, fetchedAt: now, sparkline: [] }] } });
  });
  await page.route('**/api/search?**', route => route.fulfill({ json: { results: [{ symbol: 'SNOW', name: 'Snowflake', exchange: 'NYSE', assetType: 'Stock' }] } }));
  const board = new TheBoardPage(page);
  await page.goto('/board');
  await expect(board.assetRow('MDB')).toBeVisible();
  const logoRequest = page.waitForRequest(request => new URL(request.url()).pathname === '/logos/symbol/SNOW');
  await board.searchAsset('SNOW');
  await expect(board.assetRow('SNOW')).toBeVisible();
  const request = await logoRequest;
  expect(new URL(request.url()).origin).toBe('https://assets.parqet.com');
  const headers = await request.allHeaders();
  for (const name of ['authorization', 'cookie', 'referer', 'x-forwarded-for']) expect(headers[name]).toBeUndefined();
  expect([...destinations].filter(origin => !['http://127.0.0.1:3100', 'https://supabase.example.invalid', 'https://assets.parqet.com'].includes(origin))).toEqual([]);
});
