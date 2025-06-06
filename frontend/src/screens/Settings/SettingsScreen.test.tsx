import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SettingsScreen from './index';
import { ThemeProvider } from 'react-native-paper';
import { themes } from '@/utils/theme'; // Corrected import
import { useThemeStore } from '@/store/theme';
import { usePortfolioStore } from '@/store/portfolio';
import { ToastProvider, useToast } from '@components/Common/Toast';

// Mock dependencies
jest.mock('@/store/theme');
jest.mock('@/store/portfolio');
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
  },
  // Mock other properties if your component uses them, e.g., manifest, platform, etc.
  manifest: {
    version: '1.0.0', // some components might look for manifest.version
  },
  getWebViewUserAgentAsync: jest.fn(() => Promise.resolve('mockUserAgent')), // if used
}));
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)), // Ensure it returns a promise
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    breadcrumb: jest.fn(),
  },
}));

// Mock profile_scripts and useToast
jest.mock('@/screens/Profile/profile_scripts', () => ({
  formatAddress: jest.fn((address) => `${address.slice(0, 16)}...`), // Simplified mock for testing
  copyToClipboard: jest.fn(), // Will be further refined in tests or beforeEach
}));

jest.mock('@components/Common/Toast', () => ({
  ...jest.requireActual('@components/Common/Toast'), // Import actual for ToastProvider
  useToast: jest.fn(),
}));


const mockUseThemeStore = useThemeStore as jest.MockedFunction<typeof useThemeStore>;
const mockUsePortfolioStore = usePortfolioStore as jest.MockedFunction<typeof usePortfolioStore>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockCopyToClipboard = require('@/screens/Profile/profile_scripts').copyToClipboard;


describe('SettingsScreen', () => {
  const mockToggleTheme = jest.fn();
  const mockShowToast = jest.fn();

  const renderWithProviders = (ui: React.ReactElement, currentThemeType: 'neon' | 'light' = 'neon') => {
    const currentTheme = currentThemeType === 'neon' ? themes.neon : themes.light;
    return render(
      <ThemeProvider theme={currentTheme}>
        <ToastProvider>
          {ui}
        </ToastProvider>
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeStore.mockReturnValue({
      themeType: 'neon',
      toggleTheme: mockToggleTheme,
      isLoading: false,
      setTheme: jest.fn(), // Added missing mock from interface
      initializeTheme: jest.fn(), // Added missing mock from interface
    });
    mockUsePortfolioStore.mockReturnValue({
      wallet: { address: 'testPublicKeyAddress123', balance: 0, privateKey: 'mockPrivateKey' },
      tokens: [],
      fetchPortfolioBalance: jest.fn(),
      isLoading: false,
      // Add other properties from the store if your component uses them
      // e.g., error: null, lastUpdated: undefined, etc.
    });
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      hideToast: jest.fn(), // Added missing mock from interface
    });
    // Reset mockCopyToClipboard to a version that calls the mocked showToast
    mockCopyToClipboard.mockImplementation((text: string, label: string, showToastFn: typeof mockShowToast) => {
      showToastFn({ message: `${label} copied!`, type: 'success', duration: 2000 });
    });
  });

  it('renders all sections and information correctly for Neon theme', () => {
    const { getByText, getByRole } = renderWithProviders(<SettingsScreen />);

    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Account Information')).toBeTruthy();
    expect(getByText('Public Key')).toBeTruthy();
    // Updated based on the mocked formatAddress
    expect(getByText('testPublicKeyAdd...')).toBeTruthy();
    expect(getByText('Private Key')).toBeTruthy();
    expect(getByText(/Warning: Your private key is highly sensitive/)).toBeTruthy();
    expect(getByText('App Information')).toBeTruthy();
    expect(getByText('App Version')).toBeTruthy();
    expect(getByText('1.0.0')).toBeTruthy(); // From mocked Constants
    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('Theme')).toBeTruthy();
    expect(getByText('Neon Glow')).toBeTruthy(); // Description for 'neon' theme
    const switchControl = getByRole('switch');
    expect(switchControl).toBeTruthy();
    expect(switchControl.props.value).toBe(true); // isDarkTheme is true for 'neon'
  });

  it('renders correct theme description and switch state for Light theme', () => {
    mockUseThemeStore.mockReturnValue({
      themeType: 'light',
      toggleTheme: mockToggleTheme,
      isLoading: false,
      setTheme: jest.fn(),
      initializeTheme: jest.fn(),
    });
    const { getByText, getByRole } = renderWithProviders(<SettingsScreen />, 'light');
    expect(getByText('Daylight Mode')).toBeTruthy(); // Description for 'light' theme
    const switchControl = getByRole('switch');
    expect(switchControl).toBeTruthy();
    expect(switchControl.props.value).toBe(false); // isDarkTheme is false for 'light'
  });

  it('calls toggleTheme when the theme switch is pressed', () => {
    const { getByRole } = renderWithProviders(<SettingsScreen />);
    const switchControl = getByRole('switch');

    // Initial state is 'neon' (dark), so switch is true. Toggling means setting it to false.
    fireEvent(switchControl, 'valueChange', false);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('copies public key to clipboard when copy icon is pressed and shows toast', async () => {
    const { getByTestId } = renderWithProviders(<SettingsScreen />);

    const copyButton = getByTestId('copy-public-key-button');

    await act(async () => {
      fireEvent.press(copyButton);
    });

    // Check that the original copyToClipboard from profile_scripts was called correctly
    expect(mockCopyToClipboard).toHaveBeenCalledWith('testPublicKeyAddress123', 'Public Key', mockShowToast);

    // And assert that showToast was called by the mockImplementation of copyToClipboard
    expect(mockShowToast).toHaveBeenCalledWith({
      message: 'Public Key copied!',
      type: 'success',
      duration: 2000,
    });
  });

  it('displays N/A for public key if wallet is not available', () => {
    mockUsePortfolioStore.mockReturnValue({
      wallet: null, // No wallet
      tokens: [],
      fetchPortfolioBalance: jest.fn(),
      isLoading: false,
    });
    const { getAllByText } = renderWithProviders(<SettingsScreen />);
    // There might be multiple N/A texts if other fields also become N/A
    // For Public Key description, it should be N/A
    expect(getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
  });

  it('uses Constants.expoConfig.version for app version', () => {
    const { getByText } = renderWithProviders(<SettingsScreen />);
    expect(getByText('1.0.0')).toBeTruthy();
  });

  // Test for private key placeholder
  it('displays the private key placeholder', () => {
    const { getByText } = renderWithProviders(<SettingsScreen />);
    expect(getByText('••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••')).toBeTruthy();
  });
});
