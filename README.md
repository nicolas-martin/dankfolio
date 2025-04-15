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
 PASS  src/screens/Profile/ProfileScreen.test.tsx
 PASS  src/components/Navigation/navigation.test.tsx
 PASS  src/services/api.test.ts
 PASS  src/components/Chart/CoinChart/index.test.tsx
 PASS  src/screens/Home/HomeScreen.test.tsx
 PASS  src/store/portfolio.test.ts
 PASS  src/screens/Trade/TradeScreen.test.tsx
 PASS  src/store/coins.test.ts
 PASS  src/screens/CoinDetail/CoinDetailScreen.test.tsx
 PASS  src/screens/Trade/TradeScreen.Confirmation.test.tsx
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------
All files                           |   61.23 |    52.01 |   67.44 |   60.24 |
 components/Chart/CoinChart         |   91.07 |    89.28 |   76.19 |    90.9 |
  index.tsx                         |   91.07 |    89.28 |   76.19 |    90.9 | 82-83,115,196-197
 components/Home/CoinCard           |     100 |       50 |     100 |     100 |
  coincard_scripts.ts               |     100 |      100 |     100 |     100 |
  coincard_styles.ts                |     100 |      100 |     100 |     100 |
  index.tsx                         |     100 |       50 |     100 |     100 | 12-34
 components/Navigation              |     100 |      100 |     100 |     100 |
  CustomHeader.tsx                  |     100 |      100 |     100 |     100 |
 components/Trade/TradeConfirmation |   82.97 |    76.66 |    87.5 |   86.84 |
  index.tsx                         |   82.22 |    76.66 |   85.71 |   86.48 | 45,54,60-65
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeStatusModal  |   72.72 |    71.87 |      80 |   71.42 |
  index.tsx                         |      70 |    71.87 |      75 |      70 | 24-28,32,40,88
  styles.ts                         |     100 |      100 |     100 |     100 |
 gen/dankfolio/v1                   |     100 |      100 |     100 |     100 |
  coin_pb.ts                        |     100 |      100 |     100 |     100 |
  price_pb.ts                       |     100 |      100 |     100 |     100 |
  trade_pb.ts                       |     100 |      100 |     100 |     100 |
  wallet_pb.ts                      |     100 |      100 |     100 |     100 |
 screens/CoinDetail                 |   52.94 |    52.45 |   66.66 |   51.08 |
  coindetail_scripts.ts             |   15.09 |        0 |       0 |    8.51 | 26-95,105-128
  coindetail_styles.ts              |     100 |      100 |     100 |     100 |
  index.tsx                         |   93.61 |    84.21 |   91.66 |   95.45 | 41,80
 screens/Home                       |   54.38 |    33.33 |   43.75 |   51.02 |
  home_scripts.ts                   |   30.55 |        0 |       0 |   23.33 | 12,16-22,29-42,47-60,65
  home_styles.ts                    |     100 |      100 |     100 |     100 |
  index.tsx                         |   94.73 |       50 |   85.71 |   94.44 | 81
 screens/Profile                    |      60 |    57.14 |   73.33 |   61.36 |
  index.tsx                         |   69.23 |       70 |      75 |   70.83 | 35-45,90
  profile_scripts.ts                |   45.45 |       25 |   66.66 |   47.36 | 10-18,41-51
  profile_styles.ts                 |     100 |      100 |     100 |     100 |
 screens/Trade                      |   53.33 |     47.7 |   73.52 |   51.94 |
  index.tsx                         |   73.68 |    59.74 |   86.36 |   75.72 | 97,129-131,158-160,174-188,201-202,231-232,253-256,262-263,278
  trade_scripts.ts                  |   31.19 |    18.75 |   45.45 |   27.45 | 17-21,33-76,90-93,104-125,157-182,227-270
  trade_styles.ts                   |     100 |      100 |     100 |     100 |
 services                           |   27.94 |    28.26 |   36.36 |    24.8 |
  grpcApi.ts                        |   27.94 |    28.26 |   36.36 |    24.8 | 20,47-60,87-91,113,119,131-151,166-169,182-412
 services/grpc                      |     100 |      100 |     100 |     100 |
  apiClient.ts                      |     100 |      100 |     100 |     100 |
 store                              |   94.11 |       72 |     100 |   92.95 |
  coins.ts                          |      90 |    63.15 |     100 |    87.5 | 45-48,65
  portfolio.ts                      |     100 |      100 |     100 |     100 |
 utils                              |   53.73 |    14.28 |    12.5 |   58.18 |
  constants.ts                      |     100 |      100 |     100 |     100 |
  icons.ts                          |     100 |      100 |     100 |     100 |
  numberFormat.ts                   |   27.58 |    16.12 |      20 |   34.78 | 3-7,15-22,25-30,59-60
  url.ts                            |   41.17 |        0 |       0 |   27.27 | 4,8-17
------------------------------------|---------|----------|---------|---------|----------------------------------------------------------------

Test Suites: 10 passed, 10 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        3.211 s, estimated 9 s
✨  Done in 4.19s.
```
