import { device, element, by, expect, waitFor } from 'detox';
import { mockCoins, MOCK_WALLET_ADDRESS } from './mocks/mockData'; // SOL is mockCoins[0], USDC is mockCoins[1]

const TEST_IDS = {
  // TradeScreen specific Test IDs
  TRADE_SCREEN: 'trade-screen', // Root view

  // TokenSelectors (assuming one for "From" and one for "To")
  FROM_TOKEN_SELECTOR_BUTTON: 'from-token-selector-button',
  TO_TOKEN_SELECTOR_BUTTON: 'to-token-selector-button',
  TOKEN_SELECTOR_AMOUNT_INPUT_FROM: 'token-selector-input-from', // Input for "From" token
  TOKEN_SELECTOR_AMOUNT_INPUT_TO: 'token-selector-input-to',     // Input for "To" token
  TOKEN_SELECTOR_SELECTED_SYMBOL_FROM: 'token-selector-selected-symbol-from', // Displays symbol for "From"
  TOKEN_SELECTOR_SELECTED_SYMBOL_TO: 'token-selector-selected-symbol-to',     // Displays symbol for "To"

  SWAP_COINS_BUTTON: 'swap-coins-button', // Button to swap from/to tokens

  // Token Selection Modal (reused for both From and To selectors)
  TOKEN_SELECTION_MODAL: 'token-selection-modal',
  TOKEN_LIST_ITEM_PREFIX: 'token-list-item-', // e.g., token-list-item-SOL

  // Trade Details section (displays quote info)
  TRADE_DETAILS_SECTION: 'trade-details-section',
  TRADE_DETAILS_EXCHANGE_RATE: 'trade-details-exchange-rate',
  TRADE_DETAILS_NETWORK_FEE: 'trade-details-network-fee',
  TRADE_DETAILS_PRICE_IMPACT: 'trade-details-price-impact',

  REVIEW_TRADE_BUTTON: 'review-trade-button', // Main CTA to open confirmation

  // Trade Confirmation Modal
  TRADE_CONFIRMATION_MODAL: 'trade-confirmation-modal',
  TRADE_CONFIRMATION_MODAL_FROM_AMOUNT: 'trade-confirmation-modal-from-amount',
  TRADE_CONFIRMATION_MODAL_TO_AMOUNT: 'trade-confirmation-modal-to-amount',
  TRADE_CONFIRMATION_MODAL_NETWORK_FEE: 'trade-confirmation-modal-network-fee',
  TRADE_CONFIRMATION_MODAL_CONFIRM_BUTTON: 'trade-confirmation-modal-confirm-button',
  TRADE_CONFIRMATION_MODAL_CANCEL_BUTTON: 'trade-confirmation-modal-cancel-button',

  // Trade Status Modal
  TRADE_STATUS_MODAL: 'trade-status-modal',
  TRADE_STATUS_MODAL_STATUS_TEXT: 'trade-status-modal-status-text', // Shows "Processing", "Completed", "Failed"
  TRADE_STATUS_MODAL_TX_HASH_TEXT: 'trade-status-modal-tx-hash-text',
  TRADE_STATUS_MODAL_CLOSE_BUTTON: 'trade-status-modal-close-button',

  // Common
  TOAST_TEXT: 'toast-text',
  HOME_SCREEN: 'home-screen', // For verifying navigation back
  // Navigation
  TRADE_TAB_BUTTON: 'bottom-tab-trade', // If Trade is a main tab
};

