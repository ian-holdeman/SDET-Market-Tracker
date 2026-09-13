import type { Page, Response } from '@playwright/test';

// Complete transport/body delivery, then yield through painted frames so queued
// promise continuations and React updates run before assertions about late work.
export async function responsePainted(page: Page, response: Promise<Response>) {
  const delivered = await response;
  // A 204 has no body. Chromium's routed 204 need not emit loadingFinished.
  if (delivered.status() !== 204) await delivered.finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
