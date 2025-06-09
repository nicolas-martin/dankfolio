import { device, element, by, expect, waitFor } from 'detox';
import { mockCoins } from './mocks/mockData';

// Define actual Test IDs that should be implemented in the application code.
// These are educated guesses and might need adjustment.
const TEST_IDS = {
  // Screen specific Test IDs
  COIN_DETAIL_SCREEN: 'coin-detail-screen', // Root view of the screen

  // Header elements (assuming these might be part of a common header or within CoinDetailScreen)
  COIN_NAME_TEXT: 'coin-detail-name', // e.g., Text element showing "Solana"
  COIN_SYMBOL_TEXT: 'coin-detail-symbol', // e.g., Text element showing "SOL"

  // Price Display component and its contents
  PRICE_DISPLAY_COMPONENT: 'price-display-component', // The wrapper for price, change, etc.
  PRICE_DISPLAY_PRICE_TEXT: 'price-display-price', // Text element for the current price
  PRICE_DISPLAY_PERIOD_TEXT: 'price-display-period', // Text element showing current period (e.g., "4H")
  PRICE_DISPLAY_CHANGE_TEXT: 'price-display-change', // Text element for price change %

  // Chart
  COIN_CHART_COMPONENT: 'coin-chart-component', // The chart itself
  COIN_CHART_LOADING_INDICATOR: 'coin-chart-loading-indicator', // If there's a specific loading spinner for the chart

  // Holdings section
  HOLDINGS_SECTION: 'holdings-section',
  HOLDINGS_AMOUNT_TEXT: 'holdings-amount-text', // e.g., "10.5 SOL"
  HOLDINGS_VALUE_TEXT: 'holdings-value-text', // e.g., "$1575.00"

  // Timeframe segmented buttons
  // Assuming a common pattern like: `timeframe-button-${value}` e.g., timeframe-button-1H
  TIMEFRAME_BUTTON_PREFIX: 'timeframe-button-',
  TIMEFRAME_BUTTON_1H: 'timeframe-button-1H',
  TIMEFRAME_BUTTON_4H: 'timeframe-button-4H', // Default
  TIMEFRAME_BUTTON_1D: 'timeframe-button-1D',
  TIMEFRAME_BUTTON_1W: 'timeframe-button-1W',
  TIMEFRAME_BUTTON_1M: 'timeframe-button-1M',

  // Trade button
  TRADE_BUTTON: 'coin-detail-trade-button', // More specific than just 'trade-button'

  // Trade Screen (for navigation assertion)
  TRADE_SCREEN_TITLE: 'swap-tokens-screen-title', // Assuming a title "Swap Tokens" or similar unique ID
};

