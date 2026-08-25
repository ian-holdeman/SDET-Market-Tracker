# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: src\tests\specs\board\the-board.spec.ts >> The Board - Watchlist Table & Data Filtering Suite >> should filter assets by type (ETFs and Stocks)
- Location: src\tests\specs\board\the-board.spec.ts:19:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#board-filter-etf-btn')

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
        - button "The Board" [active] [ref=e21]
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
          - button "Live Synced | 6:13:25 PM" [ref=e135]:
            - generic [ref=e137]: Live Synced
            - generic [ref=e138]: "|"
            - generic [ref=e139]: 6:13:25 PM
          - button "Refresh latest quotes from server proxy" [ref=e141]
      - generic [ref=e147]:
        - generic [ref=e148]:
          - generic [ref=e149]:
            - textbox "Search stocks & ETFs..." [ref=e151]
            - generic [ref=e152]:
              - button "All" [ref=e153]
              - button "ETFs" [ref=e155]
              - button "Stocks" [ref=e156]
          - button "Expand all" [ref=e158]
        - table [ref=e166]:
          - rowgroup [ref=e167]:
            - row [ref=e168]:
              - columnheader "Name" [ref=e169] [cursor=pointer]
              - columnheader "Today's Trend" [ref=e175]
              - columnheader "Last Price" [ref=e176] [cursor=pointer]
              - columnheader "Today's Change" [ref=e180] [cursor=pointer]
              - columnheader "52W Range" [ref=e187]
          - rowgroup [ref=e189]:
            - row [ref=e190] [cursor=pointer]:
              - cell "MU Stock Favorite Micron Technology, Inc." [ref=e191]:
                - generic [ref=e192]:
                  - generic "MU Logo" [ref=e193]
                  - generic [ref=e198]:
                    - generic [ref=e199]:
                      - generic [ref=e200]: MU
                      - generic [ref=e201]: Stock
                      - generic [ref=e202]: Favorite
                    - generic [ref=e203]: Micron Technology, Inc.
              - cell [ref=e204]
              - cell "$910.43" [ref=e209]
              - cell "-5.83% -$56.35" [ref=e212]:
                - generic [ref=e214]:
                  - generic [ref=e215]: "-5.83%"
                  - generic [ref=e216]: "-$56.35"
              - cell "$114.25 52W $1255.00" [ref=e218]:
                - generic [ref=e220]:
                  - generic [ref=e221]: $114.25
                  - generic [ref=e222]: 52W
                  - generic [ref=e223]: $1255.00
            - row [ref=e227] [cursor=pointer]:
              - cell "VOO ETF Favorite Vanguard S&P 500 ETF" [ref=e228]:
                - generic [ref=e229]:
                  - generic "VOO Logo" [ref=e230]
                  - generic [ref=e235]:
                    - generic [ref=e236]:
                      - generic [ref=e237]: VOO
                      - generic [ref=e238]: ETF
                      - generic [ref=e239]: Favorite
                    - generic [ref=e240]: Vanguard S&P 500 ETF
              - cell [ref=e241]
              - cell "$701.83" [ref=e246]
              - cell "-0.27% -$1.88" [ref=e249]:
                - generic [ref=e251]:
                  - generic [ref=e252]: "-0.27%"
                  - generic [ref=e253]: "-$1.88"
              - cell "$578.46 52W $716.39" [ref=e255]:
                - generic [ref=e257]:
                  - generic [ref=e258]: $578.46
                  - generic [ref=e259]: 52W
                  - generic [ref=e260]: $716.39
            - row [ref=e264] [cursor=pointer]:
              - cell "GOOGL Stock Favorite Alphabet Inc. (Class A)" [ref=e265]:
                - generic [ref=e266]:
                  - generic "GOOGL Logo" [ref=e267]
                  - generic [ref=e273]:
                    - generic [ref=e274]:
                      - generic [ref=e275]: GOOGL
                      - generic [ref=e276]: Stock
                      - generic [ref=e277]: Favorite
                    - generic [ref=e278]: Alphabet Inc. (Class A)
              - cell [ref=e279]
              - cell "$348.06" [ref=e284]
              - cell "+0.94% +$3.24" [ref=e287]:
                - generic [ref=e289]:
                  - generic [ref=e290]: +0.94%
                  - generic [ref=e291]: +$3.24
              - cell "$205.28 52W $408.61" [ref=e293]:
                - generic [ref=e295]:
                  - generic [ref=e296]: $205.28
                  - generic [ref=e297]: 52W
                  - generic [ref=e298]: $408.61
            - row [ref=e302] [cursor=pointer]:
              - cell "QQQM ETF Favorite Invesco NASDAQ 100 ETF" [ref=e303]:
                - generic [ref=e304]:
                  - generic "QQQM Logo" [ref=e305]
                  - generic [ref=e311]:
                    - generic [ref=e312]:
                      - generic [ref=e313]: QQQM
                      - generic [ref=e314]: ETF
                      - generic [ref=e315]: Favorite
                    - generic [ref=e316]: Invesco NASDAQ 100 ETF
              - cell [ref=e317]
              - cell "$290.81" [ref=e322]
              - cell "-1.00% -$2.95" [ref=e325]:
                - generic [ref=e327]:
                  - generic [ref=e328]: "-1.00%"
                  - generic [ref=e329]: "-$2.95"
              - cell "$228.75 52W $308.21" [ref=e331]:
                - generic [ref=e333]:
                  - generic [ref=e334]: $228.75
                  - generic [ref=e335]: 52W
                  - generic [ref=e336]: $308.21
            - row [ref=e340] [cursor=pointer]:
              - cell "SPMO ETF Favorite Invesco S&P 500 Momentum ETF" [ref=e341]:
                - generic [ref=e342]:
                  - generic "SPMO Logo" [ref=e343]
                  - generic [ref=e348]:
                    - generic [ref=e349]:
                      - generic [ref=e350]: SPMO
                      - generic [ref=e351]: ETF
                      - generic [ref=e352]: Favorite
                    - generic [ref=e353]: Invesco S&P 500 Momentum ETF
              - cell [ref=e354]
              - cell "$146.14" [ref=e359]
              - cell "-1.74% -$2.59" [ref=e362]:
                - generic [ref=e364]:
                  - generic [ref=e365]: "-1.74%"
                  - generic [ref=e366]: "-$2.59"
              - cell "$107.24 52W $162.30" [ref=e368]:
                - generic [ref=e370]:
                  - generic [ref=e371]: $107.24
                  - generic [ref=e372]: 52W
                  - generic [ref=e373]: $162.30
            - row [ref=e377] [cursor=pointer]:
              - cell "RKLB Stock Favorite Rocket Lab USA, Inc." [ref=e378]:
                - generic [ref=e379]:
                  - generic "RKLB Logo" [ref=e380]
                  - generic [ref=e384]:
                    - generic [ref=e385]:
                      - generic [ref=e386]: RKLB
                      - generic [ref=e387]: Stock
                      - generic [ref=e388]: Favorite
                    - generic [ref=e389]: Rocket Lab USA, Inc.
              - cell [ref=e390]
              - cell "$68.28" [ref=e395]
              - cell "-5.91% -$4.29" [ref=e398]:
                - generic [ref=e400]:
                  - generic [ref=e401]: "-5.91%"
                  - generic [ref=e402]: "-$4.29"
              - cell "$37.57 52W $151.00" [ref=e404]:
                - generic [ref=e406]:
                  - generic [ref=e407]: $37.57
                  - generic [ref=e408]: 52W
                  - generic [ref=e409]: $151.00
            - row [ref=e413] [cursor=pointer]:
              - cell "SCHD ETF Favorite Schwab U.S. Dividend Equity ETF" [ref=e414]:
                - generic [ref=e415]:
                  - generic "SCHD Logo" [ref=e416]
                  - generic [ref=e420]:
                    - generic [ref=e421]:
                      - generic [ref=e422]: SCHD
                      - generic [ref=e423]: ETF
                      - generic [ref=e424]: Favorite
                    - generic [ref=e425]: Schwab U.S. Dividend Equity ETF
              - cell [ref=e426]
              - cell "$35.21" [ref=e431]
              - cell "+0.28% +$0.10" [ref=e434]:
                - generic [ref=e436]:
                  - generic [ref=e437]: +0.28%
                  - generic [ref=e438]: +$0.10
              - cell "$26.32 52W $35.31" [ref=e440]:
                - generic [ref=e442]:
                  - generic [ref=e443]: $26.32
                  - generic [ref=e444]: 52W
                  - generic [ref=e445]: $35.31
            - row [ref=e449] [cursor=pointer]:
              - cell "SOFI Stock Favorite SoFi Technologies, Inc." [ref=e450]:
                - generic [ref=e451]:
                  - generic "SOFI Logo" [ref=e452]
                  - generic [ref=e459]:
                    - generic [ref=e460]:
                      - generic [ref=e461]: SOFI
                      - generic [ref=e462]: Stock
                      - generic [ref=e463]: Favorite
                    - generic [ref=e464]: SoFi Technologies, Inc.
              - cell [ref=e465]
              - cell "$18.24" [ref=e470]
              - cell "-3.54% -$0.67" [ref=e473]:
                - generic [ref=e475]:
                  - generic [ref=e476]: "-3.54%"
                  - generic [ref=e477]: "-$0.67"
              - cell "$14.88 52W $32.73" [ref=e479]:
                - generic [ref=e481]:
                  - generic [ref=e482]: $14.88
                  - generic [ref=e483]: 52W
                  - generic [ref=e484]: $32.73
            - row [ref=e488] [cursor=pointer]:
              - cell "AIRJ Stock Favorite Montana Aerospace AG" [ref=e489]:
                - generic [ref=e490]:
                  - generic "AIRJ Logo" [ref=e491]
                  - generic [ref=e496]:
                    - generic [ref=e497]:
                      - generic [ref=e498]: AIRJ
                      - generic [ref=e499]: Stock
                      - generic [ref=e500]: Favorite
                    - generic [ref=e501]: Montana Aerospace AG
              - cell [ref=e502]
              - cell "$5.01" [ref=e507]
              - cell "-0.20% -$0.01" [ref=e510]:
                - generic [ref=e512]:
                  - generic [ref=e513]: "-0.20%"
                  - generic [ref=e514]: "-$0.01"
              - cell "$2.22 52W $6.75" [ref=e516]:
                - generic [ref=e518]:
                  - generic [ref=e519]: $2.22
                  - generic [ref=e520]: 52W
                  - generic [ref=e521]: $6.75
            - row [ref=e525] [cursor=pointer]:
              - cell "FBIO Stock Favorite Fortress Biotech, Inc." [ref=e526]:
                - generic [ref=e527]:
                  - generic "FBIO Logo" [ref=e528]
                  - generic [ref=e533]:
                    - generic [ref=e534]:
                      - generic [ref=e535]: FBIO
                      - generic [ref=e536]: Stock
                      - generic [ref=e537]: Favorite
                    - generic [ref=e538]: Fortress Biotech, Inc.
              - cell [ref=e539]
              - cell "$2.93" [ref=e544]
              - cell "+2.09% +$0.06" [ref=e547]:
                - generic [ref=e549]:
                  - generic [ref=e550]: +2.09%
                  - generic [ref=e551]: +$0.06
              - cell "$2.18 52W $4.53" [ref=e553]:
                - generic [ref=e555]:
                  - generic [ref=e556]: $2.18
                  - generic [ref=e557]: 52W
                  - generic [ref=e558]: $4.53
            - row [ref=e562] [cursor=pointer]:
              - cell "SNDK Stock SanDisk / Flash Memory" [ref=e563]:
                - generic [ref=e564]:
                  - generic "SNDK Logo" [ref=e565]:
                    - img [ref=e566]:
                      - generic [ref=e568]: SD
                  - generic [ref=e569]:
                    - generic [ref=e570]:
                      - generic [ref=e571]: SNDK
                      - generic [ref=e572]: Stock
                    - generic [ref=e573]: SanDisk / Flash Memory
              - cell [ref=e574]
              - cell "$1493.12" [ref=e579]
              - cell "-6.45% -$102.96" [ref=e582]:
                - generic [ref=e584]:
                  - generic [ref=e585]: "-6.45%"
                  - generic [ref=e586]: "-$102.96"
              - cell "$46.01 52W $2354.39" [ref=e588]:
                - generic [ref=e590]:
                  - generic [ref=e591]: $46.01
                  - generic [ref=e592]: 52W
                  - generic [ref=e593]: $2354.39
            - row [ref=e597] [cursor=pointer]:
              - cell "META Stock Meta Platforms, Inc." [ref=e598]:
                - generic [ref=e599]:
                  - generic "META Logo" [ref=e600]
                  - generic [ref=e604]:
                    - generic [ref=e605]:
                      - generic [ref=e606]: META
                      - generic [ref=e607]: Stock
                    - generic [ref=e608]: Meta Platforms, Inc.
              - cell [ref=e609]
              - cell "$559.02" [ref=e614]
              - cell "+1.66% +$9.12" [ref=e617]:
                - generic [ref=e619]:
                  - generic [ref=e620]: +1.66%
                  - generic [ref=e621]: +$9.12
              - cell "$520.26 52W $790.80" [ref=e623]:
                - generic [ref=e625]:
                  - generic [ref=e626]: $520.26
                  - generic [ref=e627]: 52W
                  - generic [ref=e628]: $790.80
            - row [ref=e632] [cursor=pointer]:
              - cell "DIA ETF SPDR Dow Jones Industrial Average ETF" [ref=e633]:
                - generic [ref=e634]:
                  - generic "DIA Logo" [ref=e635]
                  - generic [ref=e640]:
                    - generic [ref=e641]:
                      - generic [ref=e642]: DIA
                      - generic [ref=e643]: ETF
                    - generic [ref=e644]: SPDR Dow Jones Industrial Average ETF
              - cell [ref=e645]
              - cell "$533.65" [ref=e650]
              - cell "+0.27% +$1.43" [ref=e653]:
                - generic [ref=e655]:
                  - generic [ref=e656]: +0.27%
                  - generic [ref=e657]: +$1.43
              - cell "$450.16 52W $546.75" [ref=e659]:
                - generic [ref=e661]:
                  - generic [ref=e662]: $450.16
                  - generic [ref=e663]: 52W
                  - generic [ref=e664]: $546.75
            - row [ref=e668] [cursor=pointer]:
              - cell "MSFT Stock Microsoft Corporation" [ref=e669]:
                - generic [ref=e670]:
                  - generic "MSFT Logo" [ref=e671]
                  - generic [ref=e677]:
                    - generic [ref=e678]:
                      - generic [ref=e679]: MSFT
                      - generic [ref=e680]: Stock
                    - generic [ref=e681]: Microsoft Corporation
              - cell [ref=e682]
              - cell "$487.31" [ref=e687]
              - cell "+0.84% +$4.07" [ref=e690]:
                - generic [ref=e692]:
                  - generic [ref=e693]: +0.84%
                  - generic [ref=e694]: +$4.07
              - cell "$349.20 52W $553.72" [ref=e696]:
                - generic [ref=e698]:
                  - generic [ref=e699]: $349.20
                  - generic [ref=e700]: 52W
                  - generic [ref=e701]: $553.72
            - row [ref=e705] [cursor=pointer]:
              - cell "AMD Stock Advanced Micro Devices, Inc." [ref=e706]:
                - generic [ref=e707]:
                  - generic "AMD Logo" [ref=e708]
                  - generic [ref=e714]:
                    - generic [ref=e715]:
                      - generic [ref=e716]: AMD
                      - generic [ref=e717]: Stock
                    - generic [ref=e718]: Advanced Micro Devices, Inc.
              - cell [ref=e719]
              - cell "$456.75" [ref=e724]
              - cell "-3.49% -$16.50" [ref=e727]:
                - generic [ref=e729]:
                  - generic [ref=e730]: "-3.49%"
                  - generic [ref=e731]: "-$16.50"
              - cell "$149.22 52W $584.73" [ref=e733]:
                - generic [ref=e735]:
                  - generic [ref=e736]: $149.22
                  - generic [ref=e737]: 52W
                  - generic [ref=e738]: $584.73
            - row [ref=e742] [cursor=pointer]:
              - cell "WDC Stock Western Digital Corporation" [ref=e743]:
                - generic [ref=e744]:
                  - generic "WDC Logo" [ref=e745]:
                    - img [ref=e746]:
                      - generic [ref=e748]: WD
                  - generic [ref=e749]:
                    - generic [ref=e750]:
                      - generic [ref=e751]: WDC
                      - generic [ref=e752]: Stock
                    - generic [ref=e753]: Western Digital Corporation
              - cell [ref=e754]
              - cell "$435.38" [ref=e759]
              - cell "-5.24% -$24.06" [ref=e762]:
                - generic [ref=e764]:
                  - generic [ref=e765]: "-5.24%"
                  - generic [ref=e766]: "-$24.06"
              - cell "$76.70 52W $799.87" [ref=e768]:
                - generic [ref=e770]:
                  - generic [ref=e771]: $76.70
                  - generic [ref=e772]: 52W
                  - generic [ref=e773]: $799.87
            - row [ref=e777] [cursor=pointer]:
              - cell "VTI ETF Vanguard Total Stock Market ETF" [ref=e778]:
                - generic [ref=e779]:
                  - generic "VTI Logo" [ref=e780]
                  - generic [ref=e785]:
                    - generic [ref=e786]:
                      - generic [ref=e787]: VTI
                      - generic [ref=e788]: ETF
                    - generic [ref=e789]: Vanguard Total Stock Market ETF
              - cell [ref=e790]
              - cell "$377.07" [ref=e795]
              - cell "-0.31% -$1.17" [ref=e798]:
                - generic [ref=e800]:
                  - generic [ref=e801]: "-0.31%"
                  - generic [ref=e802]: "-$1.17"
              - cell "$310.40 52W $385.12" [ref=e804]:
                - generic [ref=e806]:
                  - generic [ref=e807]: $310.40
                  - generic [ref=e808]: 52W
                  - generic [ref=e809]: $385.12
            - row [ref=e813] [cursor=pointer]:
              - cell "ISRG Stock Intuitive Surgical, Inc." [ref=e814]:
                - generic [ref=e815]:
                  - generic "ISRG Logo" [ref=e816]
                  - generic [ref=e822]:
                    - generic [ref=e823]:
                      - generic [ref=e824]: ISRG
                      - generic [ref=e825]: Stock
                    - generic [ref=e826]: Intuitive Surgical, Inc.
              - cell [ref=e827]
              - cell "$373.57" [ref=e832]
              - cell "-1.38% -$5.24" [ref=e835]:
                - generic [ref=e837]:
                  - generic [ref=e838]: "-1.38%"
                  - generic [ref=e839]: "-$5.24"
              - cell "$328.57 52W $603.88" [ref=e841]:
                - generic [ref=e843]:
                  - generic [ref=e844]: $328.57
                  - generic [ref=e845]: 52W
                  - generic [ref=e846]: $603.88
            - row [ref=e850] [cursor=pointer]:
              - cell "PANW Stock Palo Alto Networks, Inc." [ref=e851]:
                - generic [ref=e852]:
                  - generic "PANW Logo" [ref=e853]
                  - generic [ref=e860]:
                    - generic [ref=e861]:
                      - generic [ref=e862]: PANW
                      - generic [ref=e863]: Stock
                    - generic [ref=e864]: Palo Alto Networks, Inc.
              - cell [ref=e865]
              - cell "$350.90" [ref=e870]
              - cell "-1.95% -$6.97" [ref=e873]:
                - generic [ref=e875]:
                  - generic [ref=e876]: "-1.95%"
                  - generic [ref=e877]: "-$6.97"
              - cell "$139.57 52W $398.88" [ref=e879]:
                - generic [ref=e881]:
                  - generic [ref=e882]: $139.57
                  - generic [ref=e883]: 52W
                  - generic [ref=e884]: $398.88
            - row [ref=e888] [cursor=pointer]:
              - cell "TSLA Stock Tesla, Inc." [ref=e889]:
                - generic [ref=e890]:
                  - generic "TSLA Logo" [ref=e891]
                  - generic [ref=e895]:
                    - generic [ref=e896]:
                      - generic [ref=e897]: TSLA
                      - generic [ref=e898]: Stock
                    - generic [ref=e899]: Tesla, Inc.
              - cell [ref=e900]
              - cell "$348.95" [ref=e905]
              - cell "-3.83% -$13.91" [ref=e908]:
                - generic [ref=e910]:
                  - generic [ref=e911]: "-3.83%"
                  - generic [ref=e912]: "-$13.91"
              - cell "$297.38 52W $498.83" [ref=e914]:
                - generic [ref=e916]:
                  - generic [ref=e917]: $297.38
                  - generic [ref=e918]: 52W
                  - generic [ref=e919]: $498.83
            - row [ref=e923] [cursor=pointer]:
              - cell "AAPL Stock Apple Inc." [ref=e924]:
                - generic [ref=e925]:
                  - generic "AAPL Logo" [ref=e926]
                  - generic [ref=e931]:
                    - generic [ref=e932]:
                      - generic [ref=e933]: AAPL
                      - generic [ref=e934]: Stock
                    - generic [ref=e935]: Apple Inc.
              - cell [ref=e936]
              - cell "$310.34" [ref=e941]
              - cell "+0.32% +$0.99" [ref=e944]:
                - generic [ref=e946]:
                  - generic [ref=e947]: +0.32%
                  - generic [ref=e948]: +$0.99
              - cell "$224.69 52W $344.57" [ref=e950]:
                - generic [ref=e952]:
                  - generic [ref=e953]: $224.69
                  - generic [ref=e954]: 52W
                  - generic [ref=e955]: $344.57
            - row [ref=e959] [cursor=pointer]:
              - cell "IWM ETF iShares Russell 2000 ETF" [ref=e960]:
                - generic [ref=e961]:
                  - generic "IWM Logo" [ref=e962]:
                    - img [ref=e963]:
                      - generic [ref=e966]: i
                  - generic [ref=e967]:
                    - generic [ref=e968]:
                      - generic [ref=e969]: IWM
                      - generic [ref=e970]: ETF
                    - generic [ref=e971]: iShares Russell 2000 ETF
              - cell [ref=e972]
              - cell "$297.97" [ref=e977]
              - cell "-0.66% -$1.99" [ref=e980]:
                - generic [ref=e982]:
                  - generic [ref=e983]: "-0.66%"
                  - generic [ref=e984]: "-$1.99"
              - cell "$228.90 52W $305.18" [ref=e986]:
                - generic [ref=e988]:
                  - generic [ref=e989]: $228.90
                  - generic [ref=e990]: 52W
                  - generic [ref=e991]: $305.18
            - row [ref=e995] [cursor=pointer]:
              - cell "FTEC ETF Fidelity MSCI Information Technology Index ETF" [ref=e996]:
                - generic [ref=e997]:
                  - generic "FTEC Logo" [ref=e998]
                  - generic [ref=e1003]:
                    - generic [ref=e1004]:
                      - generic [ref=e1005]: FTEC
                      - generic [ref=e1006]: ETF
                    - generic [ref=e1007]: Fidelity MSCI Information Technology Index ETF
              - cell [ref=e1008]
              - cell "$277.79" [ref=e1013]
              - cell "-1.71% -$4.83" [ref=e1016]:
                - generic [ref=e1018]:
                  - generic [ref=e1019]: "-1.71%"
                  - generic [ref=e1020]: "-$4.83"
              - cell "$198.17 52W $300.79" [ref=e1022]:
                - generic [ref=e1024]:
                  - generic [ref=e1025]: $198.17
                  - generic [ref=e1026]: 52W
                  - generic [ref=e1027]: $300.79
            - row [ref=e1031] [cursor=pointer]:
              - cell "AMZN Stock Amazon.com, Inc." [ref=e1032]:
                - generic [ref=e1033]:
                  - generic "AMZN Logo" [ref=e1034]:
                    - img [ref=e1035]:
                      - generic [ref=e1037]: a
                  - generic [ref=e1040]:
                    - generic [ref=e1041]:
                      - generic [ref=e1042]: AMZN
                      - generic [ref=e1043]: Stock
                    - generic [ref=e1044]: Amazon.com, Inc.
              - cell [ref=e1045]
              - cell "$262.07" [ref=e1050]
              - cell "+1.33% +$3.44" [ref=e1053]:
                - generic [ref=e1055]:
                  - generic [ref=e1056]: +1.33%
                  - generic [ref=e1057]: +$3.44
              - cell "$196.00 52W $287.20" [ref=e1059]:
                - generic [ref=e1061]:
                  - generic [ref=e1062]: $196.00
                  - generic [ref=e1063]: 52W
                  - generic [ref=e1064]: $287.20
            - row [ref=e1068] [cursor=pointer]:
              - cell "IBM Stock International Business Machines" [ref=e1069]:
                - generic [ref=e1070]:
                  - generic "IBM Logo" [ref=e1071]:
                    - img [ref=e1072]:
                      - generic [ref=e1074]: IBM
                  - generic [ref=e1075]:
                    - generic [ref=e1076]:
                      - generic [ref=e1077]: IBM
                      - generic [ref=e1078]: Stock
                    - generic [ref=e1079]: International Business Machines
              - cell [ref=e1080]
              - cell "$231.04" [ref=e1085]
              - cell "-1.97% -$4.64" [ref=e1088]:
                - generic [ref=e1090]:
                  - generic [ref=e1091]: "-1.97%"
                  - generic [ref=e1092]: "-$4.64"
              - cell "$199.19 52W $332.46" [ref=e1094]:
                - generic [ref=e1096]:
                  - generic [ref=e1097]: $199.19
                  - generic [ref=e1098]: 52W
                  - generic [ref=e1099]: $332.46
            - row [ref=e1103] [cursor=pointer]:
              - cell "MRVL Stock Marvell Technology, Inc." [ref=e1104]:
                - generic [ref=e1105]:
                  - generic "MRVL Logo" [ref=e1106]
                  - generic [ref=e1110]:
                    - generic [ref=e1111]:
                      - generic [ref=e1112]: MRVL
                      - generic [ref=e1113]: Stock
                    - generic [ref=e1114]: Marvell Technology, Inc.
              - cell [ref=e1115]
              - cell "$229.29" [ref=e1120]
              - cell "-3.27% -$7.75" [ref=e1123]:
                - generic [ref=e1125]:
                  - generic [ref=e1126]: "-3.27%"
                  - generic [ref=e1127]: "-$7.75"
              - cell "$61.44 52W $329.88" [ref=e1129]:
                - generic [ref=e1131]:
                  - generic [ref=e1132]: $61.44
                  - generic [ref=e1133]: 52W
                  - generic [ref=e1134]: $329.88
            - row [ref=e1138] [cursor=pointer]:
              - cell "NVDA Stock NVIDIA Corporation" [ref=e1139]:
                - generic [ref=e1140]:
                  - generic "NVDA Logo" [ref=e1141]
                  - generic [ref=e1145]:
                    - generic [ref=e1146]:
                      - generic [ref=e1147]: NVDA
                      - generic [ref=e1148]: Stock
                    - generic [ref=e1149]: NVIDIA Corporation
              - cell [ref=e1150]
              - cell "$208.48" [ref=e1155]
              - cell "-2.91% -$6.24" [ref=e1158]:
                - generic [ref=e1160]:
                  - generic [ref=e1161]: "-2.91%"
                  - generic [ref=e1162]: "-$6.24"
              - cell "$164.07 52W $236.54" [ref=e1164]:
                - generic [ref=e1166]:
                  - generic [ref=e1167]: $164.07
                  - generic [ref=e1168]: 52W
                  - generic [ref=e1169]: $236.54
            - row [ref=e1173] [cursor=pointer]:
              - cell "CRWD Stock CrowdStrike Holdings, Inc." [ref=e1174]:
                - generic [ref=e1175]:
                  - generic "CRWD Logo" [ref=e1176]
                  - generic [ref=e1180]:
                    - generic [ref=e1181]:
                      - generic [ref=e1182]: CRWD
                      - generic [ref=e1183]: Stock
                    - generic [ref=e1184]: CrowdStrike Holdings, Inc.
              - cell [ref=e1185]
              - cell "$190.68" [ref=e1190]
              - cell "-0.66% -$1.27" [ref=e1193]:
                - generic [ref=e1195]:
                  - generic [ref=e1196]: "-0.66%"
                  - generic [ref=e1197]: "-$1.27"
              - cell "$85.68 52W $227.50" [ref=e1199]:
                - generic [ref=e1201]:
                  - generic [ref=e1202]: $85.68
                  - generic [ref=e1203]: 52W
                  - generic [ref=e1204]: $227.50
            - row [ref=e1208] [cursor=pointer]:
              - cell "COIN Stock Coinbase Global, Inc." [ref=e1209]:
                - generic [ref=e1210]:
                  - generic "COIN Logo" [ref=e1211]
                  - generic [ref=e1216]:
                    - generic [ref=e1217]:
                      - generic [ref=e1218]: COIN
                      - generic [ref=e1219]: Stock
                    - generic [ref=e1220]: Coinbase Global, Inc.
              - cell [ref=e1221]
              - cell "$179.48" [ref=e1226]
              - cell "-3.76% -$7.01" [ref=e1229]:
                - generic [ref=e1231]:
                  - generic [ref=e1232]: "-3.76%"
                  - generic [ref=e1233]: "-$7.01"
              - cell "$139.11 52W $402.16" [ref=e1235]:
                - generic [ref=e1237]:
                  - generic [ref=e1238]: $139.11
                  - generic [ref=e1239]: 52W
                  - generic [ref=e1240]: $402.16
            - row [ref=e1244] [cursor=pointer]:
              - cell "ORCL Stock Oracle Corporation" [ref=e1245]:
                - generic [ref=e1246]:
                  - generic "ORCL Logo" [ref=e1247]
                  - generic [ref=e1251]:
                    - generic [ref=e1252]:
                      - generic [ref=e1253]: ORCL
                      - generic [ref=e1254]: Stock
                    - generic [ref=e1255]: Oracle Corporation
              - cell [ref=e1256]
              - cell "$142.45" [ref=e1261]
              - cell "-2.74% -$4.02" [ref=e1264]:
                - generic [ref=e1266]:
                  - generic [ref=e1267]: "-2.74%"
                  - generic [ref=e1268]: "-$4.02"
              - cell "$114.50 52W $345.72" [ref=e1270]:
                - generic [ref=e1272]:
                  - generic [ref=e1273]: $114.50
                  - generic [ref=e1274]: 52W
                  - generic [ref=e1275]: $345.72
            - row [ref=e1279] [cursor=pointer]:
              - cell "MRNA Stock Moderna, Inc." [ref=e1280]:
                - generic [ref=e1281]:
                  - generic "MRNA Logo" [ref=e1282]
                  - generic [ref=e1289]:
                    - generic [ref=e1290]:
                      - generic [ref=e1291]: MRNA
                      - generic [ref=e1292]: Stock
                    - generic [ref=e1293]: Moderna, Inc.
              - cell [ref=e1294]
              - cell "$138.89" [ref=e1299]
              - cell "-4.30% -$6.24" [ref=e1302]:
                - generic [ref=e1304]:
                  - generic [ref=e1305]: "-4.30%"
                  - generic [ref=e1306]: "-$6.24"
              - cell "$22.28 52W $176.66" [ref=e1308]:
                - generic [ref=e1310]:
                  - generic [ref=e1311]: $22.28
                  - generic [ref=e1312]: 52W
                  - generic [ref=e1313]: $176.66
            - row [ref=e1317] [cursor=pointer]:
              - cell "SPCX Stock Space Exploration Technologies Corp. (SpaceX)" [ref=e1318]:
                - generic [ref=e1319]:
                  - generic "SPCX Logo" [ref=e1320]
                  - generic [ref=e1326]:
                    - generic [ref=e1327]:
                      - generic [ref=e1328]: SPCX
                      - generic [ref=e1329]: Stock
                    - generic [ref=e1330]: Space Exploration Technologies Corp. (SpaceX)
              - cell [ref=e1331]
              - cell "$135.00" [ref=e1336]
              - cell "-1.44% -$1.97" [ref=e1339]:
                - generic [ref=e1341]:
                  - generic [ref=e1342]: "-1.44%"
                  - generic [ref=e1343]: "-$1.97"
              - cell "$104.83 52W $225.64" [ref=e1345]:
                - generic [ref=e1347]:
                  - generic [ref=e1348]: $104.83
                  - generic [ref=e1349]: 52W
                  - generic [ref=e1350]: $225.64
            - row [ref=e1354] [cursor=pointer]:
              - cell "HOOD Stock Robinhood Markets, Inc." [ref=e1355]:
                - generic [ref=e1356]:
                  - generic "HOOD Logo" [ref=e1357]
                  - generic [ref=e1361]:
                    - generic [ref=e1362]:
                      - generic [ref=e1363]: HOOD
                      - generic [ref=e1364]: Stock
                    - generic [ref=e1365]: Robinhood Markets, Inc.
              - cell [ref=e1366]
              - cell "$103.62" [ref=e1371]
              - cell "-4.17% -$4.51" [ref=e1374]:
                - generic [ref=e1376]:
                  - generic [ref=e1377]: "-4.17%"
                  - generic [ref=e1378]: "-$4.51"
              - cell "$63.52 52W $153.86" [ref=e1380]:
                - generic [ref=e1382]:
                  - generic [ref=e1383]: $63.52
                  - generic [ref=e1384]: 52W
                  - generic [ref=e1385]: $153.86
            - row [ref=e1389] [cursor=pointer]:
              - cell "FDIS ETF Fidelity MSCI Consumer Discretionary Index ETF" [ref=e1390]:
                - generic [ref=e1391]:
                  - generic "FDIS Logo" [ref=e1392]
                  - generic [ref=e1397]:
                    - generic [ref=e1398]:
                      - generic [ref=e1399]: FDIS
                      - generic [ref=e1400]: ETF
                    - generic [ref=e1401]: Fidelity MSCI Consumer Discretionary Index ETF
              - cell [ref=e1402]
              - cell "$103.28" [ref=e1407]
              - cell "+0.11% +$0.12" [ref=e1410]:
                - generic [ref=e1412]:
                  - generic [ref=e1413]: +0.11%
                  - generic [ref=e1414]: +$0.12
              - cell "$89.95 52W $107.45" [ref=e1416]:
                - generic [ref=e1418]:
                  - generic [ref=e1419]: $89.95
                  - generic [ref=e1420]: 52W
                  - generic [ref=e1421]: $107.45
            - row [ref=e1425] [cursor=pointer]:
              - cell "FIDU ETF Fidelity MSCI Industrials Index ETF" [ref=e1426]:
                - generic [ref=e1427]:
                  - generic "FIDU Logo" [ref=e1428]
                  - generic [ref=e1434]:
                    - generic [ref=e1435]:
                      - generic [ref=e1436]: FIDU
                      - generic [ref=e1437]: ETF
                    - generic [ref=e1438]: Fidelity MSCI Industrials Index ETF
              - cell [ref=e1439]
              - cell "$94.84" [ref=e1444]
              - cell "-0.83% -$0.79" [ref=e1447]:
                - generic [ref=e1449]:
                  - generic [ref=e1450]: "-0.83%"
                  - generic [ref=e1451]: "-$0.79"
              - cell "$78.27 52W $100.00" [ref=e1453]:
                - generic [ref=e1455]:
                  - generic [ref=e1456]: $78.27
                  - generic [ref=e1457]: 52W
                  - generic [ref=e1458]: $100.00
            - row [ref=e1462] [cursor=pointer]:
              - cell "INTC Stock Intel Corporation" [ref=e1463]:
                - generic [ref=e1464]:
                  - generic "INTC Logo" [ref=e1465]:
                    - img [ref=e1466]:
                      - generic [ref=e1468]: intel
                  - generic [ref=e1470]:
                    - generic [ref=e1471]:
                      - generic [ref=e1472]: INTC
                      - generic [ref=e1473]: Stock
                    - generic [ref=e1474]: Intel Corporation
              - cell [ref=e1475]
              - cell "$87.26" [ref=e1480]
              - cell "-3.12% -$2.81" [ref=e1483]:
                - generic [ref=e1485]:
                  - generic [ref=e1486]: "-3.12%"
                  - generic [ref=e1487]: "-$2.81"
              - cell "$23.68 52W $142.35" [ref=e1489]:
                - generic [ref=e1491]:
                  - generic [ref=e1492]: $23.68
                  - generic [ref=e1493]: 52W
                  - generic [ref=e1494]: $142.35
            - row [ref=e1498] [cursor=pointer]:
              - cell "VXUS ETF Vanguard Total International Stock ETF" [ref=e1499]:
                - generic [ref=e1500]:
                  - generic "VXUS Logo" [ref=e1501]
                  - generic [ref=e1506]:
                    - generic [ref=e1507]:
                      - generic [ref=e1508]: VXUS
                      - generic [ref=e1509]: ETF
                    - generic [ref=e1510]: Vanguard Total International Stock ETF
              - cell [ref=e1511]
              - cell "$87.20" [ref=e1516]
              - cell "-0.58% -$0.51" [ref=e1519]:
                - generic [ref=e1521]:
                  - generic [ref=e1522]: "-0.58%"
                  - generic [ref=e1523]: "-$0.51"
              - cell "$70.36 52W $88.62" [ref=e1525]:
                - generic [ref=e1527]:
                  - generic [ref=e1528]: $70.36
                  - generic [ref=e1529]: 52W
                  - generic [ref=e1530]: $88.62
            - row [ref=e1534] [cursor=pointer]:
              - cell "FHLC ETF Fidelity MSCI Health Care Index ETF" [ref=e1535]:
                - generic [ref=e1536]:
                  - generic "FHLC Logo" [ref=e1537]
                  - generic [ref=e1542]:
                    - generic [ref=e1543]:
                      - generic [ref=e1544]: FHLC
                      - generic [ref=e1545]: ETF
                    - generic [ref=e1546]: Fidelity MSCI Health Care Index ETF
              - cell [ref=e1547]
              - cell "$84.61" [ref=e1552]
              - cell "-0.06% -$0.05" [ref=e1555]:
                - generic [ref=e1557]:
                  - generic [ref=e1558]: "-0.06%"
                  - generic [ref=e1559]: "-$0.05"
              - cell "$64.30 52W $85.46" [ref=e1561]:
                - generic [ref=e1563]:
                  - generic [ref=e1564]: $64.30
                  - generic [ref=e1565]: 52W
                  - generic [ref=e1566]: $85.46
            - row [ref=e1570] [cursor=pointer]:
              - cell "FNCL ETF Fidelity MSCI Financials Index ETF" [ref=e1571]:
                - generic [ref=e1572]:
                  - generic "FNCL Logo" [ref=e1573]
                  - generic [ref=e1579]:
                    - generic [ref=e1580]:
                      - generic [ref=e1581]: FNCL
                      - generic [ref=e1582]: ETF
                    - generic [ref=e1583]: Fidelity MSCI Financials Index ETF
              - cell [ref=e1584]
              - cell "$82.80" [ref=e1589]
              - cell "+1.06% +$0.87" [ref=e1592]:
                - generic [ref=e1594]:
                  - generic [ref=e1595]: +1.06%
                  - generic [ref=e1596]: +$0.87
              - cell "$67.76 52W $83.16" [ref=e1598]:
                - generic [ref=e1600]:
                  - generic [ref=e1601]: $67.76
                  - generic [ref=e1602]: 52W
                  - generic [ref=e1603]: $83.16
            - row [ref=e1607] [cursor=pointer]:
              - cell "FCOM ETF Fidelity MSCI Communication Services Index ETF" [ref=e1608]:
                - generic [ref=e1609]:
                  - generic "FCOM Logo" [ref=e1610]
                  - generic [ref=e1615]:
                    - generic [ref=e1616]:
                      - generic [ref=e1617]: FCOM
                      - generic [ref=e1618]: ETF
                    - generic [ref=e1619]: Fidelity MSCI Communication Services Index ETF
              - cell [ref=e1620]
              - cell "$70.79" [ref=e1625]
              - cell "+0.83% +$0.58" [ref=e1628]:
                - generic [ref=e1630]:
                  - generic [ref=e1631]: +0.83%
                  - generic [ref=e1632]: +$0.58
              - cell "$65.26 52W $75.94" [ref=e1634]:
                - generic [ref=e1636]:
                  - generic [ref=e1637]: $65.26
                  - generic [ref=e1638]: 52W
                  - generic [ref=e1639]: $75.94
            - row [ref=e1643] [cursor=pointer]:
              - cell "FMAT ETF Fidelity MSCI Materials Index ETF" [ref=e1644]:
                - generic [ref=e1645]:
                  - generic "FMAT Logo" [ref=e1646]
                  - generic [ref=e1651]:
                    - generic [ref=e1652]:
                      - generic [ref=e1653]: FMAT
                      - generic [ref=e1654]: ETF
                    - generic [ref=e1655]: Fidelity MSCI Materials Index ETF
              - cell [ref=e1656]
              - cell "$61.20" [ref=e1661]
              - cell "-0.13% -$0.08" [ref=e1664]:
                - generic [ref=e1666]:
                  - generic [ref=e1667]: "-0.13%"
                  - generic [ref=e1668]: "-$0.08"
              - cell "$48.76 52W $62.84" [ref=e1670]:
                - generic [ref=e1672]:
                  - generic [ref=e1673]: $48.76
                  - generic [ref=e1674]: 52W
                  - generic [ref=e1675]: $62.84
            - row [ref=e1679] [cursor=pointer]:
              - cell "FUTY ETF Fidelity MSCI Utilities Index ETF" [ref=e1680]:
                - generic [ref=e1681]:
                  - generic "FUTY Logo" [ref=e1682]
                  - generic [ref=e1687]:
                    - generic [ref=e1688]:
                      - generic [ref=e1689]: FUTY
                      - generic [ref=e1690]: ETF
                    - generic [ref=e1691]: Fidelity MSCI Utilities Index ETF
              - cell [ref=e1692]
              - cell "$55.79" [ref=e1697]
              - cell "+0.98% +$0.54" [ref=e1700]:
                - generic [ref=e1702]:
                  - generic [ref=e1703]: +0.98%
                  - generic [ref=e1704]: +$0.54
              - cell "$53.23 52W $61.51" [ref=e1706]:
                - generic [ref=e1708]:
                  - generic [ref=e1709]: $53.23
                  - generic [ref=e1710]: 52W
                  - generic [ref=e1711]: $61.51
            - row [ref=e1715] [cursor=pointer]:
              - cell "FSTA ETF Fidelity MSCI Consumer Staples Index ETF" [ref=e1716]:
                - generic [ref=e1717]:
                  - generic "FSTA Logo" [ref=e1718]
                  - generic [ref=e1723]:
                    - generic [ref=e1724]:
                      - generic [ref=e1725]: FSTA
                      - generic [ref=e1726]: ETF
                    - generic [ref=e1727]: Fidelity MSCI Consumer Staples Index ETF
              - cell [ref=e1728]
              - cell "$54.92" [ref=e1733]
              - cell "+1.63% +$0.88" [ref=e1736]:
                - generic [ref=e1738]:
                  - generic [ref=e1739]: +1.63%
                  - generic [ref=e1740]: +$0.88
              - cell "$47.88 52W $56.93" [ref=e1742]:
                - generic [ref=e1744]:
                  - generic [ref=e1745]: $47.88
                  - generic [ref=e1746]: 52W
                  - generic [ref=e1747]: $56.93
            - row [ref=e1751] [cursor=pointer]:
              - cell "IONQ Stock IonQ, Inc." [ref=e1752]:
                - generic [ref=e1753]:
                  - generic "IONQ Logo" [ref=e1754]
                  - generic [ref=e1760]:
                    - generic [ref=e1761]:
                      - generic [ref=e1762]: IONQ
                      - generic [ref=e1763]: Stock
                    - generic [ref=e1764]: IonQ, Inc.
              - cell [ref=e1765]
              - cell "$41.06" [ref=e1770]
              - cell "-8.47% -$3.80" [ref=e1773]:
                - generic [ref=e1775]:
                  - generic [ref=e1776]: "-8.47%"
                  - generic [ref=e1777]: "-$3.80"
              - cell "$25.89 52W $84.64" [ref=e1779]:
                - generic [ref=e1781]:
                  - generic [ref=e1782]: $25.89
                  - generic [ref=e1783]: 52W
                  - generic [ref=e1784]: $84.64
            - row [ref=e1788] [cursor=pointer]:
              - cell "SYM Stock Symbotic Inc." [ref=e1789]:
                - generic [ref=e1790]:
                  - generic "SYM Logo" [ref=e1791]
                  - generic [ref=e1798]:
                    - generic [ref=e1799]:
                      - generic [ref=e1800]: SYM
                      - generic [ref=e1801]: Stock
                    - generic [ref=e1802]: Symbotic Inc.
              - cell [ref=e1803]
              - cell "$40.03" [ref=e1808]
              - cell "-4.30% -$1.80" [ref=e1811]:
                - generic [ref=e1813]:
                  - generic [ref=e1814]: "-4.30%"
                  - generic [ref=e1815]: "-$1.80"
              - cell "$38.19 52W $87.88" [ref=e1817]:
                - generic [ref=e1819]:
                  - generic [ref=e1820]: $38.19
                  - generic [ref=e1821]: 52W
                  - generic [ref=e1822]: $87.88
            - row [ref=e1826] [cursor=pointer]:
              - cell "IREN Stock Iris Energy Limited" [ref=e1827]:
                - generic [ref=e1828]:
                  - generic "IREN Logo" [ref=e1829]
                  - generic [ref=e1834]:
                    - generic [ref=e1835]:
                      - generic [ref=e1836]: IREN
                      - generic [ref=e1837]: Stock
                    - generic [ref=e1838]: Iris Energy Limited
              - cell [ref=e1839]
              - cell "$39.81" [ref=e1844]
              - cell "-4.94% -$2.07" [ref=e1847]:
                - generic [ref=e1849]:
                  - generic [ref=e1850]: "-4.94%"
                  - generic [ref=e1851]: "-$2.07"
              - cell "$20.74 52W $76.87" [ref=e1853]:
                - generic [ref=e1855]:
                  - generic [ref=e1856]: $20.74
                  - generic [ref=e1857]: 52W
                  - generic [ref=e1858]: $76.87
            - row [ref=e1862] [cursor=pointer]:
              - cell "FENY ETF Fidelity MSCI Energy Index ETF" [ref=e1863]:
                - generic [ref=e1864]:
                  - generic "FENY Logo" [ref=e1865]
                  - generic [ref=e1870]:
                    - generic [ref=e1871]:
                      - generic [ref=e1872]: FENY
                      - generic [ref=e1873]: ETF
                    - generic [ref=e1874]: Fidelity MSCI Energy Index ETF
              - cell [ref=e1875]
              - cell "$35.02" [ref=e1880]
              - cell "-0.85% -$0.30" [ref=e1883]:
                - generic [ref=e1885]:
                  - generic [ref=e1886]: "-0.85%"
                  - generic [ref=e1887]: "-$0.30"
              - cell "$23.52 52W $35.83" [ref=e1889]:
                - generic [ref=e1891]:
                  - generic [ref=e1892]: $23.52
                  - generic [ref=e1893]: 52W
                  - generic [ref=e1894]: $35.83
            - row [ref=e1898] [cursor=pointer]:
              - cell "JMKE Stock Jersey Mike's Franchise Systems, Inc." [ref=e1899]:
                - generic [ref=e1900]:
                  - generic "JMKE Logo" [ref=e1901]:
                    - img [ref=e1902]:
                      - generic [ref=e1905]: JM
                  - generic [ref=e1906]:
                    - generic [ref=e1907]:
                      - generic [ref=e1908]: JMKE
                      - generic [ref=e1909]: Stock
                    - generic [ref=e1910]: Jersey Mike's Franchise Systems, Inc.
              - cell [ref=e1911]
              - cell "$23.53" [ref=e1916]
              - cell "-1.38% -$0.33" [ref=e1919]:
                - generic [ref=e1921]:
                  - generic [ref=e1922]: "-1.38%"
                  - generic [ref=e1923]: "-$0.33"
              - cell "$20.63 52W $24.99" [ref=e1925]:
                - generic [ref=e1927]:
                  - generic [ref=e1928]: $20.63
                  - generic [ref=e1929]: 52W
                  - generic [ref=e1930]: $24.99
            - row [ref=e1934] [cursor=pointer]:
              - cell "FLNC Stock Fluence Energy, Inc." [ref=e1935]:
                - generic [ref=e1936]:
                  - generic "FLNC Logo" [ref=e1937]
                  - generic [ref=e1941]:
                    - generic [ref=e1942]:
                      - generic [ref=e1943]: FLNC
                      - generic [ref=e1944]: Stock
                    - generic [ref=e1945]: Fluence Energy, Inc.
              - cell [ref=e1946]
              - cell "$10.86" [ref=e1951]
              - cell "-4.23% -$0.48" [ref=e1954]:
                - generic [ref=e1956]:
                  - generic [ref=e1957]: "-4.23%"
                  - generic [ref=e1958]: "-$0.48"
              - cell "$6.60 52W $33.51" [ref=e1960]:
                - generic [ref=e1962]:
                  - generic [ref=e1963]: $6.60
                  - generic [ref=e1964]: 52W
                  - generic [ref=e1965]: $33.51
        - generic [ref=e1970]:
          - text: Showing
          - strong [ref=e1971]: "49"
          - text: of
          - strong [ref=e1972]: "49"
          - text: assets
  - contentinfo [ref=e1973]:
    - generic [ref=e1975]:
      - paragraph [ref=e1976]: © 2026 Ian Holdeman
      - paragraph [ref=e1977]: Public Market Data • Strict Read-Only
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
> 72  |     await this.filterEtfsBtn.click();
      |                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  85  |     await row.click();
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