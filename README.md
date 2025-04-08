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
