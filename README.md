# 🎮 Dankfolio

## TODO:
- [ ] Make wallet creation fully frontend and only send public key to the backend
- [ ] There's a bug where in the profile when we have 0 coin we still see SOL
- [ ] Optimize the graph fetching by fetching ALL points at once and then filter/aggregate by time.

- Problem:
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Step 1: Navigating to https://www.birdeye.so/?chain=solana
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Warning: Initial data load/refresh failed: failed to scrape and enrich coins: failed during basic token scraping: initial navigation failed: exec: "google-chrome": executable file not found in $PATH
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Starting gRPC server on port 9000
May 18 22:33:44 localhost dankfolio[39280]: 2025/05/18 22:33:44 Starting Connect RPC server on :9000

- Solution:
Use a direct page instead 🤦‍♂️

### NOTE
In order for the raw_coins to be populated which is required for the search functionality. We currently have to trigger the jupiter call to /tokens/v1/all which is currently done manually by triggering. We should also think about using the `new` endpoint periodically which is not implemented currently.

```bash
→ grpcurl -plaintext \
  -import-path proto/dankfolio/v1 \
  -proto coin.proto \
  -d '{}' \
  localhost:9000 \
  dankfolio.v1.CoinService/GetAllCoins
```

### Improvements
- [x] Add contract display in coin details
- [x] Add more space to the coin name in profile and home
- [x] Improve graph usability
    - [x] Formatted DT on graph when dragging
    - [x] Fix change update and color
    - [x] Hover label position fix when reaching the edge of the screen
    - [x] Label, vertical line and domain padding
    - [x] Shadow when highlighting
    - [x] Double check data accuracy when highligting the graph


### 💅 UI Improvements

| Task | Reference |
|------|-----------|
| <li>[x] Improve Button Bar Design </li>| <details><summary>View Design</summary><img src="./ss/button_bar.jpg" width="400" alt="Button Bar Design"></details> |
| <li>[ ] Enhance Coins Detail Header </li>| <details><summary>View Design</summary><img src="./ss/coin_detals_header.png" width="400" alt="Coins Detail Header"></details> |
| <li>[ ] Update Chart Style </li>| <details><summary>View Design</summary><img src="./ss/chart_style.png" width="400" alt="Chart Style"></details> |
| <li>[ ] Implement Price Chart Highlight</li>| <details><summary>View Design</summary><img src="./ss/price_chart_highlight.jpg" width="400" alt="Price Chart Highlight"></details> |
| <li>[x] Create Profile Wallet Breakdown</li>  | <details><summary>View Design</summary><img src="./ss/profile_wallet_breakdown.png" width="400" alt="Profile Wallet Breakdown"></details> |


## hard reset
```bash 
rm -rf ./node_modules && yarn install && cd ios && rm -rf build Pods Podfile.lock && pod install && cd .. && yarn start --reset-cache
```