describe('TradeScreen E2E Tests', () => {
  const solCoin = mockCoins[0]; // SOL
  const usdcCoin = mockCoins[1]; // USDC
  const fromAmount = '1'; // Amount of SOL to trade

  // Helper to navigate to TradeScreen and select initial tokens
  async function navigateAndSetupTradeScreen(initialFromCoin = solCoin, initialToCoin = usdcCoin) {
    // Assuming TradeScreen is a main tab. Adjust if reached differently.
    await element(by.id(TEST_IDS.TRADE_TAB_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.TRADE_SCREEN))).toBeVisible().withTimeout(5000);

    // Select "From" token
    await element(by.id(TEST_IDS.FROM_TOKEN_SELECTOR_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTION_MODAL))).toBeVisible().withTimeout(3000);
    await element(by.id(`${TEST_IDS.TOKEN_LIST_ITEM_PREFIX}${initialFromCoin.symbol}`)).tap();
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_FROM))).toHaveText(initialFromCoin.symbol).withTimeout(3000);

    // Select "To" token
    await element(by.id(TEST_IDS.TO_TOKEN_SELECTOR_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTION_MODAL))).toBeVisible().withTimeout(3000);
    await element(by.id(`${TEST_IDS.TOKEN_LIST_ITEM_PREFIX}${initialToCoin.symbol}`)).tap();
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_TO))).toHaveText(initialToCoin.symbol).withTimeout(3000);
  }

  beforeAll(async () => {
    await device.launchApp({ delete: true });
    await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
    await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();
    // Initial navigation to Trade screen with default tokens (SOL -> USDC)
    await navigateAndSetupTradeScreen();
  });

  beforeEach(async () => {
    // This ensures that for each test, we start from a known state on the TradeScreen.
    // If a test modifies token selections or input amounts, this will reset it.
    // This is preferred over device.reloadReactNative() to maintain the logged-in state.
    await navigateAndSetupTradeScreen();
  });

  it('should perform a successful trade (SOL to USDC)', async () => {
    // 1. Enter "From" amount - MSW GetSwapQuote should be triggered by the app
    await element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT_FROM)).replaceText(fromAmount);

    // 2. Verify quote details are displayed (e.g., "To" amount updates, fees shown)
    //    MSW GetSwapQuote returns: estimatedAmountOut: '150.5', exchangeRate: '15.05', fee: '0.1'
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT_TO))).toHaveText('150.5').withTimeout(5000); // Wait for quote
    await expect(element(by.id(TEST_IDS.TRADE_DETAILS_EXCHANGE_RATE))).toHaveText('1 SOL ≈ 15.05 USDC'); // Example format
    await expect(element(by.id(TEST_IDS.TRADE_DETAILS_NETWORK_FEE))).toHaveText('0.1 SOL'); // Example format, fee token might vary
    // await expect(element(by.id(TEST_IDS.TRADE_DETAILS_PRICE_IMPACT))).toHaveText('0.01%');

    // 3. Tap "Review Trade" button
    await element(by.id(TEST_IDS.REVIEW_TRADE_BUTTON)).tap();

    // 4. Verify Confirmation Modal content
    await waitFor(element(by.id(TEST_IDS.TRADE_CONFIRMATION_MODAL))).toBeVisible().withTimeout(3000);
    await expect(element(by.id(TEST_IDS.TRADE_CONFIRMATION_MODAL_FROM_AMOUNT))).toHaveText(`${fromAmount} ${solCoin.symbol}`);
    await expect(element(by.id(TEST_IDS.TRADE_CONFIRMATION_MODAL_TO_AMOUNT))).toHaveText(`150.5 ${usdcCoin.symbol}`); // From quote
    // await expect(element(by.id(TEST_IDS.TRADE_CONFIRMATION_MODAL_NETWORK_FEE))).toHaveText('0.1 SOL'); // From quote

    // 5. Tap "Confirm Trade" button
    // MSW: PrepareSwap and SubmitSwap should be called by the app.
    await element(by.id(TEST_IDS.TRADE_CONFIRMATION_MODAL_CONFIRM_BUTTON)).tap();

    // 6. Verify Status Modal appears and shows "Processing", then "Completed"
    await waitFor(element(by.id(TEST_IDS.TRADE_STATUS_MODAL))).toBeVisible().withTimeout(3000);
    // Initial status might be "Processing" or similar.
    // await expect(element(by.id(TEST_IDS.TRADE_STATUS_MODAL_STATUS_TEXT))).toHaveText('Processing');

    // MSW: GetTrade (for status) should be called. Mock returns "COMPLETED".
    await waitFor(element(by.id(TEST_IDS.TRADE_STATUS_MODAL_STATUS_TEXT))).toHaveText('Completed').withTimeout(10000);
    await expect(element(by.id(TEST_IDS.TRADE_STATUS_MODAL_TX_HASH_TEXT))).toHaveText('fixed_mock_tx_hash_gettrade_1234567890');

    // 7. Close Status Modal
    await element(by.id(TEST_IDS.TRADE_STATUS_MODAL_CLOSE_BUTTON)).tap();

    // 8. Verify navigation (e.g., back to HomeScreen or Portfolio)
    await waitFor(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible().withTimeout(5000); // Assuming it navigates to Home

    // 9. Verify Success Toast (if any)
    // await waitFor(element(by.id(TEST_IDS.TOAST_TEXT))).toHaveText('Trade successful!').withTimeout(3000);
  });

  it('should handle coin swapping correctly', async () => {
    // Initial: SOL -> USDC, From amount = 1, To amount should be ~150.5 (from mock quote)
    await element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT_FROM)).replaceText(fromAmount);
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT_TO))).toHaveText('150.5').withTimeout(5000);

    // Tap swap button
    await element(by.id(TEST_IDS.SWAP_COINS_BUTTON)).tap();

    // Verify tokens are swapped: USDC -> SOL
    await expect(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_FROM))).toHaveText(usdcCoin.symbol);
    await expect(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_TO))).toHaveText(solCoin.symbol);

    // Verify amounts are swapped and a new quote is fetched for USDC -> SOL
    // The old "To" amount (150.5 USDC) becomes the new "From" amount.
    await expect(element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT_FROM))).toHaveText('150.5');
    // A new quote for 150.5 USDC to SOL will be fetched. MSW GetSwapQuote will return its fixed values again.
    // This might not be realistic if the quote API was smart, but our mock is simple.
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT_TO))).toHaveText('150.5').withTimeout(5000);
  });

  // TODO: Test for insufficient balance. (Requires MSW GetWalletBalances to provide a low SOL balance)
  // TODO: Test for quote fetching error (MSW GetSwapQuote returns error).
  // TODO: Test for PrepareSwap error (MSW PrepareSwap returns error).
  // TODO: Test for SubmitSwap error (MSW SubmitSwap returns error).
  // TODO: Test for transaction failing during polling (MSW GetTrade returns FAILED status).
});
