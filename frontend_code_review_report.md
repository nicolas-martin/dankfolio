# Frontend Code Review Report

This report summarizes findings from security, performance, and code structure analyses of the frontend codebase.

## 1. Security Issues

### 1.1. Insecure AsyncStorage for Wallet (Dead Code)
- **File:** `frontend/src/services/wallet.ts`
- **Issue:** Contains unused code (`secureStorage` object) for insecurely storing wallet private keys using `AsyncStorage`. This was confirmed by `grep` analysis showing no external usages.
- **Risk:** Low, as the code appears to be dead/unused. However, it's a latent risk if accidentally used in the future.
- **Fix:** Remove the `secureStorage` object and its methods (`saveWallet`, `getWallet`, `deleteWallet`) from `frontend/src/services/wallet.ts`.
- **Benefit:** Prevents accidental future use of insecure storage for sensitive data, enhancing overall security hygiene.

### 1.2. Outdated Dependencies
- **Issue:** Numerous outdated dependencies (e.g., `react-native`, `firebase`, `@react-native-async-storage/async-storage`, `@react-navigation/native-stack`) identified by `yarn outdated`.
- **Risk:** Medium to High. Outdated packages can contain known, unpatched vulnerabilities. The specific risk depends on the vulnerabilities present in the outdated versions.
- **Fix:**
    - Systematically research each outdated package for known vulnerabilities using `npm audit`, Snyk, or GitHub Advisories.
    - Prioritize updating packages with known vulnerabilities or those critical to security (core frameworks, auth/data handling libraries).
    - Update dependencies: start with patch and minor versions, then tackle major versions while carefully reviewing changelogs for breaking changes.
    - Thoroughly test the application after updates to ensure no functionality is broken.
- **Benefit:** Patches potential known security vulnerabilities present in older package versions, reducing the attack surface.

## 2. Performance Issues

### 2.1. HomeScreen: `useEffect` for Price Histories
- **File:** `frontend/src/screens/Home/index.tsx` (Lines ~88-150, effect depending on `availableCoins`)
- **Issue:** State updates for `priceHistories` and `isLoadingPriceHistories` (`setPriceHistories(prev => ({ ...prev, ... }))`) inside loops create new state objects for each coin. This can lead to multiple rapid re-renders.
- **Fix:** Batch state updates for `priceHistories` and `isLoadingPriceHistories` where possible (e.g., build a single updates object then call the setter once per effect run). Ensure `availableCoins` reference from the Zustand store (`useCoinStore`) is stable if its content hasn't actually changed.
- **Benefit:** Reduces the number of re-renders on the HomeScreen, improving UI responsiveness and smoothness, especially during initial data load.

### 2.2. HomeScreen: `renderTrendingCoinItem` `onPress` Prop
- **File:** `frontend/src/screens/Home/index.tsx`
- **Issue:** The `onPress` prop for `CoinCard` within `renderTrendingCoinItem` is an inline arrow function: `onPress={() => handlePressCoinCard(item)}`. This creates a new function reference on every render of `renderTrendingCoinItem`.
- **Fix:** The existing `handlePressCoinCard` is already memoized with `useCallback`. Pass this directly or ensure the `CoinCard` component is structured to receive the item and callback separately if direct passing isn't feasible (though it should be).
    ```javascript
    // In HomeScreen, if handlePressCoinCard has signature (item: Coin) => void
    // const renderTrendingCoinItem = useCallback(({ item }) => (
    //   <CoinCard coin={item} onPress={handlePressCoinCard} ... />
    // ), [priceHistories, isLoadingPriceHistories, handlePressCoinCard, styles.coinCardContainerStyle]);
    ```
- **Benefit:** Prevents breaking `React.memo` optimizations in `CoinCard` due to unstable `onPress` prop references.

### 2.3. CoinCard: `React.memo` Custom Comparison for `priceHistory`
- **File:** `frontend/src/components/Home/CoinCard/index.tsx`
- **Issue:** The custom comparison function in `React.memo` for `CoinCard` compares `priceHistory` using `prevProps.priceHistory === nextProps.priceHistory`. This is a reference check. If `HomeScreen` provides new array instances for `priceHistory` (even with identical content), `CoinCard` will re-render.
- **Fix:** The primary fix is to ensure stable references for `priceHistory` from `HomeScreen` when the data hasn't actually changed. If this proves difficult, a secondary, less ideal fix is to perform a shallow comparison of the `priceHistory` array's contents within `CoinCard`'s `React.memo` comparison function (e.g., check lengths and a few key data points if deep comparison is too costly).
- **Benefit:** Prevents unnecessary re-renders of `CoinCard` when its underlying price data hasn't meaningfully changed.