## CodeCoverage
```

yarn run v1.22.22
$ jest --coverage
watchman warning:  Recrawled this watch 1 time, most recently because:
MustScanSubDirs UserDroppedTo resolve, please review the information on
https://facebook.github.io/watchman/docs/troubleshooting.html#recrawl
To clear this warning, run:
`watchman watch-del '/Users/nma/dev/dankfolio' ; watchman watch-project '/Users/nma/dev/dankfolio'`

 PASS  src/screens/Profile/ProfileScreen.test.tsx
 PASS  src/components/Common/TokenSelector/TokenSelector.test.tsx
 PASS  src/store/auth.test.ts
 PASS  src/screens/Home/HomeScreen.test.tsx
 PASS  src/components/Chart/CoinChart/index.test.tsx
 PASS  src/store/coins.test.ts
 PASS  src/screens/CoinDetail/CoinDetailScreen.test.tsx
 PASS  src/screens/CoinDetail/coindetail_scripts.test.ts
 PASS  src/utils/numberFormat.test.ts
 PASS  src/services/api.test.ts
 PASS  src/store/portfolio.test.ts
 PASS  src/services/authService.test.ts
 PASS  src/store/priceHistoryCache.test.ts
 PASS  src/components/Common/Navigation/navigation.test.tsx
 PASS  src/components/Trade/TradeConfirmation/TradeConfirmation.test.tsx
 PASS  src/screens/Trade/TradeScreen.test.tsx
 PASS  src/screens/Trade/TradeScreen.Confirmation.test.tsx
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------
All files                           |   65.71 |    58.05 |    76.1 |   65.19 |
 components/Chart/CoinChart         |   67.79 |       48 |   63.15 |   67.27 |
  index.tsx                         |   66.66 |       48 |   61.11 |   66.66 | 31,63-64,74,89-92,105-106,158-159,168-177
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Common/Navigation       |     100 |      100 |     100 |     100 |
  CustomHeader.tsx                  |     100 |      100 |     100 |     100 |
 components/Common/TokenSelector    |   97.26 |    81.13 |      96 |   97.14 |
  index.tsx                         |   96.22 |       75 |      95 |   96.07 | 14-15
  scripts.ts                        |     100 |      100 |     100 |     100 |
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Home/CoinCard           |    61.9 |       45 |      80 |   63.15 |
  coincard_styles.ts                |     100 |      100 |     100 |     100 |
  index.tsx                         |   57.89 |       45 |      75 |   61.11 | 34-48
 components/OTAupdate               |      25 |     3.84 |   42.85 |   27.77 |
  index.tsx                         |      75 |       50 |   66.66 |      75 | 16-17
  scripts.ts                        |    9.67 |        0 |      25 |   11.11 | 7-11,18-52
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeConfirmation |     100 |    94.11 |     100 |     100 |
  index.tsx                         |     100 |    94.11 |     100 |     100 | 19
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeStatusModal  |    78.3 |    67.04 |    90.9 |   78.43 |
  index.tsx                         |   83.33 |    75.43 |   91.66 |   84.12 | 62,69,103-105,116-118,129-131,210,222
  scripts.ts                        |   68.42 |    51.61 |   88.88 |   68.42 | 13-15,19-21,31-33,37-39,49-52,65,78
  styles.ts                         |     100 |      100 |     100 |     100 |
 gen/dankfolio/v1                   |     100 |      100 |     100 |     100 |
  auth_pb.ts                        |     100 |      100 |     100 |     100 |
  coin_pb.ts                        |     100 |      100 |     100 |     100 |
  price_pb.ts                       |     100 |      100 |     100 |     100 |
  trade_pb.ts                       |     100 |      100 |     100 |     100 |
  utility_pb.ts                     |     100 |      100 |     100 |     100 |
  wallet_pb.ts                      |     100 |      100 |     100 |     100 |
 hooks                              |   67.56 |    42.85 |     100 |   68.57 |
  useProxiedImage.ts                |   67.56 |    42.85 |     100 |   68.57 | 37-40,51-60
 screens/CoinDetail                 |   84.05 |    66.66 |   91.66 |   83.84 |
  coindetail_scripts.ts             |      75 |    48.27 |   83.33 |   74.28 | 114-117,143,163-193
  coindetail_styles.ts              |     100 |      100 |     100 |     100 |
  index.tsx                         |   93.75 |    82.35 |   94.11 |   94.91 | 48,87,181
 screens/Home                       |   87.23 |       60 |   72.22 |   86.66 |
  home_scripts.ts                   |   66.66 |      100 |       0 |   66.66 | 64
  home_styles.ts                    |     100 |      100 |     100 |     100 |
  index.tsx                         |   88.09 |       60 |      75 |    87.8 | 40,80,92-96
 screens/Profile                    |   61.42 |    56.25 |   73.91 |    62.5 |
  index.tsx                         |   69.76 |    66.66 |      75 |   70.73 | 42-53,74-75,99-100,198
  profile_scripts.ts                |      44 |       25 |   66.66 |   45.45 | 16-26,49-60
  profile_styles.ts                 |     100 |      100 |     100 |     100 |
 screens/Trade                      |   56.51 |    54.79 |   73.33 |   56.03 |
  index.tsx                         |   70.73 |    63.63 |   83.78 |   70.75 | ...305-306,310-311,320-321,330-331,361-362,366-367,370-371,379-380,386-388,391-393,403-410,417-418
  trade_scripts.ts                  |   12.63 |     3.12 |   14.28 |   12.63 | 21-26,38-93,107-110,118-120,134-169,180-188,206-257
  trade_styles.ts                   |     100 |      100 |     100 |     100 |
 services                           |   23.07 |    23.43 |    25.8 |   23.07 |
  authService.ts                    |   55.95 |    53.57 |     100 |   55.95 | 72,116-117,146-212
  firebaseInit.ts                   |      10 |        0 |       0 |      10 | 18-23,39-108
  grpcApi.ts                        |    5.26 |        0 |    5.55 |    5.26 | 12,21-346,363,379-394
 services/grpc                      |    61.4 |    26.66 |      80 |   60.71 |
  apiClient.ts                      |   84.21 |       50 |     100 |   83.33 | 15,25-28
  grpcUtils.ts                      |      50 |    23.07 |      75 |      50 | 11,52-53,57-77,93
 store                              |   90.96 |    71.42 |   96.77 |   90.36 |
  auth.ts                           |     100 |    82.35 |     100 |     100 | 60-86
  coins.ts                          |      92 |       60 |     100 |    91.3 | 47-50
  portfolio.ts                      |    82.6 |    61.11 |      90 |   81.25 | 43,52,66-70,78-88,94-95,121-122
  priceHistoryCache.ts              |     100 |      100 |     100 |     100 |
 utils                              |   80.55 |    78.57 |      80 |   81.92 |
  constants.ts                      |     100 |      100 |     100 |     100 |
  logger.ts                         |   58.06 |    32.14 |   77.77 |   70.83 | 20-25,61-62,70
  numberFormat.ts                   |     100 |      100 |     100 |     100 |
  url.ts                            |      20 |        0 |       0 |      20 | 5,9-18
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------------------------------------------

Test Suites: 17 passed, 17 total
Tests:       140 passed, 140 total
Snapshots:   0 total
Time:        3.497 s
✨  Done in 3.79s.
```
