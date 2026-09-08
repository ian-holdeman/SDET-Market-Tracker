import { test, expect } from '@playwright/test';
import { HeaderComponent } from '../../pages/components/header.component';
import { PipelineComponent } from '../../pages/components/pipeline.component';
import { pipelineFixture, pipelineBrowserEvidence } from '../../fixtures/pipeline';
import { feed } from '../../fixtures/testEvidence';
test.beforeEach(async({page})=>{
  await page.route('https://supabase.example.invalid/**',route=>route.fulfill({json:[]}));
  await page.route('**/api/**',route=>route.fulfill({json:feed([])}));
  await page.route('**/api/test-pipeline',route=>route.fulfill({json:pipelineFixture()}));
});
test('historical overview and replay preserve real overlap with accessible desktop/mobile controls',async({page},testInfo)=>{
  await page.clock.install();
  const view=new PipelineComponent(page);
  await page.goto('/tests');
  await expect(view.root).toContainText('4m 33s');
  await expect(view.root).toContainText('1m 42s');
  await expect(view.job('database')).toContainText('1m 43s');
  await expect(view.position).toHaveValue('273000');
  await expect(view.job('test')).toContainText('Succeeded');
  await expect(view.root.getByRole('link',{name:'View run #30 on GitHub'})).toHaveAttribute('href',/runs\/34259098175\/attempts\/1$/);
  await view.replay.focus();await page.keyboard.press('Enter');
  await page.clock.runFor(1000);
  await view.pause.click();
  const paused=await view.position.inputValue();
  await page.clock.runFor(1000);await expect(view.position).toHaveValue(paused);
  await expect(view.job('database')).toContainText('In progress');
  await view.resume.click();await page.clock.runFor(14000);
  await expect(view.replay).toBeVisible();
  await expect(view.position).toHaveValue('273000');
  await expect(view.root.getByRole('button',{name:'Restart timeline'})).toHaveCount(0);
  await view.position.focus();await page.keyboard.press('Home');await expect(view.position).toHaveValue('0');
  await expect(view.job('test')).toContainText('Not started');
  await view.position.focus();await page.keyboard.press('End');
  await expect(view.position).toHaveValue('273000');
  await expect(view.position).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await view.root.screenshot({path:testInfo.outputPath('pipeline-overview.png')});
});
test('reduced motion keeps the overview and permits manual keyboard exploration',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const view=new PipelineComponent(page);await page.goto('/tests');
  await expect(view.replay).toBeDisabled();
  await expect(view.root).toContainText('use the slider to explore');
  await view.position.focus();await page.keyboard.press('Home');
  await expect(view.position).toHaveValue('0');
  await expect(view.job('test')).toContainText('Not started');
});
test('unavailable and invalid evidence never falls back to successful replay',async({page})=>{
  const now = Date.now();
  await page.clock.install({time:now});
  let mode='missing';
  await page.route('**/api/test-pipeline',route=>mode==='missing'?route.fulfill({status:404,json:{}}):route.fulfill({json:mode==='invalid'?{...pipelineFixture(now),attempt:2}:pipelineFixture(now)}));
  const view=new PipelineComponent(page);await page.goto('/tests');
  await expect(view.retry).toBeVisible();await expect(view.position).toHaveCount(0);
  mode='invalid';
  const invalidResponse = page.waitForResponse(response => response.url().endsWith('/api/test-pipeline') && response.status() === 200);
  await view.retry.click();
  expect((await (await invalidResponse).json()).attempt).toBe(2);
  await expect(view.retry).toBeVisible();await expect(view.position).toHaveCount(0);
  mode='valid';
  const validResponse = page.waitForResponse(response => response.url().endsWith('/api/test-pipeline') && response.status() === 200);
  await view.retry.click();
  expect((await (await validResponse).json()).attempt).toBe(1);
  await expect(view.replay).toBeVisible();
});
test('expired verification removes the replay when the source disappears',async({page})=>{
  await page.clock.install();let failed=false;
  await page.route('**/api/test-pipeline',route=>failed?route.fulfill({status:410,json:{}}):route.fulfill({json:pipelineFixture()}));
  const view=new PipelineComponent(page);await page.goto('/tests');await expect(view.replay).toBeVisible();
  failed=true;await page.clock.runFor(61000);
  await expect(view.retry).toBeVisible();await expect(view.position).toHaveCount(0);
});
test('a stalled source reaches its deadline',async({page})=>{
  await page.clock.install();
  let release:(()=>void)|undefined;
  await page.route('**/api/test-pipeline',async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({json:pipelineFixture()}).catch(()=>{});});
  const view=new PipelineComponent(page);await page.goto('/tests');
  await expect.poll(()=>!!release).toBe(true);await page.clock.runFor(13000);
  await expect(view.retry).toBeVisible();
  release!();
  await expect(view.position).toHaveCount(0);
});
test('navigation cancels a pending source without allowing late success',async({page})=>{
  let release:(()=>void)|undefined;
  await page.route('**/api/test-pipeline',async route=>{await new Promise<void>(resolve=>{release=resolve;});await route.fulfill({json:pipelineFixture()}).catch(()=>{});});
  const view=new PipelineComponent(page), header=new HeaderComponent(page);
  await page.goto('/tests');await expect.poll(()=>!!release).toBe(true);
  await header.navLogicBtn.click();await expect(view.root).toHaveCount(0);
  release!();await expect(view.root).toHaveCount(0);
});


