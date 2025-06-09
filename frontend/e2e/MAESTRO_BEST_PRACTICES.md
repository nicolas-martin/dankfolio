# 🎭 Maestro Test Best Practices

## 📁 Project Structure

```
e2e/
├── pages/                    # Page Object Model files
│   ├── homePage.js          # Home screen elements
│   ├── coinCardPage.js      # Coin card elements
│   └── ...
├── flows/
│   ├── common/              # Reusable flows
│   │   ├── app-setup.yaml   # Common app initialization
│   │   ├── navigation.yaml  # Navigation patterns
│   │   └── coin-interaction.yaml # Coin interaction patterns
│   ├── components/          # Component-specific tests
│   │   ├── coin-card-element.yaml
│   │   └── ...
│   └── screens/             # Full screen tests
│       ├── trending-coins.yaml
│       └── ...
└── README.md
```

## 🎯 Key Principles

### 1. **Page Object Model (POM)**
- All UI elements are defined in JavaScript files under `pages/`
- Use functions for dynamic selectors (e.g., `coinCard: (address) => \`coin-card-\${address}\``)
- Group related elements logically
- Export via `output.pageName = { ... }`

### 2. **Reusable Flows**
- Common actions are extracted to `flows/common/`
- Use `runFlow` to include reusable components
- Pass parameters via environment variables
- Keep flows focused and single-purpose

### 3. **Environment Variables**
- Use `env:` section for test configuration
- Pass dynamic data between flows
- Default values in `evalScript` for flexibility

## 📝 Usage Examples

### Using Page Object Model
```yaml
# Load the page object
- runScript: ../../pages/coinCardPage.js

# Use elements from POM
- assertVisible:
    id: ${output.coinCardPage.coinCard(coinAddress)}
```

### Using Reusable Flows
```yaml
# Use common setup
- runFlow: ../common/app-setup.yaml

# Use component test with parameters
- runFlow:
    file: ../components/coin-card-element.yaml
    env:
      COIN_ADDRESS: "So11111111111111111111111111111111111111112"
```

### Dynamic Element Selection
```yaml
- evalScript: |
    const coinAddress = COIN_ADDRESS || output.coinCardPage.addresses.SOL;
    output.testData = {
      coinCardId: output.coinCardPage.coinCard(coinAddress)
    };

- tapOn:
    id: ${output.testData.coinCardId}
```

## ✅ Benefits

1. **Maintainability**: Change selectors in one place
2. **Reusability**: Share common flows across tests
3. **Readability**: Clear, descriptive element names
4. **Flexibility**: Easy parameter passing
5. **Scalability**: Easy to add new tests and elements

## 🔧 Best Practices

- Always load POM files with `runScript` before using elements
- Use descriptive names for flows and elements
- Keep flows small and focused
- Use environment variables for test data
- Include comments explaining complex logic
- Test both positive and negative scenarios
- Use `optional: true` for elements that may not always be present

## 🚀 Running Tests

```bash
# Run single test
maestro test flows/screens/trending-coins.yaml

# Run all tests in directory
maestro test flows/screens/

# Run with custom environment
maestro test flows/screens/trending-coins.yaml --env COIN_ADDRESS=CustomAddress

# Generate reports
maestro test flows/screens/ --format html
maestro test flows/screens/ --format junit --output results/
``` 