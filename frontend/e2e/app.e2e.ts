import { device, element, by, expect, waitFor } from 'detox';

describe('App End-to-End Tests', () => {
  // Test Scenario 1: App initialization with no existing wallet (shows wallet setup)
  describe('When no wallet exists', () => {
    beforeAll(async () => {
      await device.launchApp({delete: true}); // Ensure clean state
    });

    it('should show wallet setup screen with create and import options', async () => {
      // Check for elements on the welcome step of wallet setup
      await expect(element(by.text('Welcome to DankFolio'))).toBeVisible();
      await expect(element(by.text('Create a new wallet'))).toBeVisible(); // This text appears twice, Detox matches first by default.
      await expect(element(by.text('Import a recovery phrase'))).toBeVisible();
    });
  });

  // Test Scenario 2: Completing wallet setup by creating a new wallet
  describe('Wallet Creation Process', () => {
    beforeAll(async () => {
      await device.launchApp({delete: true}); // Start fresh for setup flow
    });

    it('should allow user to create a new wallet and navigate to the main app screen', async () => {
      // 1. On Welcome screen, tap "Create a new wallet"
      // Assuming the first "Create a new wallet" is the button for initiating creation.
      await element(by.text('Create a new wallet')).atIndex(0).tap();

      // 2. On Create screen, confirm "Create a new wallet"
      // This screen also has "Create a new wallet" text, but it's a different button/context.
      // Wait for the title of this specific step to ensure we are on the correct screen.
      await waitFor(element(by.text('Secure Your Wallet'))).toBeVisible().withTimeout(5000); // "Secure Your Wallet" is CREATE_WALLET_TITLE
      await element(by.text('Create a new wallet')).tap(); // This should now be the button on the "Create" step.

      // 3. On "Wallet Created" screen (shows keys), tap "I have saved my wallet information"
      // Wait for the "Wallet Created Successfully" title or similar element.
      await waitFor(element(by.text('Wallet Created Successfully'))).toBeVisible().withTimeout(15000); // WALLET_CREATED_TITLE, creation can take time.

      // Scroll to find the button if it's not immediately visible
      // This requires the button to be inside a ScrollView recognized by Detox
      // Note: This scroll action is a placeholder and might need a specific testID for the ScrollView.
      // If the button is generally visible, this try-catch might not be strictly necessary
      // or could be simplified if a direct tap works post-waitFor.
      try {
        // Attempt to scroll within a ScrollView with testID 'wallet-setup-scrollview' if it exists
        // Replace 'wallet-setup-scrollview' with the actual testID of the ScrollView if available.
        await waitFor(element(by.text('I have saved my wallet information'))).toBeVisible().whileElement(by.id('wallet-setup-scrollview')).scroll(100, 'down', NaN, 0.85);
      } catch (e) {
        // If scrolling fails or the element is already visible (or not in specified scrollview),
        // this catch block allows the test to proceed to tap the element.
        // Consider logging a warning if specific scroll behavior is expected but fails.
        console.log('Note: Scrolling to "I have saved my wallet information" was skipped or failed. Attempting to tap directly.');
      }
      await element(by.text('I have saved my wallet information')).tap();

      // 4. Verify navigation to the main app screen
      // Check for a known element on the main app screen, e.g., a tab bar or "Home" text.
      // The BottomNavigation.Bar has a "Home" label.
      await waitFor(element(by.label('Home'))).toBeVisible().withTimeout(5000);
      await expect(element(by.label('Explore'))).toBeVisible();
      await expect(element(by.label('Portfolio'))).toBeVisible();
    });
  });

  // TODO: Add tests for the "Import Wallet" flow.
  // TODO: Add tests for "Load Debug Wallet" if that's a desired E2E scenario.

  // Test Scenario 3: Using the Debug feature to load a wallet
  describe('Debug Wallet Load', () => {
    beforeAll(async () => {
      await device.launchApp({delete: true}); // Ensure clean state
    });

    it('should load a debug wallet and navigate to the main app screen', async () => {
      // 1. On Welcome screen, tap "Load Debug Wallet (TEST_PRIVATE_KEY)"
      // This element should only be visible in __DEV__ or specific envs.
      // The test will only pass if the app is built in such an env.
      await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
      await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();

      // 2. Verify navigation to the main app screen
      await waitFor(element(by.label('Home'))).toBeVisible().withTimeout(10000); // Increased timeout as wallet loading might take time
      await expect(element(by.label('Explore'))).toBeVisible();
      await expect(element(by.label('Portfolio'))).toBeVisible();

      // 3. Assert that data from mock APIs is visible
      // Assuming the "Home" screen or a default tab displays coin names or symbols from GetAvailableCoins or balances.
      // These texts come from our mockCoins data.
      await waitFor(element(by.text('Solana'))).toBeVisible().withTimeout(5000); // From mockCoins name
      await waitFor(element(by.text('USDC'))).toBeVisible().withTimeout(5000);   // From mockCoins symbol (or name if UI uses that)

      // Optionally, if balances are displayed directly with symbols:
      // await expect(element(by.text('10.5 SOL'))).toBeVisible(); // Check if UI formats it this way
      // await expect(element(by.text('500.75 USDC'))).toBeVisible();
      // These balance assertions are more specific and depend heavily on UI formatting.
      // Sticking to just coin names/symbols is safer for a general test.
    });
  });

  // Notes from previous analysis:
  // - Testing the "existing wallet" scenario reliably requires a method to programmatically
  //   pre-load a wallet into the app's storage or a debug feature.
  // - Testing "error during wallet retrieval" also requires simulating storage errors.
});
