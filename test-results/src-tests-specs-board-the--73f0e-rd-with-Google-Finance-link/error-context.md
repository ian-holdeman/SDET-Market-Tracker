# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\specs\board\the-board.spec.ts >> The Board - Watchlist Table & Data Filtering Suite >> should expand row and display stock detail card with Google Finance link
- Location: src\tests\specs\board\the-board.spec.ts:57:3

# Error details

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('#board-row-VTI')

```

# Test source

```ts
  1   | import { Page, Locator } from '@playwright/test';
  2   | import { BasePage } from './base.page';
  3   | import { StockDetailCardComponent } from './components/stock-detail-card.component';
  4   | 
  5   | /**
  6   |  * TheBoardPage Object
  7   |  * 
  8   |  * Encapsulates the multi-asset watchlist roll table, search inputs,
  9   |  * asset type filters (All, ETFs, Stocks), expand-all toggles, and detail cards.
  10  |  */
  11  | export class TheBoardPage extends BasePage {
  12  |   readonly rootContainer: Locator;
  13  |   readonly pageHeading: Locator;
  14  |   readonly desktopSearchInput: Locator;
  15  |   readonly mobileSearchInput: Locator;
  16  |   readonly mobileSearchToggleBtn: Locator;
  17  |   readonly filterAllBtn: Locator;
  18  |   readonly filterEtfsBtn: Locator;
  19  |   readonly filterStocksBtn: Locator;
  20  |   readonly expandAllBtn: Locator;
  21  |   readonly stockRows: Locator;
  22  |   readonly summaryFooter: Locator;
  23  | 
  24  |   constructor(page: Page) {
  25  |     super(page);
  26  |     this.rootContainer = page.locator('#the-board-page');
  27  |     this.pageHeading = page.locator('#the-board-page h1:has-text("The Board")');
  28  |     this.desktopSearchInput = page.locator('#board-search-input-desktop');
  29  |     this.mobileSearchInput = page.locator('#board-search-input');
  30  |     this.mobileSearchToggleBtn = page.locator('#board-search-toggle-btn');
  31  |     this.filterAllBtn = page.locator('#board-filter-all-btn');
  32  |     this.filterEtfsBtn = page.locator('#board-filter-etf-btn');
  33  |     this.filterStocksBtn = page.locator('#board-filter-stock-btn');
  34  |     this.expandAllBtn = page.locator('#board-expand-all-btn');
  35  |     this.stockRows = page.locator('tbody tr[id*="board-row-"]');
  36  |     this.summaryFooter = page.locator('#the-board-page div:has-text("Showing")').last();
  37  |   }
  38  | 
  39  |   async open(): Promise<void> {
  40  |     await this.navigateTo();
  41  |     await this.header.navigateToBoard();
  42  |     await this.pageHeading.waitFor({ state: 'visible' });
  43  |   }
  44  | 
  45  |   async search(query: string): Promise<void> {
  46  |     const isDesktop = await this.desktopSearchInput.isVisible();
  47  |     if (isDesktop) {
  48  |       await this.desktopSearchInput.fill(query);
  49  |     } else {
  50  |       const isMobileInputVisible = await this.mobileSearchInput.isVisible();
  51  |       if (!isMobileInputVisible) {
  52  |         await this.mobileSearchToggleBtn.click();
  53  |       }
  54  |       await this.mobileSearchInput.fill(query);
  55  |     }
  56  |   }
  57  | 
  58  |   async clearSearch(): Promise<void> {
  59  |     const isDesktop = await this.desktopSearchInput.isVisible();
  60  |     if (isDesktop) {
  61  |       await this.desktopSearchInput.fill('');
  62  |     } else if (await this.mobileSearchInput.isVisible()) {
  63  |       await this.mobileSearchInput.fill('');
  64  |     }
  65  |   }
  66  | 
  67  |   async filterByAll(): Promise<void> {
  68  |     await this.filterAllBtn.click();
  69  |   }
  70  | 
  71  |   async filterByEtfs(): Promise<void> {
  72  |     await this.filterEtfsBtn.click();
  73  |   }
  74  | 
  75  |   async filterByStocks(): Promise<void> {
  76  |     await this.filterStocksBtn.click();
  77  |   }
  78  | 
  79  |   async toggleExpandAll(): Promise<void> {
  80  |     await this.expandAllBtn.click();
  81  |   }
  82  | 
  83  |   async expandRow(symbol: string): Promise<void> {
  84  |     const row = this.page.locator(`#board-row-${symbol}`);
> 85  |     await row.click();
      |               ^ Error: locator.click: Target page, context or browser has been closed
  86  |   }
  87  | 
  88  |   getStockDetailCard(symbol: string): StockDetailCardComponent {
  89  |     return new StockDetailCardComponent(this.page, symbol);
  90  |   }
  91  | 
  92  |   async getVisibleRowSymbols(): Promise<string[]> {
  93  |     return await this.stockRows.evaluateAll(rows => 
  94  |       rows.map(r => r.id.replace('board-row-', ''))
  95  |     );
  96  |   }
  97  | 
  98  |   async getSummaryCountText(): Promise<string> {
  99  |     return await this.summaryFooter.innerText();
  100 |   }
  101 | }
  102 | 
```