### 2.4. NewCoins: Missing `React.memo`
- **File:** `frontend/src/components/Home/NewCoins/NewCoins.tsx`
- **Issue:** The `NewCoins` component is not wrapped in `React.memo`. It can re-render if its parent (`HomeScreen`) re-renders, even if `newlyListedCoins` data hasn't changed.
- **Fix:** Wrap `NewCoins` in `React.memo`: `export default React.memo(NewCoins);`.
- **Benefit:** Prevents unnecessary re-renders of the `NewCoins` component, improving overall `HomeScreen` performance.

### 2.5. Style Hooks (`useStyles`): New Object on Every Call
- **Files:** `frontend/src/screens/Home/home_styles.ts`, `frontend/src/screens/Search/styles.ts`, and likely others following this pattern.
- **Issue:** The `useStyles` hook (e.g., in `home_styles.ts`) creates a new `styles` object (from `StyleSheet.create`) and returns a new composite object `{ ...styles, colors, theme }` on every call.
- **Fix:** Memoize the output of `useStyles` using `useMemo` based on the `theme` object.
  ```typescript
  // Example for home_styles.ts
  export const useStyles = () => {
    const theme = useTheme() as AppTheme; // Assuming AppTheme is your extended theme type
    return useMemo(() => {
      const stylesObject = StyleSheet.create({ /* ... all your style definitions ... */ });
      return { ...stylesObject, colors: theme.colors, theme };
    }, [theme]);
  };
  ```
- **Benefit:** Ensures that style objects are stable across re-renders unless the theme changes. This prevents breaking memoization of `useCallback` hooks or child components that depend on these style props.

### 2.6. SearchScreen: `useEffect` for Debounced Search Dependency
- **File:** `frontend/src/screens/Search/index.tsx`
- **Issue:** The `handleSearch` callback is a dependency of the debouncing `useEffect`. `handleSearch` itself is memoized with `useCallback(..., [state.filters])`. Since `state.filters` is an object, it's recreated on any filter change, causing `handleSearch` to be recreated, potentially leading to unexpected behavior in the debounce effect.
- **Fix:** Destructure `state.filters` into its specific primitive fields within the dependency array of `handleSearch`'s `useCallback`: `useCallback(..., [state.filters.query, state.filters.sortBy, ...])`.
- **Benefit:** Stabilizes the `handleSearch` callback, ensuring the debounce `useEffect` only re-evaluates its dependencies when the relevant filter fields actually change.

### 2.7. SearchScreen: `renderItem` for `FlatList`
- **File:** `frontend/src/screens/Search/index.tsx`
- **Issue:** The `renderItem` function for the `FlatList` is defined directly within the `SearchScreen`'s render scope, meaning it's recreated on every render of `SearchScreen`.
- **Fix:** Wrap the `renderItem` function in `useCallback`: `const renderItem = useCallback(({ item }) => { ... }, [/* stable dependencies like styles, onItemPress callback */]);`.
- **Benefit:** Stabilizes the `renderItem` prop for `FlatList`, allowing for better optimization of list item rendering and re-rendering.

### 2.8. SearchScreen: `onPress` for `SearchResultItem`
- **File:** `frontend/src/screens/Search/index.tsx` (inside `renderItem`)
- **Issue:** An inline arrow function `onPress={(coin) => { ... }}` is used, creating a new `onPress` prop for each `SearchResultItem` whenever `renderItem` is executed.
- **Fix:** Define a stable `onItemPress` callback in `SearchScreen` using `useCallback`: `const onItemPress = useCallback((coin) => { ... }, [navigation, ...]);`. Pass this `onItemPress` to `SearchResultItem`.
- **Benefit:** Prevents breaking memoization in `SearchResultItem` due to unstable prop references.

