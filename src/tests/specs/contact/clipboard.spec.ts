import { test, expect } from '@playwright/test';
import { ContactPage } from '../../pages/contact.page';
import { mockApp } from '../../fixtures/auth';

test.beforeEach(async ({ page }) => {
  (await mockApp(page)).populated = true;
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
});

test('copy feedback waits for the write and expires after success', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: (text: string) => new Promise<void>(resolve => {
        Object.assign(window, { copiedText: text, finishCopy: resolve });
      }),
    } });
  });
  await page.goto('/');
  const contact = new ContactPage(page);
  await contact.open();
  await contact.copy.click();
  await expect(contact.copy).toBeDisabled();
  await expect(contact.copyStatus).not.toContainText('Email copied');
  expect(await page.evaluate(() => (window as any).copiedText)).toBe('ianrholdeman@gmail.com');
  await page.evaluate(() => (window as any).finishCopy());
  await expect(contact.copyStatus).toHaveText('Email copied.');
  await expect(contact.copy).toBeEnabled();
  await page.clock.runFor(2001);
  await expect(contact.copyStatus).toBeEmpty();
});

for (const failure of ['rejected', 'unavailable'] as const) {
  test(`copy handles ${failure} access and permits recovery`, async ({ page }) => {
    await page.addInitScript(failure => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value:
        failure === 'unavailable' ? undefined : { writeText: () => Promise.reject(Error('denied')) },
      });
    }, failure);
    await page.goto('/');
    const contact = new ContactPage(page);
    await contact.open();
    await contact.copy.click();
    await expect(contact.copyStatus).toContainText('Could not copy');
    await expect(contact.copy).toBeEnabled();
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async () => {} },
    }));
    await contact.copy.click();
    await expect(contact.copyStatus).toHaveText('Email copied.');
  });
}

test('closing a pending copy prevents late feedback after reopening', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: () => new Promise<void>(resolve => {
      Object.assign(window, { finishCopy: resolve });
    }) },
  }));
  await page.goto('/');
  const contact = new ContactPage(page);
  await contact.open();
  await contact.copy.click();
  await contact.close.click();
  await contact.open();
  await page.evaluate(() => (window as any).finishCopy());
  await expect(contact.copyStatus).toBeEmpty();
  await expect(contact.copy).toBeEnabled();
});
