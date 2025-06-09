# 🎯 Testing Refactor Plan: Maestro + Jest Migration

## Overview
Migrate frontend tests to use **Maestro for UI/E2E testing** and **Jest for logic/unit testing**, leveraging the existing MSW API mocking setup.

## Current State Analysis

### Existing Test Files
```
frontend/src/utils/timeFormat.test.ts                    → Keep in Jest (logic)
frontend/src/utils/numberFormat.test.ts                  → Keep in Jest (logic)
frontend/src/screens/Settings/SettingsScreen.test.tsx   → Migrate to Maestro (UI)
frontend/src/screens/Home/HomeScreen.test.tsx           → Migrate to Maestro (UI)
frontend/src/screens/Trade/TradeScreen.test.tsx         → Migrate to Maestro (UI)
frontend/src/screens/Trade/TradeScreen.Confirmation.test.tsx → Migrate to Maestro (UI)
frontend/src/screens/CoinDetail/CoinDetailScreen.test.tsx → Migrate to Maestro (UI)
frontend/src/screens/CoinDetail/coindetail_scripts.test.ts → Keep in Jest (logic)
frontend/src/screens/Profile/ProfileScreen.test.tsx     → Migrate to Maestro (UI)
frontend/src/screens/Send/SendScreen.test.tsx           → Migrate to Maestro (UI)
frontend/src/screens/Send/__tests__/scripts.test.ts     → Keep in Jest (logic)
frontend/src/components/Home/NewCoins/NewCoins.test.tsx → Migrate to Maestro (UI)
frontend/src/components/Trade/TradeConfirmation/TradeConfirmation.test.tsx → Migrate to Maestro (UI)
frontend/src/components/Chart/CoinChart/index.test.tsx  → Migrate to Maestro (UI)
frontend/src/components/Common/TokenSelector/TokenSelector.test.tsx → Migrate to Maestro (UI)
frontend/src/components/Common/Navigation/navigation.test.tsx → Migrate to Maestro (UI)
frontend/src/services/grpcApi.test.ts                   → Keep in Jest (logic)
frontend/src/services/api.test.ts                       → Keep in Jest (logic)
frontend/src/store/transactions.test.ts                 → Keep in Jest (logic)
frontend/src/store/coins.test.ts                        → Keep in Jest (logic)
frontend/src/store/portfolio.test.ts                    → Keep in Jest (logic)
```

### Existing Infrastructure
✅ MSW setup in `frontend/e2e/mocks/`
✅ Maestro basic setup with `appLoads.yaml`
✅ `env.loadDebugWallet` for skipping wallet setup
✅ E2E scripts in package.json

## Migration Strategy

### Phase 1: Setup & Configuration 🔧

1. **Update Jest Configuration**
   - Configure Jest to only run logic/unit tests
   - Exclude UI test files from Jest
   - Update test patterns

2. **Enhance Maestro Setup**
   - Create comprehensive Maestro flows
   - Set up test data and fixtures
   - Configure environment variables for E2E

3. **Update Package.json Scripts**
   - Separate Jest and Maestro commands
   - Add combined test runner
   - Update CI/CD scripts

### Phase 2: Core Flow Migration 🚀

#### Priority 1: Authentication & Navigation
- [ ] Wallet setup flow (with debug wallet bypass)
- [ ] Main navigation between screens
- [ ] Settings screen interactions

#### Priority 2: Core Trading Features
- [ ] Home screen coin browsing
- [ ] Coin detail screen
- [ ] Trade screen flow
- [ ] Trade confirmation
- [ ] Send/Transfer flow

#### Priority 3: Advanced Features
- [ ] Portfolio management
- [ ] Chart interactions
- [ ] Token selector
- [ ] New coins discovery

### Phase 3: Logic Test Enhancement 🧪

Keep and enhance Jest tests for:
- [ ] Utility functions (timeFormat, numberFormat)
- [ ] Business logic in scripts.ts files
- [ ] API services (grpcApi, api)
- [ ] Store logic (portfolio, coins, transactions)
- [ ] Component scripts and helpers

## Implementation Details

### Maestro Flow Structure
```
frontend/e2e/flows/
├── auth/
│   ├── wallet-setup.yaml
│   └── wallet-setup-debug.yaml
├── navigation/
│   ├── main-navigation.yaml
│   └── deep-linking.yaml
├── trading/
│   ├── coin-browsing.yaml
│   ├── coin-detail.yaml
│   ├── trade-flow.yaml
│   └── trade-confirmation.yaml
├── portfolio/
│   ├── portfolio-view.yaml
│   └── send-flow.yaml
└── components/
    ├── token-selector.yaml
    ├── chart-interactions.yaml
    └── new-coins.yaml
```

### Environment Configuration
```yaml
# Use existing MSW mocking
E2E_MOCKING_ENABLED=true
LOAD_DEBUG_WALLET=true  # Skip wallet setup
```

### Test Data Strategy
- Leverage existing MSW handlers in `e2e/mocks/handlers.ts`
- Use test-specific coins (coin1_mint, coin2_mint)
- Consistent test data across flows

## Benefits of This Approach

### Maestro for UI Testing ✨
- **Real device testing**: Tests actual user interactions
- **Visual validation**: Can test UI elements, animations, gestures
- **Cross-platform**: Same tests work on iOS/Android
- **Reliable**: Less flaky than component-level UI tests
- **User-focused**: Tests actual user journeys

### Jest for Logic Testing 🧠
- **Fast execution**: Unit tests run quickly
- **Precise testing**: Test specific functions and logic
- **Easy debugging**: Clear error messages and stack traces
- **Mocking capabilities**: Mock dependencies easily
- **Code coverage**: Track logic coverage effectively

### Combined Benefits 🎯
- **Separation of concerns**: UI vs Logic testing
- **Faster feedback**: Quick Jest tests + comprehensive Maestro flows
- **Better coverage**: Both user journeys and business logic
- **Maintainable**: Clear test boundaries and responsibilities

## Migration Timeline

### Week 1: Setup & Infrastructure
- [ ] Configure Jest for logic-only tests
- [ ] Set up Maestro flow structure
- [ ] Create basic authentication flows

### Week 2: Core Flows
- [ ] Migrate main screen tests to Maestro
- [ ] Create trading flow tests
- [ ] Set up portfolio tests

### Week 3: Component & Advanced Flows
- [ ] Migrate component tests to Maestro
- [ ] Create advanced interaction tests
- [ ] Performance and edge case testing

### Week 4: Cleanup & Documentation
- [ ] Remove old UI test files
- [ ] Update documentation
- [ ] CI/CD integration
- [ ] Team training

## Success Metrics

- [ ] All UI interactions tested via Maestro flows
- [ ] All business logic covered by Jest tests
- [ ] Test execution time < 5 minutes for Jest suite
- [ ] Test execution time < 15 minutes for Maestro suite
- [ ] 90%+ code coverage for logic tests
- [ ] 100% critical user journey coverage in Maestro

## Next Steps

1. **Start with Jest configuration** - Update to exclude UI tests
2. **Create core Maestro flows** - Begin with authentication
3. **Migrate incrementally** - One screen/component at a time
4. **Validate coverage** - Ensure no gaps in testing

This approach will give us robust, maintainable testing that covers both user experience and business logic effectively! 🚀 