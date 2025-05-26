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
 PASS  src/screens/Home/HomeScreen.test.tsx
 PASS  src/components/Common/TokenSelector/TokenSelector.test.tsx
 PASS  src/screens/Trade/TradeScreen.Confirmation.test.tsx
 PASS  src/components/Chart/CoinChart/index.test.tsx
 PASS  src/screens/CoinDetail/CoinDetailScreen.test.tsx
 PASS  src/components/Trade/TradeConfirmation/TradeConfirmation.test.tsx
 PASS  src/components/Common/Navigation/navigation.test.tsx
 PASS  src/services/authService.test.ts
 PASS  src/store/portfolio.test.ts
 PASS  src/store/coins.test.ts
 PASS  src/screens/Profile/ProfileScreen.test.tsx
 PASS  src/services/api.test.ts
 PASS  src/utils/numberFormat.test.ts
 PASS  src/store/auth.test.ts
 PASS  src/screens/Trade/TradeScreen.test.tsx
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.
------------------------------------|---------|----------|---------|---------|-----------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------|---------|----------|---------|---------|-----------------------------------------
All files                           |   61.13 |    52.69 |   66.05 |   61.57 |
 components/Chart/CoinChart         |   88.13 |    86.95 |   68.42 |   89.09 |
  index.tsx                         |   87.71 |    86.95 |   66.66 |   88.88 | 54-55,65,97,148-149
  styles.ts                         |     100 |      100 |     100 |     100 |
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
 components/OTAupdate               |      25 |     3.84 |   42.85 |   27.77 |
  index.tsx                         |      75 |       50 |   66.66 |      75 | 16-17
  scripts.ts                        |    9.67 |        0 |      25 |   11.11 | 7-11,18-52
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeConfirmation |     100 |    86.66 |     100 |     100 |
  index.tsx                         |     100 |    86.66 |     100 |     100 | 18,34
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeStatusModal  |   72.72 |    59.37 |      80 |   71.42 |
  index.tsx                         |      70 |    59.37 |      75 |      70 | 24-26,30-32,42,88
  styles.ts                         |     100 |      100 |     100 |     100 |
 gen/dankfolio/v1                   |     100 |      100 |     100 |     100 |
  auth_pb.ts                        |     100 |      100 |     100 |     100 |
  coin_pb.ts                        |     100 |      100 |     100 |     100 |
  price_pb.ts                       |     100 |      100 |     100 |     100 |
  trade_pb.ts                       |     100 |      100 |     100 |     100 |
  utility_pb.ts                     |     100 |      100 |     100 |     100 |
  wallet_pb.ts                      |     100 |      100 |     100 |     100 |
 hooks                              |   51.35 |    14.28 |     100 |   54.28 |
  useProxiedImage.ts                |   51.35 |    14.28 |     100 |   54.28 | 37-40,51-69
 screens/CoinDetail                 |   50.49 |    46.55 |   70.58 |   49.48 |
  coindetail_scripts.ts             |       6 |        0 |       0 |       6 | 32-88,98-128
  coindetail_styles.ts              |     100 |      100 |     100 |     100 |
  index.tsx                         |   93.87 |    81.81 |   91.66 |   95.65 | 50,89
 screens/Home                       |   94.73 |       60 |    92.3 |   94.44 |
  home_scripts.ts                   |   66.66 |      100 |       0 |   66.66 | 64
  home_styles.ts                    |     100 |      100 |     100 |     100 |
  index.tsx                         |   96.96 |       60 |     100 |   96.87 | 39
 screens/Profile                    |   56.45 |       50 |   68.42 |   57.14 |
  index.tsx                         |   62.85 |       60 |   66.66 |   63.63 | 42-53,102-103,125-126,168
  profile_scripts.ts                |      44 |       25 |   66.66 |   45.45 | 16-26,49-60
  profile_styles.ts                 |     100 |      100 |     100 |     100 |
 screens/Trade                      |   53.52 |    47.13 |    72.5 |      53 |
  index.tsx                         |    69.9 |     58.4 |   81.25 |   70.24 | ...,258-259,281-282,296-303,310-311,332
  trade_scripts.ts                  |   14.89 |     3.12 |   28.57 |   14.89 | ...-109,117-119,133-168,179-187,205-256
  trade_styles.ts                   |     100 |      100 |     100 |     100 |
 services                           |   23.88 |    18.75 |   29.03 |   23.88 |
  authService.ts                    |   51.19 |    42.85 |     100 |   51.19 | 52-56,72,116-117,146-212
  firebaseInit.ts                   |      10 |        0 |       0 |      10 | 18-23,39-108
  grpcApi.ts                        |    9.77 |        0 |   11.11 |    9.77 | 12,21-216,235-346,363-394
 services/grpc                      |   64.91 |       40 |      70 |   64.28 |
  apiClient.ts                      |   84.21 |       50 |     100 |   83.33 | 15,25-28
  grpcUtils.ts                      |   55.26 |    38.46 |    62.5 |   55.26 | 11,60-61,65-74,81,89-93
 store                              |   90.18 |       68 |   96.15 |   89.61 |
  auth.ts                           |     100 |    82.35 |     100 |     100 | 60-86
  coins.ts                          |      92 |       60 |     100 |    91.3 | 47-50
  portfolio.ts                      |    82.6 |    61.11 |      90 |   81.25 | 43,52,66-70,78-88,94-95,121-122
 utils                              |   75.92 |    75.51 |      75 |    77.1 |
  constants.ts                      |     100 |      100 |     100 |     100 |
  logger.ts                         |   41.93 |    21.42 |   66.66 |   54.16 | 20-25,55-62,70
  numberFormat.ts                   |     100 |      100 |     100 |     100 |
  url.ts                            |      20 |        0 |       0 |      20 | 5,9-18
------------------------------------|---------|----------|---------|---------|-----------------------------------------

Test Suites: 15 passed, 15 total
Tests:       123 passed, 123 total
Snapshots:   0 total
Time:        5.798 s, estimated 7 s
✨  Done in 7.56s.
```
