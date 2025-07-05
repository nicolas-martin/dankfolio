# 🎯 testID Best Practices for Maestro Testing

## ✅ **CONFIRMED: testID Works Perfectly!**

Based on the [Theodo article](https://blog.theodo.com/2024/03/three-hacks-level-up-maestro-testing/) and our successful test results, here's what works:

## 📋 **Summary of Article's Key Points**

### **Hack 1: Using `testID` to Handle Variable Layouts** ✅
- **Problem**: CMS-driven content makes layout unpredictable
- **Solution**: Use `testID` props to reliably target specific components
- **Critical Warning**: Ensure your app build includes the `testID` changes!

### **Hack 2: Use Regex When String Matching** ✅  
- **Problem**: Sometimes exact string matching fails unexpectedly
- **Solution**: Use regex patterns like `".*SOL.*"` instead of exact strings

### **Hack 3: Use `evalScript` to Seed Test Data** 
- **Problem**: Need dynamic test data (like random strings for chat)
- **Solution**: Use `evalScript` to generate data inline in YAML

## 🛠️ **Our Implementation**

### **Working testID Examples**

#### ✅ **CoinCard Component**
```tsx
// In React Native component
<TouchableOpacity
    testID={`coin-card-${coin.address}`}
    onPress={handlePress}
>
    <CachedImage
        testID={`coin-icon-${coin.address}`}
        uri={coin.logoURI}
    />
</TouchableOpacity>
```

#### ✅ **Maestro Flow Usage**
```yaml
# Target coin cards using testID
- assertVisible:
    id: "coin-card-So11111111111111111111111111111111111111112"

- tapOn:
    id: "coin-card-DankCoin1111111111111111111111111111111"

# Use regex for text matching (Hack 2)
- assertVisible: ".*SOL.*"
- assertVisible: ".*DANK.*"
```

## 📊 **Test Results**

Our test `home-coincard-working.yaml` achieved **100% success**:

```
✅ Launch app "com.nicolasmartin.dankfolio"
✅ Assert that "Trending Coins" is visible
✅ Assert that id: coin-card-So11111111111111111111111111111111111111112 is visible
✅ Assert that id: coin-card-DankCoin1111111111111111111111111111111 is visible
✅ Assert that id: coin-card-MoonToken111111111111111111111111111111 is visible
✅ Assert that ".*SOL.*" is visible
✅ Assert that ".*DANK.*" is visible
✅ Assert that ".*MOON.*" is visible
✅ Tap on id: coin-card-So11111111111111111111111111111111111111112
✅ Assert that ".*About.*" is visible
✅ Tap on "Back"
✅ Assert that "Trending Coins" is visible
✅ Tap on id: coin-card-DankCoin1111111111111111111111111111111
✅ Assert that ".*DankCoin.*" is visible
```

## 🎯 **Best Practices**

### **1. testID Naming Convention**
```tsx
// Use descriptive, unique identifiers
testID={`coin-card-${coin.mintAddress}`}
testID={`coin-icon-${coin.mintAddress}`}
testID={`sparkline-${coin.mintAddress}`}

// For components without dynamic data
testID="from-token-selector"
testID="to-token-selector"
testID="amount-input"
```

### **2. Bottom Sheet Modals & Nested Components (iOS)** 🆕
**Official Maestro Solution**: [React Native - Interacting with nested components on iOS](https://docs.maestro.dev/platform-support/react-native#interacting-with-nested-components-on-ios)

For bottom sheet modals and nested tappable components on iOS, use this accessibility pattern:

```tsx
// ❌ WRONG: Both outer and inner components accessible
<BottomSheetModal accessible={true}>
  <TouchableOpacity accessible={true}>
    <Text>Button inside modal</Text>
  </TouchableOpacity>
</BottomSheetModal>

// ✅ CORRECT: Outer container disabled, inner components enabled
<BottomSheetModal accessible={false}>
  <TouchableOpacity accessible={true}>
    <Text>Button inside modal</Text>
  </TouchableOpacity>
</BottomSheetModal>
```

**Key Pattern**:
- Set `accessible={false}` on the **outer container** (BottomSheetModal)
- Set `accessible={true}` on **inner interactive components** (buttons, inputs, etc.)
- This allows Maestro to properly detect and interact with nested elements

**Applied in our components**:
- `TokenSelector` modal (token search and selection)
- `TradeConfirmation` modal 
- `TradeStatusModal`

### **3. Maestro Flow Patterns**
```yaml
# Assert element exists
- assertVisible:
    id: "coin-card-So11111111111111111111111111111111111111112"

# Interact with element
- tapOn:
    id: "coin-card-So11111111111111111111111111111111111111112"

# Use regex for text content (more reliable)
- assertVisible: ".*SOL.*"
- assertVisible: ".*Trending Coins.*"
```

### **4. Critical Success Factors**

#### ⚠️ **Build Synchronization** (Article's #1 Issue)
- **Always ensure your app build includes testID changes**
- **Use development builds for rapid iteration**
- **Create new staging builds when testing testID changes**

#### ✅ **Component Structure**
- Add testID to the main interactive element (TouchableOpacity, Button)
- Nested elements can have their own testIDs but may be harder to target
- Use unique identifiers (mint addresses, IDs) in testID strings

#### ✅ **Regex Usage**
- Use `".*text.*"` instead of exact strings when text matching fails
- Particularly useful for dynamic content or styled text

## 🔧 **Available testIDs in Our App**

### **CoinCard Component**
- `coin-card-${mintAddress}` - Main card touchable area
- `coin-icon-${mintAddress}` - Coin icon image
- `coin-symbol-${mintAddress}` - Coin symbol text
- `coin-price-${mintAddress}` - Coin price text
- `sparkline-${mintAddress}` - Price chart sparkline

### **HorizontalTickerCard Component**
- `horizontal-ticker-card-${mintAddress}` - Main card touchable area
- `coin-icon-${mintAddress}` - Coin icon image
- `horizontal-ticker-symbol-${mintAddress}` - Coin symbol text
- `horizontal-ticker-time-${mintAddress}` - Time ago text
- `horizontal-ticker-change-${mintAddress}` - Price change percentage

### **NewListingCard Component**
- `new-listing-card-${symbol.toLowerCase()}` - Main card touchable area
- `new-listing-icon-${symbol.toLowerCase()}` - Coin icon image
- `new-listing-symbol-${symbol.toLowerCase()}` - Coin symbol text

### **AmountPercentageButtons Component**
- `amount-percentage-button-${percent}` - Percentage button (25, 50, 75, 100)
- `amount-percentage-text-${percent}` - Percentage text inside button

### **TokenSelector Component**
- `${props.testID}-${selectedToken.symbol.toLowerCase()}` - Main selector button when token is selected (e.g., `from-token-selector-sol`, `to-token-selector-jup`).
- `${props.testID}-placeholder` - Placeholder text (e.g., "Select Token") when no token is selected. `props.testID` is the main `testID` passed to the `TokenSelector` instance (e.g., `from-token-selector-placeholder`).
- `${props.testID}-amount-input` - Amount input field within the selector. `props.testID` is the main `testID` passed to the `TokenSelector` instance (e.g., `from-token-selector-amount-input`).
- `${props.testID}-swap-button` - USD/Crypto swap button (only available when `enableUsdToggle=true`).
- `${props.testID}-secondary-value` - Secondary value display (USD when in crypto mode, crypto when in USD mode).
- **Token Search Modal (invoked by TokenSelector):**
    - `token-search-input` - Search input field within the token selection modal.
    - `search-result-${symbol.toLowerCase()}` - Pattern for items in the token search results list (e.g., `search-result-sol`, `search-result-jup`, `search-result-dank`). Uses the lowercase `symbol` of the coin in the list item.
    - `token-search-modal-backdrop` - The backdrop of the token search modal, can be tapped to dismiss.

### **TradeConfirmation Component**
- `from-token-details` - From token section container
- `from-token-symbol-${mintAddress}` - From token symbol
- `from-token-name-${mintAddress}` - From token name
- `from-token-amount` - From token amount
- `from-token-amount-usd` - From token USD value
- `to-token-details` - To token section container
- `to-token-symbol-${mintAddress}` - To token symbol
- `to-token-name-${mintAddress}` - To token name
- `to-token-amount` - To token amount
- `to-token-amount-usd` - To token USD value
- `fee-section` - Fee section container
- `fee-label` - Fee label text
- `fee-value` - Fee value text
- `cancel-trade-button` - Cancel button
- `confirm-trade-button` - Confirm button

### **Navigation**
- `home-screen` - Home screen container
- `coin-detail-screen` - Coin detail screen

### **Trade Screen Components**
- `trade-screen` - Main container for the trade screen.
- `trade-details-card` - Card displaying trade details like price impact, fees, etc.
- `trade-details-price-impact` - Text displaying the price impact percentage.
- `trade-details-network-fee` - Text displaying the network fee.
- `trade-details-route` - Text displaying the trade route (e.g., Jupiter).
- `trade-details-exchange-rate` - Text displaying the exchange rate between the two tokens.

### **TradeStatusModal Component**
- `trade-status-modal` - The main modal container for displaying trade status.
- `trade-status-icon` - Icon indicating the current status (e.g., success, pending, error).
- `trade-status-text` - Text displaying the primary status message (e.g., "Transaction Submitted").
- `trade-status-description` - Text providing more details about the current status.
- `trade-status-progress-bar` - The animated view representing the progress of confirmations.
- `trade-status-confirmations-text` - Text displaying the number of network confirmations.
- `trade-status-solscan-button` - Button to view the transaction on Solscan.
- `trade-status-error-message` - Text displaying error details if the trade fails.
- `trade-status-action-button` - The final action button (e.g., "Done" or "Try Again").

## 🔄 **Reusable Component Test Flows**

This section documents reusable Maestro flows that test specific component interactions. These flows can be called from other E2E tests using `runFlow`.

### **`select-token-in-selector.yaml`**
- **Purpose**: Tests selecting a token within any `TokenSelector` component instance, including typing a search query and asserting filter behavior.
- **Key Environment Variables**:
    - `selectorTestID`: The `testID` of the `TokenSelector` instance.
    - `coinAddressToSelect`: Mint address of the coin to be selected.
    - `coinSymbolToSelect`: Symbol of the coin to be selected.
    - `knownMatchingCoinAddress`: Mint address of a coin expected to be visible after filtering.
    - `knownMatchingCoinSymbol`: Symbol of a coin expected to be visible after filtering.
    - `knownNonMatchingCoinAddress`: Mint address of a coin expected NOT to be visible after filtering.
    - `knownNonMatchingCoinSymbol`: Symbol of a coin expected NOT to be visible after filtering.

### **`cancel-token-selection.yaml`**
- **Purpose**: Tests cancelling the token selection process from a `TokenSelector` modal by tapping the backdrop. It verifies that the initial selection (or placeholder) remains unchanged.
- **Key Environment Variables**:
    - `selectorTestID`: The `testID` of the `TokenSelector` instance.
    - `initialCoinAddress` (Optional): Mint address of the initially selected coin.
    - `initialCoinSymbol` (Optional): Symbol of the initially selected coin.

### **`assert-selected-token.yaml`**
- **Purpose**: Helper flow to assert that a specific token is currently selected and displayed in a `TokenSelector` instance.
- **Key Environment Variables**:
    - `selectorTestID`: The `testID` of the `TokenSelector` instance.
    - `expectedCoinAddress`: Mint address of the token expected to be selected.
    - `expectedCoinSymbol`: Symbol of the token expected to be selected.

### **`assert-placeholder-visible.yaml`**
- **Purpose**: Helper flow to assert that the placeholder (indicating no token is selected) is currently visible in a `TokenSelector` instance.
- **Key Environment Variables**:
    - `selectorTestID`: The `testID` of the `TokenSelector` instance.

## 🚀 **Next Steps**

1. **Expand testID Coverage**: Add testIDs to more components
2. **Create More Flows**: Build comprehensive test suites using testID
3. **Document Patterns**: Keep this guide updated with new testIDs

## 🔧 **Troubleshooting Bottom Sheet Modals**

### **Problem**: Elements inside bottom sheet modals not accessible to Maestro
**GitHub Issue**: [mobile-dev-inc/maestro#1493](https://github.com/mobile-dev-inc/maestro/issues/1493)

### **Symptoms**:
- `assertVisible` fails for elements inside bottom sheet modals
- `tapOn` cannot find buttons/inputs within modals
- Maestro Studio cannot inspect modal content

### **Root Cause**: 
iOS accessibility system treats nested accessible components differently, preventing testing frameworks from reaching inner elements.

### **Solution Applied** ✅:
Following the [official Maestro documentation](https://docs.maestro.dev/platform-support/react-native#interacting-with-nested-components-on-ios):

1. **Set `accessible={false}` on outer containers**:
   ```tsx
   <BottomSheetModal accessible={false}>
   ```

2. **Set `accessible={true}` on inner interactive elements**:
   ```tsx
   <Searchbar accessible={true} testID="token-search-input" />
   <TouchableOpacity accessible={true} testID="search-result-${coin.mintAddress}">
   ```

3. **Keep Android-specific properties for cross-platform support**:
   ```tsx
   importantForAccessibility="yes"
   ```

### **Components Fixed**:
- ✅ `TokenSelector` modal (token search and selection)
- ✅ `TradeConfirmation` modal 
- ✅ `TradeStatusModal`

### **Test Results**:
After applying the official solution, bottom sheet modal elements should now be properly accessible to Maestro testing.

## 📚 **References**

- [Original Theodo Article](https://blog.theodo.com/2024/03/three-hacks-level-up-maestro-testing/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- Our working test: `frontend/e2e/flows/screens/home-coincard-working.yaml`

---

**✨ Key Takeaway**: The article's approach works perfectly! testID is reliable for targeting specific components, and regex helps with text matching issues. 