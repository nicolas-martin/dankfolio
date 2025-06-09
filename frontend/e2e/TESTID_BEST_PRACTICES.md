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
3. **Document Patterns**: Keep this guide updated with new testIDs

### **CoinDetail Screen Components**

#### **Main Screen**
- `coin-detail-screen` - Main screen container

#### **Price Display Section**
- `coin-detail-price-card` - Price card container
- `price-display-container` - Price display component container
- `price-display-coin-icon` - Coin icon image
- `price-display-coin-name` - Coin name text
- `price-display-coin-address` - Coin address text
- `price-display-current-price` - Current price display
- `price-display-price-change` - Price change text
- `price-display-period` - Time period text
- `price-display-copy-address-button` - Copy address button

#### **Chart Section**
- `coin-detail-chart-card` - Chart card container
- `coin-chart-container` - Chart component container

#### **Timeframe Selection**
- `coin-detail-timeframe-card` - Timeframe card container
- `coin-detail-timeframe-buttons` - Timeframe selection buttons

#### **Holdings Section** (Optional - only if user has holdings)
- `coin-detail-holdings-card` - Holdings card container
- `coin-detail-holdings-title` - Holdings title text
- `coin-detail-portfolio-value-label` - Portfolio value label
- `coin-detail-portfolio-value` - Portfolio value amount
- `coin-detail-token-amount-label` - Token amount label
- `coin-detail-token-amount` - Token amount text

#### **About Section**
- `coin-detail-about-card` - About card container
- `coin-detail-about-title` - About section title

#### **Coin Info Sections** (Optional - may not be present for all coins)
- `coin-info-description-section` - Description section container
- `coin-info-description-title` - Description title
- `coin-info-description-text` - Description text content
- `coin-info-volume-section` - Volume section container
- `coin-info-volume-title` - Volume title
- `coin-info-volume-value` - Volume value
- `coin-info-tags-section` - Tags section container
- `coin-info-tags-title` - Tags title
- `coin-info-tag-${tag}` - Individual tag chip (e.g., `coin-info-tag-defi`)
- `coin-info-links-section` - Links section container
- `coin-info-links-title` - Links title
- `coin-info-website-link` - Website link
- `coin-info-twitter-link` - Twitter link
- `coin-info-telegram-link` - Telegram link
- `coin-info-discord-link` - Discord link
- `coin-info-date-section` - Date section container
- `coin-info-date-title` - Date title
- `coin-info-date-value` - Date value

#### **Trade Button**
- `trade-button` - Trade button

### **Navigation**
- `home-screen` - Home screen container
- `coin-detail-screen` - Coin detail screen

## 📚 **References**

- [Original Theodo Article](https://blog.theodo.com/2024/03/three-hacks-level-up-maestro-testing/)
- [Maestro Documentation](https://maestro.mobile.dev/)
- Our working test: `frontend/e2e/flows/screens/home-coincard-working.yaml`

---

**✨ Key Takeaway**: The article's approach works perfectly! testID is reliable for targeting specific components, and regex helps with text matching issues. 