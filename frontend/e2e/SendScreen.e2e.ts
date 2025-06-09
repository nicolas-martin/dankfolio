import { device, element, by, expect, waitFor } from 'detox';
import { mockCoins, MOCK_WALLET_ADDRESS } from './mocks/mockData';

const TEST_IDS = {
  // SendScreen specific Test IDs
  SEND_SCREEN: 'send-screen', // Root view
  RECIPIENT_ADDRESS_INPUT: 'send-recipient-address-input',
  SEND_BUTTON: 'send-button',
  MAX_BUTTON: 'send-max-button', // If a "Max" button exists for amount

  // TokenSelector component Test IDs (assuming these are implemented within TokenSelector)
  TOKEN_SELECTOR_BUTTON: 'token-selector-button', // Button to open token selection modal
  TOKEN_SELECTOR_AMOUNT_INPUT: 'token-selector-input-amount', // The actual amount input field
  TOKEN_SELECTOR_SELECTED_SYMBOL_TEXT: 'token-selector-selected-symbol', // Displays "SOL" or "USDC"

  // Token Selection Modal (if TokenSelector opens one)
  TOKEN_SELECTION_MODAL: 'token-selection-modal',
  TOKEN_LIST_ITEM_PREFIX: 'token-list-item-', // e.g., token-list-item-SOL

  // Confirmation Modal (shown after pressing send, before submitting to network)
  SEND_CONFIRMATION_MODAL: 'send-confirmation-modal',
  SEND_CONFIRMATION_MODAL_CONFIRM_BUTTON: 'send-confirmation-modal-confirm-button',
  SEND_CONFIRMATION_MODAL_CANCEL_BUTTON: 'send-confirmation-modal-cancel-button',
  // Test IDs for text elements within confirmation modal:
  SEND_CONFIRMATION_MODAL_AMOUNT_TEXT: 'send-confirmation-modal-amount-text',
  SEND_CONFIRMATION_MODAL_ADDRESS_TEXT: 'send-confirmation-modal-address-text',
  SEND_CONFIRMATION_MODAL_TOKEN_SYMBOL_TEXT: 'send-confirmation-modal-token-symbol-text',


  // Status Modal (shows pending, success, failure after submission)
  TRANSACTION_STATUS_MODAL: 'transaction-status-modal', // Generic name, might be more specific
  TRANSACTION_STATUS_MODAL_CLOSE_BUTTON: 'transaction-status-modal-close-button',
  TRANSACTION_STATUS_MODAL_STATUS_TEXT: 'transaction-status-modal-status-text', // To check for "Completed", "Pending", "Failed"

  // Assuming a common Toast component is used
  TOAST_TEXT: 'toast-text', // Test ID for the toast message text container

  // Navigation elements (e.g., if SendScreen is launched from HomeScreen)
  HOME_SCREEN: 'home-screen', // To verify we land back after sending
  // A button on HomeScreen or CoinDetailScreen that navigates to SendScreen
  NAVIGATE_TO_SEND_BUTTON_FOR_SOL: 'navigate-to-send-sol-button', // Example
};

// Recipient address for testing (can be any valid-looking address for mock tests)
const MOCK_RECIPIENT_ADDRESS = 'RecipientPublicKeyHerexxxxxxxxxxxxxxxxxxx';