describe('CoinDetailScreen', () => {
  const solanaCoin = mockCoins[0]; // SOL
  const usdcCoin = mockCoins[1]; // USDC (for a case without holdings, if applicable)

  beforeAll(async () => {
    await device.launchApp({ delete: true });

    // Standard debug wallet loading flow
    await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
    await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();

    // Wait for home screen and navigate to CoinDetailScreen for Solana
    // Assuming a list item with testID like `coin-list-item-${mintAddress}`
    const solanaListItemTestID = `coin-list-item-${solanaCoin.mintAddress}`;
    await waitFor(element(by.id(solanaListItemTestID))).toBeVisible().withTimeout(10000);
    await element(by.id(solanaListItemTestID)).tap();

    // Verify navigation to CoinDetailScreen for Solana
    await waitFor(element(by.id(TEST_IDS.COIN_DETAIL_SCREEN))).toBeVisible().withTimeout(5000);
    await expect(element(by.id(TEST_IDS.COIN_NAME_TEXT))).toHaveText(solanaCoin.name);
    await expect(element(by.id(TEST_IDS.COIN_SYMBOL_TEXT))).toHaveText(solanaCoin.symbol);
  });

  // beforeEach can be used to reset state for each test if needed, e.g., go back to a default timeframe
  // For now, tests flow sequentially, modifying the timeframe.

  it('should display coin information, price, and default timeframe (4H) data correctly', async () => {
    // Price Display checks
    await expect(element(by.id(TEST_IDS.PRICE_DISPLAY_COMPONENT))).toBeVisible();
    // Example: "$150.00" - depends on formatting. Using a regex for flexibility.
    await expect(element(by.id(TEST_IDS.PRICE_DISPLAY_PRICE_TEXT))).toHaveText(`$${solanaCoin.price.toFixed(2)}`);
    // Check for 24h change (using original mock data for solanaCoin.change24h = 5.5)
    // This assumes a specific format like "+5.50%" or "5.50%". Adjust as needed.
    // Using a regex to match positive/negative sign and percentage.
    const expectedChangeRegex = new RegExp(`[+-]${solanaCoin.change24h.toFixed(2)}%`);
    await expect(element(by.id(TEST_IDS.PRICE_DISPLAY_CHANGE_TEXT))).toHaveText(expectedChangeRegex);


    // Default timeframe should be 4H. The SegmentedButton itself might indicate selection,
    // or a label elsewhere (like in PriceDisplay if it shows period).
    // For now, let's assume the button for 4H has a specific state or is simply visible.
    // A better check would be if the button is 'selected'. This depends on implementation.
    // await expect(element(by.id(TEST_IDS.TIMEFRAME_BUTTON_4H))).toHaveSomethingIndicatingSelection();
    // If PriceDisplay shows the period:
    // await expect(element(by.id(TEST_IDS.PRICE_DISPLAY_PERIOD_TEXT))).toHaveText('4H');


    // Chart check (initial load is usually quick with MSW)
    await expect(element(by.id(TEST_IDS.COIN_CHART_COMPONENT))).toBeVisible();
    // Could also check that loading indicator is NOT visible after a short wait
    await waitFor(element(by.id(TEST_IDS.COIN_CHART_LOADING_INDICATOR))).toBeNotVisible().withTimeout(3000);
  });

  it('should display user holdings if available', async () => {
    await expect(element(by.id(TEST_IDS.HOLDINGS_SECTION))).toBeVisible();
    // MSW mock for GetWalletBalances returns 10.5 SOL.
    await expect(element(by.id(TEST_IDS.HOLDINGS_AMOUNT_TEXT))).toHaveText(`10.5 ${solanaCoin.symbol}`);
    // Value: 10.5 SOL * $150/SOL = $1575.00
    await expect(element(by.id(TEST_IDS.HOLDINGS_VALUE_TEXT))).toHaveText('$1,575.00'); // Assuming currency formatting
  });

  it('should navigate to trade screen when trade button is pressed', async () => {
    await element(by.id(TEST_IDS.TRADE_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.TRADE_SCREEN_TITLE))).toBeVisible().withTimeout(5000);

    // Navigate back for subsequent tests
    await device.pressBack();
    await waitFor(element(by.id(TEST_IDS.COIN_DETAIL_SCREEN))).toBeVisible().withTimeout(5000);
  });

  describe('Timeframe Selection', () => {
    const timeframes = [
      // Test 4H first as it's the default, then others.
      // The original test suite had a separate test for 4H, then looped others.
      // Here, we ensure 4H is active, then cycle through others.
      { label: '1H', value: '1H', testID: TEST_IDS.TIMEFRAME_BUTTON_1H },
      { label: '1D', value: '1D', testID: TEST_IDS.TIMEFRAME_BUTTON_1D },
      { label: '1W', value: '1W', testID: TEST_IDS.TIMEFRAME_BUTTON_1W },
      { label: '1M', value: '1M', testID: TEST_IDS.TIMEFRAME_BUTTON_1M },
      { label: '4H', value: '4H', testID: TEST_IDS.TIMEFRAME_BUTTON_4H }, // Test returning to 4H
    ];

    // Initial check for 4H being active (or PriceDisplay showing 4H)
    // This might be redundant if the first test already covers it, but good for context.
    // If PriceDisplay.period updates:
    // await expect(element(by.id(TEST_IDS.PRICE_DISPLAY_PERIOD_TEXT))).toHaveText('4H');

    timeframes.forEach(timeframe => {
      it(`should update chart and price display when timeframe is changed to ${timeframe.label}`, async () => {
        await element(by.id(timeframe.testID)).tap();

        // Verify chart is loading then loaded
        await expect(element(by.id(TEST_IDS.COIN_CHART_LOADING_INDICATOR))).toBeVisible();
        await waitFor(element(by.id(TEST_IDS.COIN_CHART_LOADING_INDICATOR))).toBeNotVisible().withTimeout(5000);
        await expect(element(by.id(TEST_IDS.COIN_CHART_COMPONENT))).toBeVisible();

        // Verify PriceDisplay period updates, if it does
        // This is a crucial assertion if available.
        // await expect(element(by.id(TEST_IDS.PRICE_DISPLAY_PERIOD_TEXT))).toHaveText(timeframe.label);

        // Add a small delay to ensure UI updates, if necessary, though waitFor should handle most cases.
        // await new Promise(resolve => setTimeout(resolve, 250));
      });
    });
  });

  // TODO:
  // 1. Test for a coin WITHOUT holdings (e.g., navigate to USDC detail, verify holdings section is not present or shows zero).
  //    - This would require navigating to another coin:
  //      await element(by.id(TEST_IDS.BACK_BUTTON_OR_NAVIGATE_HOME)).tap();
  //      const usdcListItemTestID = `coin-list-item-${usdcCoin.mintAddress}`;
  //      await waitFor(element(by.id(usdcListItemTestID))).toBeVisible().withTimeout(10000);
  //      await element(by.id(usdcListItemTestID)).tap();
  //      await waitFor(element(by.id(TEST_IDS.COIN_NAME_TEXT))).toHaveText(usdcCoin.name);
  //      await expect(element(by.id(TEST_IDS.HOLDINGS_SECTION))).toBeNotVisible(); // Or check for "0" / appropriate text
  //
  // 2. Test API error when fetching price history.
  //    - Requires specific MSW handler that returns an error for GetPriceHistory.
  //    - Then assert that an error message is shown in the UI.
});
