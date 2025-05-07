# 🎮 Dankfolio

### 🔄 Trading Features
- [ ] Implement another AMM when Jupiter can't get a quote/route (i.e., Raydium)
- [ ] Debug Jupiter quote issue (api permission related?)

### 📊 Token Information
- [ ] Find reliable APIs for additional token data:
  - [x] Twitter integration
  - [x] Website information
  - [x] Telegram links
  - [x] Market cap data

### 💅 UI Improvements

| Task | Reference |
|------|-----------|
| <li>[ ] Improve Button Bar Design </li>| <details><summary>View Design</summary><img src="./ss/button_bar.jpg" width="400" alt="Button Bar Design"></details> |
| <li>[ ] Enhance Coins Detail Header </li>| <details><summary>View Design</summary><img src="./ss/coin_detals_header.png" width="400" alt="Coins Detail Header"></details> |
| <li>[ ] Update Chart Style </li>| <details><summary>View Design</summary><img src="./ss/chart_style.png" width="400" alt="Chart Style"></details> |
| <li>[ ] Implement Price Chart Highlight</li>| <details><summary>View Design</summary><img src="./ss/price_chart_highlight.jpg" width="400" alt="Price Chart Highlight"></details> |
| <li>[ ] Create Profile Wallet Breakdown</li>  | <details><summary>View Design</summary><img src="./ss/profile_wallet_breakdown.png" width="400" alt="Profile Wallet Breakdown"></details> |


## hard reset
```bash 
rm -rf ./node_modules && yarn install && cd ios && rm -rf build Pods Podfile.lock && pod install && cd .. && yarn start --reset-cache
```

