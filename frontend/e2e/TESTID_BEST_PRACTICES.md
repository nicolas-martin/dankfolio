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
    testID={`coin-card-${coin.mintAddress}`}
    onPress={handlePress}
>
    <CachedImage
        testID={`coin-icon-${coin.mintAddress}`}
        uri={coin.resolvedIconUrl}
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

### **2. Maestro Flow Patterns**
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

### **3. Critical Success Factors**

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

### **AmountPercentageButtons Component**
- `amount-percentage-button-${percent}` - Percentage button (25, 50, 75, 100)
- `amount-percentage-text-${percent}` - Percentage text inside button

### **TokenSelector Component**
- `token-selector-icon-${mintAddress}` - Token icon (when token selected)
- `token-selector-symbol-${mintAddress}` - Token symbol (when token selected)
- `token-selector-placeholder` - Placeholder text (when no token selected)

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

## 🚀 **Next Steps**

1. **Expand testID Coverage**: Add testIDs to more components
2. **Create More Flows**: Build comprehensive test suites using testID
3. **Document Patterns**: Keep this guide updated with new patterns
4. **Build Process**: Ensure CI/CD includes testID in builds

## 📚 **References**

- [Original Theodo Article](https://blog.theodo.com/2024/03/three-hacks-level-up-maestro-testing/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- Our working test: `frontend/e2e/flows/screens/home-coincard-working.yaml`

---

**✨ Key Takeaway**: The article's approach works perfectly! testID is reliable for targeting specific components, and regex helps with text matching issues. 