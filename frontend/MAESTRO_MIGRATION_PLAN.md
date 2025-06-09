# 🎯 Complete Jest to Maestro Migration Plan

## 📋 Test Case Mapping

### 🏠 HomeScreen Tests → Maestro Flows

**Jest Test Cases:**
1. ✅ `renders correctly and initial data fetch effects run`
2. ✅ `should fetch price histories sequentially when mode is 'sequential'`
3. ✅ `should fetch price histories in parallel when mode is 'parallel'`

**Maestro Flows:**
- `home/portfolio-loading.yaml` - Tests initial data loading
- `home/coin-list-display.yaml` - Tests coin list rendering
- `home/price-updates.yaml` - Tests price history fetching

### 💱 TradeScreen Tests → Maestro Flows

**Jest Test Cases:**
1. ✅ `initializes correctly with initialFromCoin and initialToCoin, prioritizing cache`
2. ✅ `handles quote fetching and UI updates on amount change`
3. ✅ `skips quote fetching for incomplete numbers`
4. ✅ `handles coin swapping correctly`
5. ✅ `executes complete trade flow with confirmation`
6. ✅ `handles insufficient balance error`
7. ✅ `handles SOL as default fromCoin (from cache) when not provided`
8. ✅ `handles SOL as default fromCoin (from API) when not in cache`
9. ✅ `should refresh portfolio and transactions on successful trade (status finalized)`
10. ✅ `should NOT refresh portfolio and transactions if status is not finalized`
11. ✅ `should NOT refresh if wallet address is missing`

**Maestro Flows:**
- `trading/trade-initialization.yaml` - Tests initial setup
- `trading/quote-fetching.yaml` - Tests quote updates
- `trading/input-validation.yaml` - Tests input handling
- `trading/coin-swapping.yaml` - Tests swap functionality
- `trading/complete-trade-flow.yaml` - Tests full trade execution
- `trading/error-handling.yaml` - Tests error scenarios
- `trading/default-coin-selection.yaml` - Tests default SOL selection

### ⚙️ SettingsScreen Tests → Maestro Flows

**Jest Test Cases:**
1. ✅ `renders all sections and information correctly for Neon theme`
2. ✅ `renders correct theme description and switch state for Light theme`
3. ✅ `calls toggleTheme when the theme switch is pressed`
4. ✅ `copies public key to clipboard when copy icon is pressed and shows toast`
5. ✅ `displays N/A for public key if wallet is not available`
6. ✅ `uses Constants.expoConfig.version for app version`
7. ✅ `displays the private key placeholder`

**Maestro Flows:**
- `settings/theme-switching.yaml` - Tests theme toggle
- `settings/wallet-info-display.yaml` - Tests wallet information
- `settings/clipboard-functionality.yaml` - Tests copy to clipboard
- `settings/app-info-display.yaml` - Tests app version display

### 📤 SendScreen Tests → Maestro Flows

**Jest Test Cases:**
1. ✅ `renders initial state correctly`
2. ✅ `handleCloseStatusModal` functionality

**Maestro Flows:**
- `send/send-initialization.yaml` - Tests initial state
- `send/send-transaction-flow.yaml` - Tests complete send flow

### 👤 ProfileScreen Tests → Maestro Flows

**Jest Test Cases:**
- Profile screen functionality (need to read the test file)

**Maestro Flows:**
- `profile/profile-display.yaml` - Tests profile information

### 🪙 CoinDetailScreen Tests → Maestro Flows

**Jest Test Cases:**
- Coin detail functionality (need to read the test file)

**Maestro Flows:**
- `coin-detail/coin-info-display.yaml` - Tests coin information
- `coin-detail/price-chart.yaml` - Tests price chart functionality

### 🧩 Component Tests → Maestro Flows

#### TokenSelector Component
**Jest Test Cases:**
1. ✅ `renders correctly with default props`
2. ✅ `displays selected token information`
3. ✅ `opens modal when pressed`
4. ✅ `calls onSelectToken when a token is selected`

**Maestro Flows:**
- `components/token-selector-basic.yaml` - Tests basic functionality
- `components/token-selector-search.yaml` - Tests search functionality
- `components/token-selector-selection.yaml` - Tests token selection

#### Other Components
- Navigation tests → `navigation/` flows
- TradeConfirmation tests → `trading/confirmation.yaml`
- NewCoins tests → `home/new-coins.yaml`
- CoinChart tests → `coin-detail/chart.yaml`

## 🚀 Implementation Strategy

### Phase 1: Core Screen Flows ✅
1. Home screen flows
2. Trade screen flows  
3. Settings screen flows

### Phase 2: Component Flows
1. TokenSelector flows
2. Navigation flows
3. Confirmation flows

### Phase 3: Edge Cases & Error Handling
1. Error scenarios
2. Loading states
3. Network failures

### Phase 4: Integration & Cleanup
1. Remove Jest screen tests
2. Update CI/CD
3. Documentation 