## CodeCoverage
```
$ jest --coverage
watchman warning:  Recrawled this watch 73 times, most recently because:
MustScanSubDirs UserDroppedTo resolve, please review the information on
https://facebook.github.io/watchman/docs/troubleshooting.html#recrawl
To clear this warning, run:
`watchman watch-del '/Users/nma/dev/dankfolio' ; watchman watch-project '/Users/nma/dev/dankfolio'`

 PASS  src/screens/Home/HomeScreen.test.tsx
 PASS  src/components/Common/TokenSelector/TokenSelector.test.tsx
 PASS  src/store/coins.test.ts
 PASS  src/components/Chart/CoinChart/index.test.tsx
 PASS  src/screens/CoinDetail/CoinDetailScreen.test.tsx
 PASS  src/services/api.test.ts
 PASS  src/store/portfolio.test.ts
 PASS  src/screens/Profile/ProfileScreen.test.tsx
 PASS  src/utils/numberFormat.test.ts
 PASS  src/screens/Trade/TradeScreen.Confirmation.test.tsx
 PASS  src/components/Common/Navigation/navigation.test.tsx
 PASS  src/screens/Trade/TradeScreen.test.tsx
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------
All files                           |    60.2 |    57.34 |    62.6 |   60.05 |
 components/Chart/CoinChart         |   91.07 |    89.28 |   76.19 |    90.9 |
  index.tsx                         |   91.07 |    89.28 |   76.19 |    90.9 | 82-83,115,196-197
 components/Common/Icons            |   46.42 |        0 |       0 |   76.47 |
  index.tsx                         |   46.42 |        0 |       0 |   76.47 | 17-18,22-23,27-28,32-33
 components/Common/Navigation       |     100 |      100 |     100 |     100 |
  CustomHeader.tsx                  |     100 |      100 |     100 |     100 |
 components/Common/TokenSelector    |   97.26 |    81.13 |      96 |   97.14 |
  index.tsx                         |   96.22 |       75 |      95 |   96.07 | 14-15
  scripts.ts                        |     100 |      100 |     100 |     100 |
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Home/CoinCard           |     100 |       60 |     100 |     100 |
  coincard_styles.ts                |     100 |      100 |     100 |     100 |
  index.tsx                         |     100 |       60 |     100 |     100 | 23-44
 components/Trade/TradeConfirmation |      85 |    82.14 |     100 |   86.48 |
  index.tsx                         |   84.21 |    82.14 |     100 |   86.11 | 45,54,60-65
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeStatusModal  |   72.72 |    59.37 |      80 |   71.42 |
  index.tsx                         |      70 |    59.37 |      75 |      70 | 24-26,30-32,42,88
  styles.ts                         |     100 |      100 |     100 |     100 |
 gen/dankfolio/v1                   |     100 |      100 |     100 |     100 |
  coin_pb.ts                        |     100 |      100 |     100 |     100 |
  price_pb.ts                       |     100 |      100 |     100 |     100 |
  trade_pb.ts                       |     100 |      100 |     100 |     100 |
  utility_pb.ts                     |     100 |      100 |     100 |     100 |
  wallet_pb.ts                      |     100 |      100 |     100 |     100 |
 hooks                              |   51.35 |    14.28 |     100 |   54.28 |
  useProxiedImage.ts                |   51.35 |    14.28 |     100 |   54.28 | 31-34,45-63
 screens/CoinDetail                 |   49.48 |    49.12 |   68.75 |   48.38 |
  coindetail_scripts.ts             |    6.12 |        0 |       0 |    6.12 | 31-100,110-138
  coindetail_styles.ts              |     100 |      100 |     100 |     100 |
  index.tsx                         |   93.47 |    82.35 |    90.9 |   95.34 | 41,80
 screens/Home                       |   53.06 |       50 |      50 |   51.06 |
  home_scripts.ts                   |   20.68 |        0 |       0 |   20.68 | 12,16-22,29-42,47-59,64
  home_styles.ts                    |     100 |      100 |     100 |     100 |
  index.tsx                         |     100 |     62.5 |     100 |     100 | 31-62
 screens/Profile                    |   59.61 |    57.14 |   70.58 |   60.86 |
  index.tsx                         |   67.85 |       70 |      70 |   69.23 | 36-46,94,114
  profile_scripts.ts                |   45.45 |       25 |   66.66 |   47.36 | 10-18,41-51
  profile_styles.ts                 |     100 |      100 |     100 |     100 |
 screens/Trade                      |   49.45 |    45.51 |    67.5 |   47.92 |
  index.tsx                         |   68.92 |    57.52 |   80.64 |   67.85 | ...234-235,252-253,269-270,274-275,281-282,298-299,311-312,336,344-345,366-369,382-383,402,410,445
  trade_scripts.ts                  |    12.5 |     3.12 |    12.5 |    12.5 | 18-23,35-90,104-107,117-136,148-150,164-199,210-218,236-272
  trade_styles.ts                   |     100 |      100 |     100 |     100 |
 services                           |    5.18 |     3.57 |    4.76 |    5.22 |
  grpcApi.ts                        |    5.18 |     3.57 |    4.76 |    5.22 | 10-15,21-428,445-449
 services/grpc                      |   55.26 |    18.18 |   57.14 |   55.26 |
  apiClient.ts                      |    87.5 |       50 |     100 |    87.5 | 4
  grpcUtils.ts                      |   46.66 |       15 |   57.14 |   46.66 | 27-40,44,52-56
 store                              |    84.9 |     60.6 |   94.73 |   83.67 |
  coins.ts                          |   90.24 |       60 |     100 |   89.18 | 45-48
  portfolio.ts                      |   81.53 |    61.11 |   88.88 |   80.32 | 49,58,71-75,81-92,97
 utils                              |   89.61 |    97.14 |   81.81 |   86.44 |
  constants.ts                      |     100 |      100 |     100 |     100 |
  numberFormat.ts                   |     100 |      100 |     100 |     100 |
  url.ts                            |      20 |        0 |       0 |      20 | 4,8-17
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------

Test Suites: 12 passed, 12 total
Tests:       81 passed, 81 total
Snapshots:   0 total
Time:        4.244 s
✨  Done in 4.57s.
```
