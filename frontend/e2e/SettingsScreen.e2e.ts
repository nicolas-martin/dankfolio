import { device, element, by, expect, waitFor } from 'detox';
import { MOCK_WALLET_ADDRESS } from './mocks/mockData'; // Assuming MOCK_WALLET_ADDRESS is exported

const TEST_IDS = {
  // SettingsScreen specific Test IDs
  SETTINGS_SCREEN: 'settings-screen', // Root view
  PUBLIC_KEY_TEXT: 'settings-public-key-text', // Text element displaying the public key or "N/A"
  COPY_PUBLIC_KEY_BUTTON: 'settings-copy-public-key-button',
  PRIVATE_KEY_PLACEHOLDER_TEXT: 'settings-private-key-placeholder', // Text element showing "••••..." or "N/A"
  SHOW_PRIVATE_KEY_BUTTON: 'settings-show-private-key-button', // If there's a button to reveal it
  APP_VERSION_TEXT: 'settings-app-version-text', // Text element for "1.0.0"

  THEME_SWITCH: 'settings-theme-switch',
  THEME_DESCRIPTION_TEXT: 'settings-theme-description-text', // Displays "Neon Glow" or "Daylight Mode"

  LOGOUT_BUTTON: 'profile-logout-button', // Reusing from ProfileScreen if logout is there
  PROFILE_TAB_BUTTON: 'bottom-tab-profile', // To navigate to Profile first, then Settings
  SETTINGS_NAV_BUTTON: 'profile-navigate-to-settings-button', // Button on Profile screen to go to Settings

  // Common
  TOAST_TEXT: 'toast-text',
};

// Expected text values
const TEXT_NEON_GLOW = 'Neon Glow';
const TEXT_DAYLIGHT_MODE = 'Daylight Mode';
const TEXT_PUBLIC_KEY_NA = 'N/A'; // Or however it's displayed when no wallet

// Formatted mock address (first 16 chars...)
const FORMATTED_MOCK_ADDRESS = `${MOCK_WALLET_ADDRESS.substring(0, 16)}...`;