### 2.9. SearchScreen: `FlatList` Missing Optimizations
- **File:** `frontend/src/screens/Search/index.tsx`
- **Issue:** The `FlatList` component is missing common performance optimization props like `getItemLayout`, `initialNumToRender`, `maxToRenderPerBatch`, and `windowSize`.
- **Fix:** Add these props to the `FlatList`. `getItemLayout` would require items to have a fixed height.
- **Benefit:** Improves list rendering performance, reduces memory consumption, and enhances user experience, especially for potentially long lists of search results.

### 2.10. SearchResultItem: Missing `React.memo`
- **File:** `frontend/src/components/Common/SearchResultItem/index.tsx`
- **Issue:** The `SearchResultItem` component is not wrapped in `React.memo`.
- **Fix:** Wrap `SearchResultItem` in `React.memo`: `export default React.memo(SearchResultItem);`. Consider if a custom comparison function is needed, especially if the `coin` object prop might have an unstable reference despite unchanged content.
- **Benefit:** Prevents unnecessary re-renders of search result list items, improving search performance and responsiveness.

## 3. Code Structure Issues

### 3.1. Reusable Hook: `useTransactionPolling`
- **Files Affected:** `frontend/src/screens/Send/index.tsx`, `frontend/src/screens/Send/scripts.ts`, `frontend/src/screens/Trade/index.tsx`, `frontend/src/screens/Trade/scripts.ts`.
- **Issue:** Both `SendScreen` and `TradeScreen` implement nearly identical complex logic for polling transaction status, including state management for hash, status, confirmations, error, interval refs, and effect cleanup.
- **Suggestion:** Create a `useTransactionPolling` hook in `frontend/src/hooks/`. This hook should encapsulate all polling state, effects, and the core polling functions (`startPolling`, `stopPolling`, `pollStatus`). It could potentially accept the specific gRPC polling method as an argument to remain generic.
- **Benefit:** Drastically reduces code duplication, centralizes polling logic for easier maintenance and testing, and simplifies the screen components.

### 3.2. Reusable Hook: `usePriceHistory`
- **Files Affected:** `frontend/src/screens/CoinDetail/index.tsx`, `frontend/src/screens/CoinDetail/coindetail_scripts.ts`.
- **Issue:** `CoinDetailScreen` contains complex `useEffect` logic for fetching coin price history, managing loading states (differentiating initial load vs. timeframe changes), and handling errors.
- **Suggestion:** Create a `usePriceHistory(coin, selectedTimeframe)` hook in `frontend/src/hooks/` to abstract this data fetching mechanism, related state management (data, loading, error), and the effect logic.
- **Benefit:** Simplifies `CoinDetailScreen`, makes price history fetching reusable if needed elsewhere, and improves separation of concerns.

### 3.3. Reusable Hook: `useDebouncedCallback`
- **Files Affected:** `frontend/src/screens/Search/index.tsx` (for search input), `frontend/src/screens/Trade/scripts.ts` (for quote fetching in `handleAmountChange`).
- **Issue:** Manual implementation of debouncing logic using `setTimeout` and `clearTimeout`.
- **Suggestion:** Create a generic `useDebouncedCallback(callback, delay)` hook in `frontend/src/hooks/`.
- **Benefit:** Provides a reusable, standardized, and cleaner way to implement debouncing for any function call.

### 3.4. Service Layer Centralization
- **Issues & Suggestions:**
    - Move `fetchPriceHistory` (from `CoinDetail/coindetail_scripts.ts`) to `frontend/src/services/grpcApi.ts` or a new domain-specific service like `coinDataService.ts`.
    - Move `getCoinPrices` and `fetchTradeQuote` (from `Trade/scripts.ts`) to `frontend/src/services/grpcApi.ts` or a new `tradeService.ts`.
- **Benefit:** Improves separation of concerns by moving direct data fetching/API interactions out of screen-specific scripts and into a dedicated service layer. This enhances testability and maintainability.

### 3.5. Utility Function Consolidation
- **Issues & Suggestions:**
    - **`formatTokenBalance`:** A local version exists in `Send/scripts.ts`. Consolidate to use the existing function in `frontend/src/utils/numberFormat.ts`.
    - **`truncateAddress` / `formatAddress`:** Found in `SearchResultItem/scripts.ts` and `TradeConfirmation/index.tsx`. If functionality is identical or very similar, consolidate into a single utility in `frontend/src/utils/stringFormat.ts` (new file) or `cryptoUtils.ts`.
    - **`TIMEFRAMES` constant:** Defined in `CoinDetail/coindetail_scripts.ts`. If this constant is or could be used by other charting components or data utilities, move it to `frontend/src/utils/constants.ts`.