test('background verification preserves the mounted timeline, focus, and paused position',async({page})=>{
  const now=Date.now(); await page.clock.install({time:now});
  let requests=0, release:(()=>void)|undefined;
  await page.route('**/api/test-pipeline',async route=>{
    requests++;
    if(requests>1)await new Promise<void>(resolve=>{release=resolve;});
    await route.fulfill({json:pipelineFixture(requests===1?now:now+61000)});
  });
  const view=new PipelineComponent(page);await page.goto('/tests');await expect(view.replay).toBeVisible();
  // Clicking waits for entrance motion and scrolling to settle before measuring geometry.
  await view.position.click({trial:true});await view.position.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  const position=await view.position.inputValue(), original=await view.position.elementHandle();
  const bounds=await view.root.boundingBox();
  await page.clock.runFor(61000);await expect.poll(()=>requests).toBe(2);
  await expect(view.position).toHaveValue(position);await expect(view.position).toBeFocused();
  expect(await original!.evaluate(el=>el.isConnected)).toBe(true);
  expect((await view.root.boundingBox())!.height).toBe(bounds!.height);
  release!();await expect(view.root.getByRole('status',{name:'Source verification'})).toHaveText('');
  await expect(view.position).toHaveValue(position);await expect(view.position).toBeFocused();
  expect(await original!.evaluate(el=>el.isConnected)).toBe(true);
});

test('stalled revalidation keeps the prior view only until the request deadline',async({page})=>{
  const now=Date.now();await page.clock.install({time:now});let calls=0,release:(()=>void)|undefined;
  await page.route('**/api/test-pipeline',async route=>{
    calls++;
    if(calls>1)await new Promise<void>(resolve=>{release=resolve;});
    await route.fulfill({json:pipelineFixture(now)}).catch(()=>{});
  });
  const view=new PipelineComponent(page);await page.goto('/tests');await expect(view.replay).toBeVisible();
  await page.clock.runFor(61000);await expect.poll(()=>calls).toBe(2);
  await expect(view.position).toBeVisible();
  await page.clock.runFor(13000);await expect(view.retry).toBeVisible();
  await expect(view.position).toHaveCount(0);release!();
  await expect(view.position).toHaveCount(0);
});
test('successful revalidation does not interrupt an active replay',async({page})=>{
  const now=Date.now();await page.clock.install({time:now});let calls=0;
  await page.route('**/api/test-pipeline',route=>{
    calls++;const value=pipelineFixture(calls===1?now:now+5000);
    if(calls===1)value.expiresAt=new Date(now+5000).toISOString();
    return route.fulfill({json:value});
  });
  const view=new PipelineComponent(page);await page.goto('/tests');await expect(view.replay).toBeVisible();
  const original=await view.position.elementHandle();await view.replay.click();
  await page.clock.runFor(6000);await expect.poll(()=>calls).toBe(2);
  await expect(view.root.getByRole('status',{name:'Source verification'})).toHaveText('');
  await expect(view.pause).toBeVisible();
  expect(Number(await view.position.inputValue())).toBeGreaterThan(0);
  expect(Number(await view.position.inputValue())).toBeLessThan(273000);
  expect(await original!.evaluate(el=>el.isConnected)).toBe(true);
  await page.clock.runFor(1000);await view.pause.click();
  expect(Number(await view.position.inputValue())).toBeGreaterThan(120000);
});

