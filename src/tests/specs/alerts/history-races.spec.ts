import { test, expect } from '../../fixtures/showcase-test';
import { mockApp, identity, session } from '../../fixtures/auth';
import { mockAlerts, alertEvent } from '../../fixtures/alerts';
import { AlertsPage } from '../../pages/alerts.page';
import { HeaderComponent } from '../../pages/components/header.component';
import { responsePainted } from '../../fixtures/response-barrier';

test('failed clear retains history; confirmed clear fences late pagination and failed refresh', async ({ page }) => {
  await page.clock.install();
  await mockApp(page, true);
  const state = await mockAlerts(page);
  state.events = Array.from({ length: 75 }, (_, i) => alertEvent('race-' + i, 101, Date.now() - i * 1000));
  await page.goto('/settings');
  const alerts = new AlertsPage(page);
  await alerts.historyBell.click();
  await expect(alerts.events).toHaveCount(30);
  // Settle Auth and the initial dialog before freezing background polling.
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  state.failBulk = true;
  await alerts.clearHistory.click();
  await alerts.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
  await expect(alerts.history.getByRole('alert')).toContainText('not confirmed');
  await expect(alerts.events).toHaveCount(30);
  expect(state.events).toHaveLength(75);
  state.failBulk = false;
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>(r => release = r), started = new Promise<void>(r => requested = r);
  const stale = state.events.slice(30, 60);
  let failRefresh = false;
  await page.route('**/rest/v1/alert_events?**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && url.searchParams.has('or')) {
      requested(); await gate; return route.fulfill({ json: stale });
    }
    // A definitive read denial avoids coupling this stale-response regression to
    // transport retry timers, which are verified separately.
    if (failRefresh) return route.fulfill({ status: 403, json: { message: 'unavailable' } });
    return route.fallback();
  });
  await alerts.older.click();
  await started;
  await alerts.clearHistory.click();
  failRefresh = true;
  await alerts.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
  await expect(alerts.clearConfirmation).toHaveCount(0);
  await expect(alerts.events).toHaveCount(0);
  const late = page.waitForResponse(r => r.url().includes('/alert_events?') && new URL(r.url()).searchParams.has('or'));
  release(); await late;
  await expect(alerts.events).toHaveCount(0);
  await expect(alerts.history.getByRole('alert')).toContainText('could not be refreshed', { timeout: 15000 });
  failRefresh = false;
  state.events = [alertEvent('arrived-after-clear', 102)];
  await alerts.history.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(alerts.events).toHaveCount(1);
  await expect(alerts.events).toContainText('$102.00');
  await expect(alerts.unreadIndicator).toBeVisible();
});

test('a second client clearing history removes loaded older pages on refresh', async ({ page, context }) => {
  await page.clock.install();
  await mockApp(page, true);
  const state = await mockAlerts(page);
  state.events = Array.from({ length: 75 }, (_, i) => alertEvent('other-client-' + i, 101, Date.now() - i * 1000));
  await page.goto('/settings');
  const alerts = new AlertsPage(page);
  await alerts.historyBell.click();
  await expect(alerts.events).toHaveCount(30);
  await alerts.older.click();
  await expect(alerts.events).toHaveCount(60);
  const other = await context.newPage();
  await mockApp(other, true); await mockAlerts(other, state);
  await other.goto('/settings');
  const second = new AlertsPage(other);
  await second.historyBell.click();
  await second.clearHistory.click();
  await second.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
  await expect(second.events).toHaveCount(0);
  await page.clock.runFor(15001);
  await expect(alerts.events).toHaveCount(0);
  await expect(alerts.unreadIndicator).toHaveCount(0);
});

