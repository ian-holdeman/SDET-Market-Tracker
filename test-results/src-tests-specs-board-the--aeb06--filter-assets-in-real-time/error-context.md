# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\specs\board\the-board.spec.ts >> The Board - Watchlist Table & Data Filtering Suite >> should search and filter assets in real-time
- Location: src\tests\specs\board\the-board.spec.ts:44:3

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Array [
-   "GOOGL",
+   "googl",
  ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - generic [ref=e12] [cursor=pointer]:
        - generic [ref=e13]:
          - generic [ref=e14]: Ian's Market Tracker
          - generic [ref=e15]: SDET v1.0
        - paragraph [ref=e16]: Market Surveillance & Test Automation Suite
      - navigation [ref=e17]:
        - button "Home" [ref=e18]
        - button "The Board" [ref=e21]
        - button "The Tests" [ref=e29]
        - button "About" [ref=e36]
      - generic [ref=e44]:
        - generic [ref=e48]: "CI/CD:"
        - generic [ref=e49]: 100% PASS
  - generic [ref=e52]:
    - generic [ref=e53]: Market Feed
    - generic [ref=e57]:
      - generic [ref=e58]:
        - generic [ref=e59]: VTI
        - generic [ref=e60]: $377.07
        - generic [ref=e61]: "-0.31%"
      - generic [ref=e62]:
        - generic [ref=e63]: VOO
        - generic [ref=e64]: $701.83
        - generic [ref=e65]: "-0.27%"
      - generic [ref=e66]:
        - generic [ref=e67]: QQQM
        - generic [ref=e68]: $290.81
        - generic [ref=e69]: "-1.00%"
      - generic [ref=e70]:
        - generic [ref=e71]: NVDA
        - generic [ref=e72]: $208.48
        - generic [ref=e73]: "-2.91%"
      - generic [ref=e74]:
        - generic [ref=e75]: GOOGL
        - generic [ref=e76]: $348.06
        - generic [ref=e77]: +0.94%
      - generic [ref=e78]:
        - generic [ref=e79]: TSLA
        - generic [ref=e80]: $362.86
        - generic [ref=e81]: "-0.49%"
      - generic [ref=e82]:
        - generic [ref=e83]: SCHD
        - generic [ref=e84]: $35.21
        - generic [ref=e85]: +0.28%
      - generic [ref=e86]:
        - generic [ref=e87]: VXUS
        - generic [ref=e88]: $87.20
        - generic [ref=e89]: "-0.58%"
      - generic [ref=e90]:
        - generic [ref=e91]: VTI
        - generic [ref=e92]: $377.07
        - generic [ref=e93]: "-0.31%"
      - generic [ref=e94]:
        - generic [ref=e95]: VOO
        - generic [ref=e96]: $701.83
        - generic [ref=e97]: "-0.27%"
      - generic [ref=e98]:
        - generic [ref=e99]: QQQM
        - generic [ref=e100]: $290.81
        - generic [ref=e101]: "-1.00%"
      - generic [ref=e102]:
        - generic [ref=e103]: NVDA
        - generic [ref=e104]: $208.48
        - generic [ref=e105]: "-2.91%"
      - generic [ref=e106]:
        - generic [ref=e107]: GOOGL
        - generic [ref=e108]: $348.06
        - generic [ref=e109]: +0.94%
      - generic [ref=e110]:
        - generic [ref=e111]: TSLA
        - generic [ref=e112]: $362.86
        - generic [ref=e113]: "-0.49%"
      - generic [ref=e114]:
        - generic [ref=e115]: SCHD
        - generic [ref=e116]: $35.21
        - generic [ref=e117]: +0.28%
      - generic [ref=e118]:
        - generic [ref=e119]: VXUS
        - generic [ref=e120]: $87.20
        - generic [ref=e121]: "-0.58%"
  - main [ref=e122]:
    - generic [ref=e124]:
      - generic [ref=e125]:
        - heading "The Board" [level=1] [ref=e128]
        - generic [ref=e134]:
          - button "Live Synced" [ref=e135]
          - button "Refresh latest quotes from server proxy" [ref=e139]
      - generic [ref=e145]:
        - generic [ref=e146]:
          - generic [ref=e147]:
            - generic [ref=e148]:
              - textbox "Search stocks & ETFs..." [active] [ref=e149]: GOOGL
              - button "Clear search" [ref=e150]
            - generic [ref=e154]:
              - button "All" [ref=e155]
              - button "ETFs" [ref=e157]
              - button "Stocks" [ref=e158]
          - button "Expand all" [ref=e160]
        - table [ref=e168]:
          - rowgroup [ref=e169]:
            - row [ref=e170]:
              - columnheader "Name" [ref=e171] [cursor=pointer]
              - columnheader "Today's Trend" [ref=e177]
              - columnheader "Last Price" [ref=e178] [cursor=pointer]
              - columnheader "Today's Change" [ref=e182] [cursor=pointer]
              - columnheader "52W Range" [ref=e189]
          - rowgroup [ref=e191]:
            - row [ref=e192] [cursor=pointer]:
              - cell "GOOGL Stock Favorite Alphabet Inc. (Class A)" [ref=e193]:
                - generic [ref=e194]:
                  - generic "GOOGL Logo" [ref=e195]
                  - generic [ref=e201]:
                    - generic [ref=e202]:
                      - generic [ref=e203]: GOOGL
                      - generic [ref=e204]: Stock
                      - generic [ref=e205]: Favorite
                    - generic [ref=e206]: Alphabet Inc. (Class A)
              - cell [ref=e207]
              - cell "$344.82" [ref=e212]
              - cell "+1.22% +$4.15" [ref=e215]:
                - generic [ref=e217]:
                  - generic [ref=e218]: +1.22%
                  - generic [ref=e219]: +$4.15
              - cell "$205.28 52W $408.61" [ref=e221]:
                - generic [ref=e223]:
                  - generic [ref=e224]: $205.28
                  - generic [ref=e225]: 52W
                  - generic [ref=e226]: $408.61
        - generic [ref=e231]:
          - text: Showing
          - strong [ref=e232]: "1"
          - text: of
          - strong [ref=e233]: "49"
          - text: assets
  - contentinfo [ref=e234]:
    - generic [ref=e236]:
      - paragraph [ref=e237]: © 2026 Ian Holdeman
      - paragraph [ref=e238]: Public Market Data • Strict Read-Only
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { TheBoardPage } from '../../pages/the-board.page';
  3  | import { KNOWN_ASSETS } from '../../fixtures/test-data';
  4  | 
  5  | test.describe('The Board - Watchlist Table & Data Filtering Suite', () => {
  6  |   test('should render the full list of market assets by default', async ({ page }) => {
  7  |     const boardPage = new TheBoardPage(page);
  8  |     await boardPage.open();
  9  | 
  10 |     await expect(boardPage.pageHeading).toBeVisible();
  11 |     const rows = await boardPage.getVisibleRowSymbols();
  12 |     
  13 |     // Assert all baseline test assets appear
  14 |     for (const asset of KNOWN_ASSETS) {
  15 |       expect(rows).toContain(asset.symbol);
  16 |     }
  17 |   });
  18 | 
  19 |   test('should filter assets by type (ETFs and Stocks)', async ({ page }) => {
  20 |     const boardPage = new TheBoardPage(page);
  21 |     await boardPage.open();
  22 | 
  23 |     // 1. Filter by ETFs
  24 |     await boardPage.filterByEtfs();
  25 |     let rows = await boardPage.getVisibleRowSymbols();
  26 |     expect(rows).toContain('VTI');
  27 |     expect(rows).toContain('VOO');
  28 |     expect(rows).toContain('QQQM');
  29 |     expect(rows).not.toContain('GOOGL');
  30 | 
  31 |     // 2. Filter by Stocks
  32 |     await boardPage.filterByStocks();
  33 |     rows = await boardPage.getVisibleRowSymbols();
  34 |     expect(rows).toContain('GOOGL');
  35 |     expect(rows).not.toContain('VTI');
  36 |     expect(rows).not.toContain('VOO');
  37 | 
  38 |     // 3. Reset back to All
  39 |     await boardPage.filterByAll();
  40 |     rows = await boardPage.getVisibleRowSymbols();
  41 |     expect(rows.length).toBeGreaterThanOrEqual(KNOWN_ASSETS.length);
  42 |   });
  43 | 
  44 |   test('should search and filter assets in real-time', async ({ page }) => {
  45 |     const boardPage = new TheBoardPage(page);
  46 |     await boardPage.open();
  47 | 
  48 |     await boardPage.search('GOOGL');
  49 |     let rows = await boardPage.getVisibleRowSymbols();
> 50 |     expect(rows).toEqual(['GOOGL']);
     |                  ^ Error: expect(received).toEqual(expected) // deep equality
  51 | 
  52 |     await boardPage.clearSearch();
  53 |     rows = await boardPage.getVisibleRowSymbols();
  54 |     expect(rows.length).toBeGreaterThan(1);
  55 |   });
  56 | 
  57 |   test('should expand row and display stock detail card with Google Finance link', async ({ page }) => {
  58 |     const boardPage = new TheBoardPage(page);
  59 |     await boardPage.open();
  60 | 
  61 |     // Expand VTI row
  62 |     await boardPage.expandRow('VTI');
  63 |     const vtiCard = boardPage.getStockDetailCard('VTI');
  64 | 
  65 |     await expect(vtiCard.googleFinanceLink).toBeVisible();
  66 |     const href = await vtiCard.getGoogleFinanceUrl();
  67 |     expect(href).toContain('google.com/finance/quote/VTI');
  68 |   });
  69 | 
  70 |   test('should expand and collapse all rows simultaneously with the expand-all action', async ({ page }) => {
  71 |     const boardPage = new TheBoardPage(page);
  72 |     await boardPage.open();
  73 | 
  74 |     // Expand All
  75 |     await boardPage.toggleExpandAll();
  76 |     const vtiCard = boardPage.getStockDetailCard('VTI');
  77 |     await expect(vtiCard.googleFinanceLink).toBeVisible();
  78 | 
  79 |     // Collapse All
  80 |     await boardPage.toggleExpandAll();
  81 |     await expect(vtiCard.googleFinanceLink).not.toBeVisible();
  82 |   });
  83 | });
  84 | 
```