test('browser results follow replay, pause and keyboard seeking without noisy live rows',async({page},testInfo)=>{
  const {pipelineBrowserEvidence}=await import('../../fixtures/pipeline');
  await page.route('**/api/test-pipeline',route=>route.fulfill({json:{...pipelineFixture(Date.parse('2026-09-08T12:00:00Z')),browserEvidence:pipelineBrowserEvidence()}}));
  await page.clock.install({time:new Date('2026-09-08T12:00:00Z')});
  const view=new PipelineComponent(page);await page.goto('/tests');
  await page.clock.pauseAt(new Date('2026-09-08T12:00:10Z'));
  await expect(view.results).toContainText('7 / 7 passed');
  await expect(view.results.getByRole('list',{name:'Recent browser results'}).getByRole('listitem')).toHaveCount(4);
  await view.replay.click();await expect(view.results).toContainText('0 / 7 passed');
  await page.clock.runFor(5300);await view.pause.click();
  await expect(view.results).toContainText('1 / 7 passed');
  await page.clock.runFor(2000);await expect(view.results).toContainText('1 / 7 passed');
  await view.position.focus();await page.keyboard.press('End');
  await expect(view.results).toContainText('7 / 7 passed');
  await view.results.getByText('All completed results',{exact:true}).click();
  await expect(view.results.getByRole('list',{name:'All completed browser results'}).getByRole('listitem')).toHaveCount(7);
  await view.position.focus();await page.keyboard.press('Home');
  await expect(view.results).toContainText('0 / 7 passed');
  await view.position.press('End');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await view.results.screenshot({path:testInfo.outputPath('browser-results.png')});
});

test('an archived run remains historical months later and disappears after revocation', async ({page}) => {
  const published = Date.parse('2026-09-08T12:00:00Z'), now = published + 180 * 86400000;
  await page.clock.install({time:now});
  let revoked = false;
  await page.route('**/api/test-pipeline', route => revoked ? route.fulfill({status:410,json:{}}) : route.fulfill({json:{
    ...pipelineFixture(now), source:'archive', archivePublishedAt:new Date(published).toISOString(), browserEvidence:pipelineBrowserEvidence(),
  }}));
  const view = new PipelineComponent(page);
  await page.goto('/tests');
  await expect(view.root).toContainText('Archived historical run #30');
  await expect(view.root).toContainText('Sep 8, 2026');
  await expect(view.replay).toBeVisible();
  await view.root.getByText('About this pipeline', {exact:true}).click();
  await expect(view.root).toContainText('this does not verify current CI or production correctness');
  revoked = true;
  await page.clock.runFor(61000);
  await expect(view.retry).toBeVisible();
  await expect(view.position).toHaveCount(0);
});

test('missing browser artifact leaves job timing usable without a successful counter',async({page})=>{
  const view=new PipelineComponent(page);await page.goto('/tests');
  await expect(view.results).toContainText('Browser results unavailable');
  await expect(view.replay).toBeEnabled();
  await expect(view.results).not.toContainText('0 / 0');
});
