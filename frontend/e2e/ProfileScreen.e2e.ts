import { device, element, by, expect, waitFor } from 'detox';
import { mockCoins } from './mocks/mockData'; // For token details if needed
import { MOCK_WALLET_ADDRESS } from './mocks/mockData'; // Assuming MOCK_WALLET_ADDRESS is exported

const TEST_IDS = {
  // ProfileScreen specific Test IDs
  PROFILE_SCREEN: 'profile-screen', // Root view
  WALLET_ADDRESS_TEXT: 'profile-wallet-address',
  YOUR_TOKENS_TITLE: 'profile-your-tokens-title',
  PORTFOLIO_VALUE_TEXT: 'profile-portfolio-value', // e.g., "$5,100.00"

  // Assuming CoinCards are used for tokens, reusing from HomeScreen for consistency
  COIN_CARD_PREFIX: 'coin-card-', // e.g., coin-card-SOL

  RECENT_TRANSACTIONS_TITLE: 'profile-recent-transactions-title',
  TRANSACTION_LIST: 'profile-transaction-list',
  TRANSACTION_ITEM_PREFIX: 'transaction-item-', // e.g., transaction-item-tx1
  TRANSACTION_ITEM_DESCRIPTION_PREFIX: 'transaction-item-description-', // For "Swap SOL for USDC"
  TRANSACTION_ITEM_STATUS_PREFIX: 'transaction-item-status-', // For "COMPLETED"

  TRANSACTIONS_LOADING_INDICATOR: 'profile-transactions-loading',
  TRANSACTIONS_EMPTY_TEXT: 'profile-transactions-empty-text', // "No Transactions Yet"
  TRANSACTIONS_ERROR_TEXT: 'profile-transactions-error-text', // "Error Loading Transactions"

  LOGOUT_BUTTON: 'profile-logout-button',
  NO_WALLET_CONNECTED_TEXT: 'profile-no-wallet-text',

  // Navigation related (assuming a bottom tab navigator)
  PROFILE_TAB_BUTTON: 'bottom-tab-profile', // Test ID for the Profile tab button
};

// Mocked transaction data that MSW's ListTrades handler should return for profile tests
// This helps in making assertions specific.
const mockProfileTransactions = [
  {
    id: 'tx1_profile', type: 'SWAP', fromCoinSymbol: 'SOL', toCoinSymbol: 'USDC',
    amount: "10", status: 'COMPLETED', date: new Date().toISOString(),
    transactionHash: 'hash_profile_1', fromCoinImageUrl: mockCoins[0].imageUrl, toCoinImageUrl: mockCoins[1].imageUrl,
    fromCoinDecimals: mockCoins[0].decimals, toCoinDecimals: mockCoins[1].decimals, amountTo: "1500.0"
  },
  {
    id: 'tx2_profile', type: 'TRANSFER', fromCoinSymbol: 'USDC', toCoinSymbol: '',
    amount: "100", status: 'PENDING', date: new Date().toISOString(),
    transactionHash: 'hash_profile_2', fromCoinImageUrl: mockCoins[1].imageUrl, toCoinImageUrl: '',
    fromCoinDecimals: mockCoins[1].decimals, toCoinDecimals: 0, amountTo: "100.0"
  },
];