- **Benefit:** Reduces code duplication, ensures consistency in utility functions, and improves code discoverability.

### 3.6. Reusable Component: `InfoState` / `EmptyState`
- **Files Affected:** `frontend/src/screens/Home/index.tsx`, `frontend/src/screens/Search/index.tsx`, `frontend/src/screens/Trade/index.tsx`.
- **Issue:** These screens implement custom JSX for displaying loading, error, and empty data states, with some structural similarities (e.g., icon + title + message).
- **Suggestion:** Create a reusable `InfoState` component in `frontend/src/components/Common/` that accepts props like `isLoading`, `iconName`, `title`, `message`, and `styles` to standardize these common UI states.
- **Benefit:** Reduces UI boilerplate, ensures consistent user experience for these states, and simplifies screen components.

### 3.7. Reusable Component: `ManagedBottomSheetModal` / Hook
- **Files Affected:** `frontend/src/components/Trade/TradeConfirmation/index.tsx`, `frontend/src/components/Trade/TradeStatusModal/index.tsx`.
- **Issue:** Both components use `@gorhom/bottom-sheet` and share significant boilerplate for ref handling, `useEffect` for visibility control, backdrop rendering, and common accessibility props.
- **Suggestion:** Create a wrapper component `ManagedBottomSheetModal` or a custom hook `useManagedBottomSheet` in `frontend/src/components/Common/BottomSheet/` to encapsulate this common setup logic for bottom sheet modals.
- **Benefit:** Simplifies the implementation of bottom sheet modals, reduces boilerplate, and ensures consistency in their behavior.

### 3.8. Reusable Component: `ModalActionButtons`
- **Files Affected:** `frontend/src/components/Trade/TradeConfirmation/index.tsx`, `frontend/src/components/Common/TermsModal/index.tsx`.
- **Issue:** Repeated pattern of primary and secondary action buttons (e.g., "Confirm"/"Cancel", "Accept"/"Decline") at the bottom of modals.
- **Suggestion:** Create a `ModalActionButtons` component in `frontend/src/components/Common/` that takes props for labels, handlers, and loading states.
- **Benefit:** Standardizes the layout, styling, and behavior of action button sections in modals.

### 3.9. Reusable Component: `CoinInfoBlock`
- **Files Affected:** `frontend/src/components/Home/CoinCard/index.tsx`, `frontend/src/components/Home/HorizontalTickerCard/index.tsx`, `frontend/src/components/Common/SearchResultItem/index.tsx`.
- **Issue:** These components repeat a common UI pattern: `[Icon] - [Primary Text (e.g., Symbol/Name)] - [Secondary Text (e.g., Name/Address/Time Ago)]`.
- **Suggestion:** Create a `CoinInfoBlock` component in `frontend/src/components/Common/` to encapsulate this display element, taking props for icon URI, texts, and styling.
- **Benefit:** Promotes consistency in displaying basic coin information and reduces JSX duplication in card/item components.

### 3.10. Reusable Component: `VerificationCard`
- **Files Affected:** `frontend/src/screens/Send/index.tsx` (currently implemented as `renderVerificationCard`).
- **Issue:** The UI for displaying address verification feedback, including conditional styling and icons based on status codes, could be reusable in other forms or input validation scenarios.
- **Suggestion:** If this specific feedback pattern is needed elsewhere, extract `renderVerificationCard` into a dedicated `VerificationCard` component, possibly in `frontend/src/components/Common/Form/`.
- **Benefit:** Makes the address/input verification UI pattern reusable and self-contained.

## 4. Bonus Cleanup Summary (Code Structure Focus)

- **Identified Reusable Components:** `InfoState`, `ManagedBottomSheetModal`, `ModalActionButtons`, `CoinInfoBlock`, `VerificationCard`. Creating these would significantly improve UI consistency and reduce code duplication.
- **Suggested Reusable Hooks:** `useTransactionPolling`, `usePriceHistory`, `useDebouncedCallback`. Implementing these would abstract complex logic, enhance testability, and simplify component code.
- **General Code Quality:** The codebase shows good use of `scripts.ts` files for separating screen-specific logic and `utils` for common helpers. The main areas for structural improvement involve identifying and creating more shared abstractions (hooks and components) for repeated patterns.
```
