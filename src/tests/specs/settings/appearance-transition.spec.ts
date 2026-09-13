import { test, expect } from '../../fixtures/showcase-test';
import { mockApp } from '../../fixtures/auth';
import { HeaderComponent } from '../../pages/components/header.component';
import { SettingsPage } from '../../pages/settings.page';
import { settleSurfaceAnimations } from '../../pages/components/contrast';

test.use({ colorScheme: 'dark' });

test('Palette changes apply without intermediate color transitions and retain normal hover feedback', async ({ page, context, isMobile }) => {
  await mockApp(page, true);
  await page.goto('/settings');
  const header = new HeaderComponent(page), settings = new SettingsPage(page);
  await expect(settings.dark).toBeChecked();
  await header.appearanceButton.focus();
  await settleSurfaceAnimations(header.appearanceButton);
  await header.observePaletteTransitions();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await header.paletteTransitionsAfterPaint()).toEqual([]);
  await expect(header.appearanceAction('dark')).toBeFocused();
  // Finish normal focus/blur feedback before observing the next palette change.
  // WebKit can dispatch the header's outline transition after a pointer check starts.
  await settings.dark.focus();
  await settleSurfaceAnimations(header.appearanceButton);
  await header.paletteTransitionsAfterPaint();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await header.paletteTransitionsAfterPaint()).toEqual([]);

  const other = await context.newPage();
  await other.emulateMedia({ colorScheme: 'dark' });
  await mockApp(other, true);
  await other.goto('/settings');
  await new HeaderComponent(other).switchAppearance('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await header.paletteTransitionsAfterPaint()).toEqual([]);
  await other.close();

  await expect(header.appearanceButton).not.toHaveCSS('transition-duration', '0s');
  if (!isMobile) {
    await header.appearanceButton.hover();
    expect(await header.paletteTransitionsAfterPaint()).not.toEqual([]);
  }
});

test('Unsaved device appearance changes also apply without color interpolation', async ({ page }) => {
  await mockApp(page);
  await page.goto('/settings');
  const header = new HeaderComponent(page);
  await expect(header.appearanceAction('light')).toBeVisible();
  await header.observePaletteTransitions();
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await header.paletteTransitionsAfterPaint()).toEqual([]);
  }
  expect(await page.evaluate(() => localStorage.getItem('imt_appearance'))).toBeNull();
});