test('clear preserves a later arrival and cannot be overwritten by an earlier poll', async ({ page }) => {
  await page.clock.install();
  await mockApp(page, true);
  const state = await mockAlerts(page);
  state.events = [alertEvent('before-clear')];
  await page.goto('/settings');
  const alerts = new AlertsPage(page);
  await alerts.historyBell.click();
  await expect(alerts.events).toHaveCount(1);
  let releasePoll!: () => void, pollStarted!: () => void, releaseMutation!: () => void, mutationApplied!: () => void;
  const pollGate = new Promise<void>(r => releasePoll = r), pollSeen = new Promise<void>(r => pollStarted = r);
  const mutationGate = new Promise<void>(r => releaseMutation = r), applied = new Promise<void>(r => mutationApplied = r);
  let holdPoll = true;
  const stale = [...state.events];
  await page.route('**/rest/v1/alert_events?**', async route => {
    if (holdPoll && route.request().method() === 'GET') {
      holdPoll = false; pollStarted(); await pollGate;
      return route.fulfill({ json: stale });
    }
    return route.fallback();
  });
  await page.route('**/rest/v1/rpc/mutate_alert_history', async route => {
    expect(route.request().postDataJSON().operation).toBe('clear');
    state.events = []; mutationApplied(); await mutationGate;
    return route.fulfill({ json: true });
  });
  await page.clock.runFor(15001); await pollSeen;
  await alerts.clearHistory.click();
  await alerts.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
  await applied;
  state.events = [alertEvent('after-boundary', 105, await page.evaluate(() => Date.now()))];
  releaseMutation();
  await expect(alerts.events).toHaveCount(1);
  await expect(alerts.events).toContainText('$105.00');
  const late = page.waitForResponse(r => r.url().includes('/alert_events?') && r.request().method() === 'GET');
  releasePoll(); await (await late).finished();
  await expect(alerts.events).toContainText('$105.00');
  await expect(alerts.unreadIndicator).toBeVisible();
});

for (const changeAccount of [false, true]) {
  test(`confirmed clear after dialog closure ${changeAccount ? 'cannot clear the next account' : 'invalidates the original snapshot'}`, async ({ page }) => {
    const account = await mockApp(page, true);
    const state = await mockAlerts(page);
    state.events = [alertEvent('old-owner')];
    await page.goto('/settings');
    const alerts = new AlertsPage(page);
    await alerts.historyBell.click();
    await expect(alerts.events).toHaveCount(1);
    let release!: () => void, requested!: () => void;
    const gate = new Promise<void>(r => release = r), started = new Promise<void>(r => requested = r);
    await page.route('**/rest/v1/rpc/mutate_alert_history', async route => {
      requested(); await gate;
      if (!changeAccount) state.events = [];
      return route.fulfill({ json: true });
    });
    await alerts.clearHistory.click();
    await alerts.clearConfirmation.getByRole('button', { name: 'Clear history', exact: true }).click();
    await started;
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(alerts.history).toHaveCount(0);
    if (changeAccount) {
      const nextIdentity = { ...identity, id: '55555555-5555-4555-8555-555555555555', user_metadata: { full_name: 'Second Member', role: 'user' } };
      const nextSession = { ...session, user: nextIdentity, access_token: Buffer.from('{"alg":"HS256"}').toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: nextIdentity.id, role: 'authenticated', exp: 4102444800 })).toString('base64url') + '.test' };
      account.identity = nextIdentity;
      state.events = [alertEvent('next-owner', 110)];
      await page.evaluate(value => {
        localStorage.setItem('imt_supabase_auth', JSON.stringify(value));
        const channel = new BroadcastChannel('imt_supabase_auth');
        channel.postMessage({ event: 'SIGNED_IN', session: value }); channel.close();
      }, nextSession);
      await expect(new HeaderComponent(page).username).toHaveText('Second Member');
      await expect(alerts.unreadIndicator).toBeVisible();
    }
    const response = page.waitForResponse(r => r.url().endsWith('/rpc/mutate_alert_history'));
    release(); await responsePainted(page, response);
    if (!changeAccount) await expect(alerts.unreadIndicator).toHaveCount(0);
    else await expect(alerts.unreadIndicator).toBeVisible();
    await alerts.historyBell.click();
    await expect(alerts.events).toHaveCount(changeAccount ? 1 : 0);
    if (changeAccount) await expect(alerts.events).toContainText('$110.00');
  });
}