describe('SettingsScreen', () => {

  async function navigateToSettingsScreen() {
    // Assumes Settings is reached via Profile tab -> a button on Profile screen
    await element(by.id(TEST_IDS.PROFILE_TAB_BUTTON)).tap();
    await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(3000); // Assuming profile-screen is testID for Profile root
    await element(by.id(TEST_IDS.SETTINGS_NAV_BUTTON)).tap();
    await waitFor(element(by.id(TEST_IDS.SETTINGS_SCREEN))).toBeVisible().withTimeout(3000);
  }

  beforeAll(async () => {
    await device.launchApp({ delete: true });
    await waitFor(element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)'))).toBeVisible().withTimeout(5000);
    await element(by.text('Load Debug Wallet (TEST_PRIVATE_KEY)')).tap();
    // Initial navigation to settings screen
    await navigateToSettingsScreen();
  });

  beforeEach(async () => {
    // Ensure we are on the Settings screen before each test in this describe block
    // This handles cases where a previous test might have navigated away (e.g. after logout)
    // For the first test, beforeAll already navigates. For subsequent, this ensures state.
    // However, if a test logs out, we need to re-login and navigate for subsequent tests
    // This simple re-navigation might not be enough if logout changes fundamental state.
    // A more robust solution would be `device.reloadReactNative()` and full re-navigation in each test,
    // or careful state management between tests.
    // For now, let's assume tests either reset state or this simple re-navigation is enough.
    // await navigateToSettingsScreen(); // This might be too simplistic if state (like login) changes.
    // Let's ensure each test group handles its own state or starts fresh if needed.
  });

  describe('Default State and Theme Switching', () => {
    beforeAll(async () => {
      // Ensure logged in and on settings screen for this group
      // If app was reloaded or state changed, need to re-login and navigate
      // This is tricky with Detox's `beforeAll` for nested describes if outer `beforeAll` already ran.
      // For now, assume outer beforeAll has set the state.
      // If issues, each test or describe block needs to launchApp or ensure login.
      // Let's ensure we are on the settings screen at the start of this "describe"
      await navigateToSettingsScreen();
    });

    it('should display default settings information correctly (Neon theme)', async () => {
      await expect(element(by.text('Account Information'))).toBeVisible();
      await expect(element(by.id(TEST_IDS.PUBLIC_KEY_TEXT))).toHaveText(FORMATTED_MOCK_ADDRESS);
      await expect(element(by.id(TEST_IDS.PRIVATE_KEY_PLACEHOLDER_TEXT))).toBeVisible(); // Checks for "••••..."

      await expect(element(by.text('App Information'))).toBeVisible();
      await expect(element(by.id(TEST_IDS.APP_VERSION_TEXT))).toHaveText('1.0.0'); // Assuming version is 1.0.0

      await expect(element(by.text('Appearance'))).toBeVisible();
      await expect(element(by.id(TEST_IDS.THEME_DESCRIPTION_TEXT))).toHaveText(TEXT_NEON_GLOW);
      // Check switch state (true for Neon/Dark theme) - this depends on how the switch value is exposed
      // await expect(element(by.id(TEST_IDS.THEME_SWITCH))).toHaveValue('true'); // Or specific matcher for switch state
    });

    it('should toggle theme to Daylight and back to Neon', async () => {
      // Initial: Neon
      await expect(element(by.id(TEST_IDS.THEME_DESCRIPTION_TEXT))).toHaveText(TEXT_NEON_GLOW);
      // await expect(element(by.id(TEST_IDS.THEME_SWITCH))).toHaveValue('true');

      // Tap to toggle to Daylight
      await element(by.id(TEST_IDS.THEME_SWITCH)).tap();
      await expect(element(by.id(TEST_IDS.THEME_DESCRIPTION_TEXT))).toHaveText(TEXT_DAYLIGHT_MODE);
      // await expect(element(by.id(TEST_IDS.THEME_SWITCH))).toHaveValue('false');

      // Tap to toggle back to Neon
      await element(by.id(TEST_IDS.THEME_SWITCH)).tap();
      await expect(element(by.id(TEST_IDS.THEME_DESCRIPTION_TEXT))).toHaveText(TEXT_NEON_GLOW);
      // await expect(element(by.id(TEST_IDS.THEME_SWITCH))).toHaveValue('true');
    });

    it('should copy public key and show toast', async () => {
      await element(by.id(TEST_IDS.COPY_PUBLIC_KEY_BUTTON)).tap();
      // Check for toast message
      await waitFor(element(by.id(TEST_IDS.TOAST_TEXT))).toHaveText('Public Key copied!').withTimeout(3000);
      // Toast should disappear (how to check this depends on Toast implementation)
      // await waitFor(element(by.id(TEST_IDS.TOAST_TEXT))).toBeNotVisible().withTimeout(5000); // Or it auto-hides
    });
  });

  describe('No Wallet State', () => {
    beforeAll(async () => {
      // This group needs to ensure a "no wallet" state.
      // Perform logout. This assumes logout button is on Profile or Settings screen.
      // If ProfileScreen.e2e.ts logout test works, it implies TEST_IDS.LOGOUT_BUTTON is on Profile.
      await element(by.id(TEST_IDS.PROFILE_TAB_BUTTON)).tap(); // Go to Profile
      await waitFor(element(by.id('profile-screen'))).toBeVisible().withTimeout(3000);

      // Check if logout button exists before tapping
      try {
        await expect(element(by.id(TEST_IDS.LOGOUT_BUTTON))).toBeVisible(); // Check first
        await element(by.id(TEST_IDS.LOGOUT_BUTTON)).tap();
        // After logout, app might navigate away. We need to go back to Settings.
      } catch (error) {
        console.warn("Logout button not found or failed to tap. Skipping 'No Wallet State' tests for SettingsScreen or this part needs adjustment.");
        // Mark this describe block as skipped or handle error if logout is essential for these tests.
        // For now, we'll let it proceed, and tests might fail if logout didn't happen.
      }

      await navigateToSettingsScreen(); // Re-navigate to Settings after logout
    });

    it('should display N/A for public key when no wallet is connected', async () => {
      // This test runs after the beforeAll of this describe block (logout)
      await expect(element(by.id(TEST_IDS.PUBLIC_KEY_TEXT))).toHaveText(TEXT_PUBLIC_KEY_NA);
      // Optionally, check that private key placeholder also shows N/A or section is hidden
      // await expect(element(by.id(TEST_IDS.PRIVATE_KEY_PLACEHOLDER_TEXT))).toHaveText(TEXT_PUBLIC_KEY_NA);
    });

    // Add a way to "log back in" for subsequent test files or other describe blocks if needed.
    // This is usually handled by device.launchApp({delete: true}) in the very beginning of other test files.
  });

  // TODO: Test navigation to Privacy Policy, Terms of Service if those items exist.
  // TODO: Test revealing private key if that functionality exists and is testable.
});
