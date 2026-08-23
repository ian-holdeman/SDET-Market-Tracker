import { test, expect } from '@playwright/test';
import { TheBoardPage } from '../../pages/the-board.page';
import { KNOWN_ASSETS } from '../../fixtures/test-data';

test.describe('The Board - Watchlist Table & Data Filtering Suite', () => {
  test('should render the full list of market assets by default', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    await expect(boardPage.pageHeading).toBeVisible();
    const rows = await boardPage.getVisibleRowSymbols();
    
    // Assert all baseline test assets appear
    for (const asset of KNOWN_ASSETS) {
      expect(rows).toContain(asset.symbol);
    }
  });

  test('should filter assets by type (ETFs and Stocks)', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    // 1. Filter by ETFs
    await boardPage.filterByEtfs();
    let rows = await boardPage.getVisibleRowSymbols();
    expect(rows).toContain('SPY');
    expect(rows).toContain('QQQ');
    expect(rows).not.toContain('GOOGL');

    // 2. Filter by Stocks
    await boardPage.filterByStocks();
    rows = await boardPage.getVisibleRowSymbols();
    expect(rows).toContain('GOOGL');
    expect(rows).not.toContain('SPY');

    // 3. Reset back to All
    await boardPage.filterByAll();
    rows = await boardPage.getVisibleRowSymbols();
    expect(rows.length).toBeGreaterThanOrEqual(KNOWN_ASSETS.length);
  });

  test('should search and filter assets in real-time', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    await boardPage.search('GOOGL');
    let rows = await boardPage.getVisibleRowSymbols();
    expect(rows).toEqual(['GOOGL']);

    await boardPage.clearSearch();
    rows = await boardPage.getVisibleRowSymbols();
    expect(rows.length).toBeGreaterThan(1);
  });

  test('should expand row and display stock detail card with Google Finance link', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    // Expand SPY row
    await boardPage.expandRow('SPY');
    const spyCard = boardPage.getStockDetailCard('SPY');

    await expect(spyCard.googleFinanceLink).toBeVisible();
    const href = await spyCard.getGoogleFinanceUrl();
    expect(href).toContain('google.com/finance/quote/SPY');
  });

  test('should expand and collapse all rows simultaneously with the expand-all action', async ({ page }) => {
    const boardPage = new TheBoardPage(page);
    await boardPage.open();

    // Expand All
    await boardPage.toggleExpandAll();
    const spyCard = boardPage.getStockDetailCard('SPY');
    await expect(spyCard.googleFinanceLink).toBeVisible();

    // Collapse All
    await boardPage.toggleExpandAll();
    await expect(spyCard.googleFinanceLink).not.toBeVisible();
  });
});
