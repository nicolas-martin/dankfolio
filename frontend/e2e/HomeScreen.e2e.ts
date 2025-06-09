import { device, element, by, expect, waitFor } from 'detox';
import { mockCoins } from './mocks/mockData'; // Assuming mockCoins[0] is SOL, mockCoins[1] is USDC

const TEST_IDS = {
  // HomeScreen specific Test IDs
  HOME_SCREEN: 'home-screen', // Root view of the screen
  COIN_FLAT_LIST: 'coin-flat-list', // The FlatList component displaying coins

  // CoinCard internal Test IDs (assuming a pattern)
  // These should match what's actually implemented in the CoinCard component
  COIN_CARD_PREFIX: 'coin-card-', // e.g., coin-card-SOL
  COIN_CARD_NAME_PREFIX: 'coin-card-name-', // e.g., coin-card-name-SOL
  COIN_CARD_SYMBOL_PREFIX: 'coin-card-symbol-', // e.g., coin-card-symbol-SOL
  COIN_CARD_PRICE_PREFIX: 'coin-card-price-', // e.g., coin-card-price-SOL
  COIN_CARD_LOADING_HISTORY_PREFIX: 'coin-card-loading-history-', // e.g., coin-card-loading-history-SOL (for price history loading indicator)

  // Search bar
  SEARCH_INPUT: 'home-search-input',

  // Potentially elements for "Newly Listed" if that's a separate section
  NEWLY_LISTED_SECTION: 'newly-listed-section',

  // For navigation to CoinDetailScreen (already defined in CoinDetailScreen.e2e.ts, but good to be aware)
  COIN_DETAIL_NAME_TEXT: 'coin-detail-name',
};

describe('HomeScreen', () => {
  const solanaCoin = mockCoins[0]; // SOL
  const usdcCoin = mockCoins[1];   // USDC

  beforeAll(async () => {
    // Using the debug wallet load flow from app.e2e.ts and CoinDetailScreen.e2e.ts
    // This ensures MSW handlers are active and we start from a known state.
    await device.launchApp({ delete: true });
    await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
    await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();

    // Wait for the home screen to be visible after debug wallet load.
    // The main content of the home screen is likely the coin list.
    await waitFor(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible().withTimeout(10000);
    await waitFor(element(by.id(TEST_IDS.COIN_FLAT_LIST))).toBeVisible().withTimeout(5000);
  });

  beforeEach(async () => {
    // For tests that navigate away, ensure we come back to HomeScreen
    // For now, no specific action. If a test navigates and doesn't return,
    // subsequent tests might start on the wrong screen.
    // A common pattern is `await device.reloadReactNative()` if tests are independent,
    // or ensure navigation back to Home if they are sequential and modify shared state.
  });

  it('should display a list of available coins with their names, symbols, and prices', async () => {
    // Check for Solana
    const solanaCardId = `${TEST_IDS.COIN_CARD_PREFIX}${solanaCoin.symbol}`;
    await expect(element(by.id(solanaCardId))).toBeVisible();
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_NAME_PREFIX}${solanaCoin.symbol}`))).toHaveText(solanaCoin.name);
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_SYMBOL_PREFIX}${solanaCoin.symbol}`))).toHaveText(solanaCoin.symbol);
    // Price check: $150.00 (assuming toFixed(2) formatting)
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PRICE_PREFIX}${solanaCoin.symbol}`))).toHaveText(`$${solanaCoin.price.toFixed(2)}`);

    // Check for USDC
    const usdcCardId = `${TEST_IDS.COIN_CARD_PREFIX}${usdcCoin.symbol}`;
    await expect(element(by.id(usdcCardId))).toBeVisible();
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_NAME_PREFIX}${usdcCoin.symbol}`))).toHaveText(usdcCoin.name);
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_SYMBOL_PREFIX}${usdcCoin.symbol}`))).toHaveText(usdcCoin.symbol);
    // Price check: $1.00
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PRICE_PREFIX}${usdcCoin.symbol}`))).toHaveText(`$${usdcCoin.price.toFixed(2)}`);

    // Also check that price history loading indicators are eventually not visible for these cards
    // MSW should make this fast.
    await waitFor(element(by.id(`${TEST_IDS.COIN_CARD_LOADING_HISTORY_PREFIX}${solanaCoin.symbol}`))).toBeNotVisible().withTimeout(5000);
    await waitFor(element(by.id(`${TEST_IDS.COIN_CARD_LOADING_HISTORY_PREFIX}${usdcCoin.symbol}`))).toBeNotVisible().withTimeout(5000);
  });

  it('should navigate to CoinDetailScreen when a coin card is tapped', async () => {
    const solanaCardId = `${TEST_IDS.COIN_CARD_PREFIX}${solanaCoin.symbol}`;
    await element(by.id(solanaCardId)).tap();

    // Verify navigation to CoinDetailScreen for Solana
    await waitFor(element(by.id(TEST_IDS.COIN_DETAIL_NAME_TEXT))).toBeVisible().withTimeout(5000);
    await expect(element(by.id(TEST_IDS.COIN_DETAIL_NAME_TEXT))).toHaveText(solanaCoin.name);

    // Navigate back to HomeScreen for subsequent tests
    await device.pressBack();
    await waitFor(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible().withTimeout(5000);
  });

  it('should filter the coin list when text is entered in the search input', async () => {
    // Assuming mockCoins has 'Solana' (SOL) and 'USD Coin' (USDC)
    // and we add another coin like 'TestCoin' (TST) to mockData for robust search testing.
    // For now, we'll work with SOL and USDC.

    await element(by.id(TEST_IDS.SEARCH_INPUT)).typeText('Solana');

    // Solana should be visible
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${solanaCoin.symbol}`))).toBeVisible();
    // USDC should not be visible
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${usdcCoin.symbol}`))).toBeNotVisible();

    // Clear search (assuming a clear button or backspace)
    // If no clear button, typing backspace characters: '\b'.repeat('Solana'.length)
    await element(by.id(TEST_IDS.SEARCH_INPUT)).clearText(); // Or .replaceText('') if clearText isn't specific enough

    // Both should be visible again
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${solanaCoin.symbol}`))).toBeVisible();
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${usdcCoin.symbol}`))).toBeVisible();

    // Search for 'USDC'
    await element(by.id(TEST_IDS.SEARCH_INPUT)).typeText('USDC');
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${solanaCoin.symbol}`))).toBeNotVisible();
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${usdcCoin.symbol}`))).toBeVisible();

    await element(by.id(TEST_IDS.SEARCH_INPUT)).clearText(); // Or .replaceText('')
  });

  // TODO: Test for empty state (e.g., if MSW returned an empty array for GetAvailableCoins)
  // This would require a way to modify MSW handlers on-the-fly or have specific launch arguments.

  // TODO: Test pull-to-refresh if implemented.
  // await element(by.id(TEST_IDS.COIN_FLAT_LIST)).swipe('down', 'fast', 0.5); // Adjust parameters
  // Then check for some loading indicator or updated data.

  // Note on Price History Fetching Logic (Sequential/Parallel):
  // Directly testing the *mode* (sequential vs parallel) of price history fetching is challenging with Detox
  // as it's a black-box testing tool. We primarily test the outcome: that price history data loads
  // (e.g., loading indicators disappear). The MSW mocks for GetPriceHistory will serve data quickly.
  // If there were visual cues tied to the fetching mode (e.g., a global "loading price data..." message
  // that behaves differently), those could be asserted. Without such cues, we assume the underlying
  // mechanism works if the end result (data loaded) is achieved.
});
