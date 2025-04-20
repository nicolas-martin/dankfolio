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
yarn run v1.22.22
$ jest --coverage
 PASS  src/screens/Profile/ProfileScreen.test.tsx
 PASS  src/components/Common/TokenSelector/TokenSelector.test.tsx
 PASS  src/components/Chart/CoinChart/index.test.tsx
 PASS  src/screens/Home/HomeScreen.test.tsx
 PASS  src/store/portfolio.test.ts
 PASS  src/services/api.test.ts
 PASS  src/screens/Trade/TradeScreen.Confirmation.test.tsx
 PASS  src/store/coins.test.ts
 PASS  src/screens/CoinDetail/CoinDetailScreen.test.tsx
 PASS  src/components/Common/Navigation/navigation.test.tsx
 PASS  src/screens/Trade/TradeScreen.test.tsx
------------------------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------
File                                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------
All files                           |   60.28 |    53.88 |   64.86 |   61.16 |
 components/Chart/CoinChart         |   91.07 |    89.28 |   76.19 |    90.9 |
  index.tsx                         |   91.07 |    89.28 |   76.19 |    90.9 | 82-83,115,196-197
 components/Common/Icons            |   60.71 |        0 |   23.07 |   88.23 |
  index.tsx                         |   60.71 |        0 |   23.07 |   88.23 | 21-22,31-32
 components/Common/Navigation       |     100 |      100 |     100 |     100 |
  CustomHeader.tsx                  |     100 |      100 |     100 |     100 |
 components/Common/TokenSelector    |   97.01 |     92.5 |      96 |   96.87 |
  index.tsx                         |   95.74 |    88.88 |      95 |   95.55 | 76-78
  scripts.ts                        |     100 |      100 |     100 |     100 |
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Home/CoinCard           |     100 |       50 |     100 |     100 |
  coincard_scripts.ts               |     100 |      100 |     100 |     100 |
  coincard_styles.ts                |     100 |      100 |     100 |     100 |
  index.tsx                         |     100 |       50 |     100 |     100 | 12-34
 components/Trade/TradeConfirmation |      85 |    82.14 |     100 |   86.48 |
  index.tsx                         |   84.21 |    82.14 |     100 |   86.11 | 45,54,60-65
  styles.ts                         |     100 |      100 |     100 |     100 |
 components/Trade/TradeStatusModal  |   72.72 |    71.87 |      80 |   71.42 |
  index.tsx                         |      70 |    71.87 |      75 |      70 | 24-28,32,40,88
  styles.ts                         |     100 |      100 |     100 |     100 |
 gen/dankfolio/v1                   |     100 |      100 |     100 |     100 |
  coin_pb.ts                        |     100 |      100 |     100 |     100 |
  price_pb.ts                       |     100 |      100 |     100 |     100 |
  trade_pb.ts                       |     100 |      100 |     100 |     100 |
  wallet_pb.ts                      |     100 |      100 |     100 |     100 |
 screens/CoinDetail                 |   51.06 |     50.9 |   68.75 |      50 |
  coindetail_scripts.ts             |    6.52 |        0 |       0 |    6.52 | 26-95,105-128
  coindetail_styles.ts              |     100 |      100 |     100 |     100 |
  index.tsx                         |   93.47 |    82.35 |    90.9 |   95.34 | 41,80
 screens/Home                       |      52 |       40 |   46.66 |      50 |
  home_scripts.ts                   |   20.68 |        0 |       0 |   20.68 | 12,16-22,29-42,47-60,65
  home_styles.ts                    |     100 |      100 |     100 |     100 |
  index.tsx                         |   94.73 |       50 |   85.71 |   94.44 | 81
 screens/Profile                    |   59.61 |    57.14 |   70.58 |   60.86 |
  index.tsx                         |   67.85 |       70 |      70 |   69.23 | 36-46,91,111
  profile_scripts.ts                |   45.45 |       25 |   66.66 |   47.36 | 10-18,41-51
  profile_styles.ts                 |     100 |      100 |     100 |     100 |
 screens/Trade                      |   48.94 |    43.47 |   67.56 |   49.13 |
  index.tsx                         |   65.41 |    54.11 |   76.92 |    66.4 | 119-121,145-151,157-163,172-174,179,200-232,239-240,264,272-273,294-297,303-304,320,328,355
  trade_scripts.ts                  |   26.47 |    13.33 |      40 |   26.73 | 17-21,33-76,90-93,104-125,157-182,227-270
  trade_styles.ts                   |     100 |      100 |     100 |     100 |
 services                           |   22.62 |    27.27 |   31.81 |   22.79 |
  grpcApi.ts                        |   22.62 |    27.27 |   31.81 |   22.79 | 20,63-76,90-94,116,122,134-156,171-174,187-444
 services/grpc                      |   85.71 |       50 |     100 |   85.71 |
  apiClient.ts                      |   85.71 |       50 |     100 |   85.71 | 4
 store                              |   93.58 |    69.56 |     100 |   92.85 |
  coins.ts                          |   88.37 |    58.82 |     100 |   87.17 | 45-48,65
  portfolio.ts                      |     100 |      100 |     100 |     100 |
 utils                              |    27.5 |    15.15 |   14.28 |   32.35 |
  constants.ts                      |     100 |      100 |     100 |     100 |
  numberFormat.ts                   |   27.58 |    16.12 |      20 |   34.78 | 3-7,15-22,25-30,59-60
  url.ts                            |      20 |        0 |       0 |      20 | 4,8-17
------------------------------------|---------|----------|---------|---------|---------------------------------------------------------------------------------------------

Test Suites: 11 passed, 11 total
Tests:       54 passed, 54 total
Snapshots:   0 total
Time:        3.127 s
✨  Done in 3.80s.
```