describe('SendScreen', () => {
  const solToken = mockCoins[0]; // SOL

  beforeAll(async () => {
    await device.launchApp({ delete: true });
    await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
    await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();
    await waitFor(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible().withTimeout(10000);

    // Navigate to SendScreen. This step is crucial and depends on app's navigation flow.
    // Assuming there's a button on HomeScreen to initiate a send for SOL (most common token)
    // If SendScreen is a tab, or reached via a generic "Send" button then selecting coin on SendScreen:
    // await element(by.id(TEST_IDS.SOME_GENERIC_SEND_BUTTON_OR_TAB)).tap();
    // For this example, let's assume a direct navigation to send SOL from somewhere.
    // This might need to be adapted if SendScreen is reached differently, e.g., from CoinDetail.
    // For now, we'll simulate a hypothetical direct "Send SOL" button.
    // This part needs to be adjusted based on actual app flow to reach SendScreen.
    // As a placeholder, let's assume we need to tap a "Send" button for SOL on its card or detail.
    // This is a common pattern but needs real testIDs.
    // For now, we'll assume SendScreen is directly accessible or this part is handled by specific test setup.
    // If SendScreen is opened with a pre-selected token (e.g. SOL)
    // await element(by.id(TEST_IDS.NAVIGATE_TO_SEND_BUTTON_FOR_SOL)).tap();
    // await waitFor(element(by.id(TEST_IDS.SEND_SCREEN))).toBeVisible().withTimeout(5000);
    // await expect(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_TEXT))).toHaveText(solToken.symbol);

    // If SendScreen starts without a token and user must select:
    // (Tap a generic send button/tab first)
    // await element(by.id(TEST_IDS.TOKEN_SELECTOR_BUTTON)).tap();
    // await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTION_MODAL))).toBeVisible().withTimeout(3000);
    // await element(by.id(`${TEST_IDS.TOKEN_LIST_ITEM_PREFIX}${solToken.symbol}`)).tap();
    // await expect(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_TEXT))).toHaveText(solToken.symbol);

    // Given the Jest test structure, SendScreen seems to be a standalone screen,
    // possibly reached via navigation with parameters or with a default/first token selected.
    // For E2E, we need a concrete way to get to it. Let's assume a general Send button/tab,
    // then selecting SOL.
    // This setup is crucial and WILL LIKELY NEED ADJUSTMENT.
    // For now, we'll proceed as if SOL is selected by default or easily selectable.
    // This part of beforeAll might need to be moved into individual tests if selection varies.
    // For example, if SendScreen is always fresh or if state from previous interactions within beforeAll is not desired.
  });

  // Helper function to ensure navigation to SendScreen and selection of SOL
  async function navigateToSendScreenWithSOLSelected() {
    // Assumption: 'Send' is a main tab, accessible by.label like 'Home', 'Portfolio'
    // Or it has a specific, stable testID.
    // Using by.label('Send') as a placeholder, based on app.e2e.ts patterns for main tabs.
    // If 'Send' is not a main tab, this logic needs to find the actual entry point.
    try {
      // Try matching by accessibility label first (more robust)
      await element(by.label('Send')).tap();
    } catch (e) {
      // Fallback: Try matching by text. This is less ideal as text can change or not be unique.
      console.log("navigateToSendScreenWithSOLSelected: Could not find element by label 'Send'. Attempting by text 'Send'.");
      try {
        await element(by.text('Send')).atIndex(0).tap(); // Use atIndex(0) if text 'Send' might appear multiple times
      } catch (e2) {
        console.error("navigateToSendScreenWithSOLSelected: Failed to navigate to Send screen by label or text. Check Test IDs and app navigation structure.");
        throw e2; // Re-throw error if navigation fails, test cannot proceed.
      }
    }

    await waitFor(element(by.id(TEST_IDS.SEND_SCREEN))).toBeVisible().withTimeout(5000);

    // Select SOL token. This assumes SendScreen doesn't default to SOL or needs explicit selection.
    await element(by.id(TEST_IDS.TOKEN_SELECTOR_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTION_MODAL))).toBeVisible().withTimeout(3000);
    await element(by.id(`${TEST_IDS.TOKEN_LIST_ITEM_PREFIX}${solToken.symbol}`)).tap(); // Tap SOL
    // Wait for the selected symbol to update in the UI to confirm selection.
    await waitFor(element(by.id(TEST_IDS.TOKEN_SELECTOR_SELECTED_SYMBOL_TEXT))).toHaveText(solToken.symbol).withTimeout(3000);
  }

  beforeEach(async () => {
    // This block runs before each 'it' test case.
    // If tests are truly independent, you might reload React Native or re-launch app.
    // await device.reloadReactNative();
    // For now, we'll rely on `navigateToSendScreenWithSOLSelected` to set up the screen correctly
    // at the beginning of tests that require it.
    // If a test navigates away and doesn't return, this could be a place to navigate back to a neutral screen.
    // e.g., await element(by.label('Home')).tap();
    // await waitFor(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible().withTimeout(5000);
  });

  it('should successfully send a token (happy path)', async () => {
    await navigateToSendScreenWithSOLSelected();

    const amountToSend = '0.1';
    // 1. Input recipient address
    await element(by.id(TEST_IDS.RECIPIENT_ADDRESS_INPUT)).replaceText(MOCK_RECIPIENT_ADDRESS);

    // 2. Input amount
    await element(by.id(TEST_IDS.TOKEN_SELECTOR_AMOUNT_INPUT)).replaceText(amountToSend);

    // 3. Tap Send button
    await element(by.id(TEST_IDS.SEND_BUTTON)).tap();

    // 4. Confirmation Modal appears
    await waitFor(element(by.id(TEST_IDS.SEND_CONFIRMATION_MODAL))).toBeVisible().withTimeout(3000);
    // Assert details on confirmation modal (optional but good)
    await expect(element(by.id(TEST_IDS.SEND_CONFIRMATION_MODAL_AMOUNT_TEXT))).toHaveText(amountToSend);
    await expect(element(by.id(TEST_IDS.SEND_CONFIRMATION_MODAL_TOKEN_SYMBOL_TEXT))).toHaveText(solToken.symbol);
    await expect(element(by.id(TEST_IDS.SEND_CONFIRMATION_MODAL_ADDRESS_TEXT))).toHaveText(MOCK_RECIPIENT_ADDRESS);

    // 5. Tap Confirm on Confirmation Modal
    // MSW: PrepareTransfer and SubmitTransfer should be called by the app now.
    // Ensure handlers return success.
    await element(by.id(TEST_IDS.SEND_CONFIRMATION_MODAL_CONFIRM_BUTTON)).tap();

    // 6. Status Modal appears (first showing pending, then success)
    await waitFor(element(by.id(TEST_IDS.TRANSACTION_STATUS_MODAL))).toBeVisible().withTimeout(10000); // Increased timeout for potential polling

    // MSW: GetTrade (or similar for tx status) should be called.
    // Handler should eventually return "COMPLETED" / "FINALIZED".
    await waitFor(element(by.text('Completed'))).toBeVisible().withTimeout(10000); // Or "Finalized" or "Successful"

    // 7. Close Status Modal
    await element(by.id(TEST_IDS.TRANSACTION_STATUS_MODAL_CLOSE_BUTTON)).tap();

    // 8. Assert navigation (e.g., back to HomeScreen or previous screen)
    await waitFor(element(by.id(TEST_IDS.HOME_SCREEN))).toBeVisible().withTimeout(5000); // Assuming it navigates back to Home

    // 9. Assert Toast message for success (optional, if implemented)
    // await expect(element(by.id(TEST_IDS.TOAST_TEXT))).toHaveText('Transaction successful!'); // Or similar
  });

  // TODO: Test for insufficient balance (requires usePortfolioStore mock or MSW to show low balance for SOL).
  // The UI should ideally disable the Send button or show an error message.

  // TODO: Test for invalid recipient address.
  // UI should show a validation error.

  // TODO: Test when PrepareTransfer MSW handler returns an error.
  // App should show an error toast or message.

  // TODO: Test when SubmitTransfer MSW handler returns an error.
  // App should show an error toast or message.

  // TODO: Test when transaction polling results in a FAILED status.
  // Status modal should show failure, closing it should not trigger balance refresh.
});