describe('ProfileScreen', () => {
  const solanaToken = mockCoins[0]; // SOL
  const usdcToken = mockCoins[1];   // USDC

  // Helper to navigate to Profile tab
  async function navigateToProfileScreen() {
    await element(by.id(TEST_IDS.PROFILE_TAB_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.PROFILE_SCREEN))).toBeVisible().withTimeout(5000);
  }

  beforeAll(async () => {
    await device.launchApp({ delete: true });
    // Load debug wallet which has SOL and USDC balances and some transactions
    await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
    await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();

    // Navigate to Profile screen after app loads
    await navigateToProfileScreen();
  });

  it('should display wallet address, portfolio value, and list of tokens', async () => {
    // Check wallet address - using a regex for partial match of the known mock address
    // MOCK_WALLET_ADDRESS should be the full address used by the debug wallet.
    const addressRegex = new RegExp(`^${MOCK_WALLET_ADDRESS.substring(0, 6)}.*${MOCK_WALLET_ADDRESS.substring(MOCK_WALLET_ADDRESS.length - 6)}$`);
    await expect(element(by.id(TEST_IDS.WALLET_ADDRESS_TEXT))).toHaveText(addressRegex);

    // Check for "Your Tokens" title
    await expect(element(by.id(TEST_IDS.YOUR_TOKENS_TITLE))).toBeVisible();

    // Check for Solana token card (assuming CoinCard is used and has these testIDs)
    // Balances are from `GetWalletBalances` in `handlers.ts`: SOL: 10.5, USDC: 500.75
    // Prices from `mockCoins`: SOL: 150, USDC: 1
    // Value: SOL: 10.5 * 150 = 1575. USDC: 500.75 * 1 = 500.75. Total = 2075.75
    // This depends on how CoinCard formats its display based on props from ProfileScreen.
    // The ProfileScreen Jest test uses `mockProfileTokens` which might have different values/structure.
    // For E2E, we rely on what `usePortfolioStore` provides, which is fed by MSW's `GetWalletBalances` and `GetCoinPrices`.
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${solanaToken.symbol}`))).toBeVisible();
    await expect(element(by.id(`${TEST_IDS.COIN_CARD_PREFIX}${usdcToken.symbol}`))).toBeVisible();

    // Check portfolio value (e.g., "$2,075.75")
    // This requires the ProfileScreen to calculate and display this total.
    await expect(element(by.id(TEST_IDS.PORTFOLIO_VALUE_TEXT))).toHaveText('$2,075.75');
  });

  it('should display recent transactions', async () => {
    await expect(element(by.id(TEST_IDS.RECENT_TRANSACTIONS_TITLE))).toBeVisible();
    await expect(element(by.id(TEST_IDS.TRANSACTION_LIST))).toBeVisible();

    // Check for specific transactions based on mockProfileTransactions
    // This assumes the MSW handler for ListTrades is configured to return these.
    const tx1Id = `${TEST_IDS.TRANSACTION_ITEM_PREFIX}${mockProfileTransactions[0].id}`;
    const tx1DescId = `${TEST_IDS.TRANSACTION_ITEM_DESCRIPTION_PREFIX}${mockProfileTransactions[0].id}`;
    const tx1StatusId = `${TEST_IDS.TRANSACTION_ITEM_STATUS_PREFIX}${mockProfileTransactions[0].id}`;

    await waitFor(element(by.id(tx1Id))).toBeVisible().withTimeout(5000);
    // Example: "Swap SOL for USDC" - this text comes from how the app formats the transaction.
    await expect(element(by.id(tx1DescId))).toHaveText('Swap SOL for USDC');
    await expect(element(by.id(tx1StatusId))).toHaveText('COMPLETED');

    const tx2Id = `${TEST_IDS.TRANSACTION_ITEM_PREFIX}${mockProfileTransactions[1].id}`;
    // await expect(element(by.id(tx2Id))).toBeVisible(); // Check if it's scrolled into view
    // Further checks for tx2 if necessary.
  });

  // TODO: Test for transaction list loading state (requires MSW delay/control).
  // TODO: Test for transaction list empty state (requires MSW to return empty list for ListTrades).
  // TODO: Test for transaction list error state (requires MSW to return error for ListTrades).

  describe('Logout Functionality', () => {
    // This suite assumes a logout button with TEST_IDS.LOGOUT_BUTTON exists.
    // And after logout, navigating to Profile shows TEST_IDS.NO_WALLET_CONNECTED_TEXT.

    // Before running this, ensure MSW is set to provide default data for a logged-in user.
    // The `beforeAll` for the main describe block already sets up a logged-in state.

    it('should allow user to logout and then show no wallet state', async () => {
      // 1. Ensure we are on Profile screen and logged in (redundant due to beforeAll, but good practice)
      await waitFor(element(by.id(TEST_IDS.PROFILE_SCREEN))).toBeVisible().withTimeout(5000);
      await expect(element(by.id(TEST_IDS.WALLET_ADDRESS_TEXT))).toBeVisible();

      // 2. Tap logout button
      await element(by.id(TEST_IDS.LOGOUT_BUTTON)).tap();

      // 3. Post-logout behavior:
      //    - Option A: App navigates to a specific "logged out" or "wallet setup" screen.
      //    - Option B: App stays on Profile but shows a "no wallet" view.
      //    - We'll assume Option B for now, or that we need to navigate back to Profile.

      //    If logout navigates away, we might need to navigate back to Profile manually.
      //    Example: If it goes to a Welcome screen:
      //    await waitFor(element(by.text('Welcome to DankFolio'))).toBeVisible().withTimeout(5000);
      //    await navigateToProfileScreen(); // Try to go back to Profile

      // 4. Verify "No Wallet Connected" state on Profile screen
      //    This might require re-navigating to Profile if logout redirects.
      //    For simplicity, if logout just updates the state on Profile screen:
      await waitFor(element(by.id(TEST_IDS.NO_WALLET_CONNECTED_TEXT))).toBeVisible().withTimeout(5000);
      await expect(element(by.id(TEST_IDS.WALLET_ADDRESS_TEXT))).toBeNotVisible();
      await expect(element(by.id(TEST_IDS.YOUR_TOKENS_TITLE))).toBeNotVisible();

      // 5. Teardown for this test: Log back in for subsequent tests if needed,
      //    or ensure other test files handle their own login state.
      //    The simplest is that each test file starts fresh with `device.launchApp({delete: true})`.
      //    Our current structure in `beforeAll` does this, so the next test run will be fresh.
    });
  });
});
