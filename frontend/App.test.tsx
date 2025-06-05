import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import App from './App'; // Assuming App.tsx is in the same directory or correctly pathed
import { usePortfolioStore } from '@store/portfolio';
import { useTransactionsStore } from '@store/transactions';
import { retrieveWalletFromStorage } from '@screens/WalletSetup/scripts';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { initializeFirebaseServices } from '@/services/firebaseInit';
import { Keypair } from '@solana/web3.js';
import { logger } from '@/utils/logger';

// --- Mocks ---
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
  setOptions: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (component: any) => component, // Pass through component for Sentry.wrap
  setUser: jest.fn(),
  setContext: jest.fn(),
  withScope: jest.fn(callback => callback({})), // Call the callback with a dummy scope
  mobileReplayIntegration: jest.fn(),
}));

jest.mock('@/services/firebaseInit', () => ({
  initializeFirebaseServices: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@screens/WalletSetup/scripts', () => ({
  retrieveWalletFromStorage: jest.fn(),
}));

jest.mock('@store/portfolio', () => ({
  usePortfolioStore: jest.fn(),
}));

jest.mock('@store/transactions', () => ({
  useTransactionsStore: jest.fn(),
}));

jest.mock('@components/Common/Navigation', () => {
  return function MockNavigation() {
    const React = require('react');
    return React.createElement('View', { testID: 'mock-navigation' });
  };
});

jest.mock('@screens/WalletSetup', () => {
  return function MockWalletSetup(props: any) {
    const React = require('react');
    return React.createElement('View', { testID: 'mock-wallet-setup-screen', ...props });
  };
});

// Mock logger
jest.mock('@/utils/logger', () => ({
    logger: {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        breadcrumb: jest.fn(),
        debug: jest.fn(),
    }
}));


describe('App.tsx', () => {
  let mockSetWallet = jest.fn();
  let mockFetchPortfolioBalance = jest.fn();
  let mockFetchRecentTransactions = jest.fn();
  let mockPortfolioStoreState: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetWallet = jest.fn();
    mockFetchPortfolioBalance = jest.fn();
    mockFetchRecentTransactions = jest.fn();

    mockPortfolioStoreState = {
      wallet: null, // Start with no wallet
      setWallet: mockSetWallet,
      fetchPortfolioBalance: mockFetchPortfolioBalance,
      // other portfolio state/methods
    };
    (usePortfolioStore as unknown as jest.Mock).mockReturnValue(mockPortfolioStoreState);

    (useTransactionsStore as unknown as jest.Mock).mockReturnValue({
      fetchRecentTransactions: mockFetchRecentTransactions,
      // other transactions state/methods
    });
  });

  describe('App Initialization (prepare function)', () => {
    it('should retrieve existing wallet, set it, and fetch data', async () => {
      const mockPublicKey = 'existing-test-public-key';
      (retrieveWalletFromStorage as jest.Mock).mockResolvedValueOnce(mockPublicKey);

      render(<App />);

      await waitFor(() => expect(retrieveWalletFromStorage).toHaveBeenCalled());
      await waitFor(() => expect(mockSetWallet).toHaveBeenCalledWith(mockPublicKey));

      // Need to simulate wallet update for the effect that fetches data
      // This is a bit tricky as setWallet updates the store, which then triggers effects
      // For this test, we'll assume setWallet immediately makes the wallet available
      // or that the subsequent calls are chained correctly.
      // In a real scenario, the effect depending on `wallet` would run after store update.

      // To directly test the calls after setWallet within prepare():
      expect(logger.info).toHaveBeenCalledWith("App: Fetching initial transactions and balance for existing wallet.", { publicKey: mockPublicKey });
      expect(mockFetchPortfolioBalance).toHaveBeenCalledWith(mockPublicKey);
      expect(mockFetchRecentTransactions).toHaveBeenCalledWith(mockPublicKey);

      await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
    });

    it('should show wallet setup if no existing wallet is found', async () => {
      (retrieveWalletFromStorage as jest.Mock).mockResolvedValueOnce(null);

      const { findByTestId } = render(<App />);

      await waitFor(() => expect(retrieveWalletFromStorage).toHaveBeenCalled());
      expect(mockSetWallet).not.toHaveBeenCalled();
      expect(mockFetchPortfolioBalance).not.toHaveBeenCalled();
      expect(mockFetchRecentTransactions).not.toHaveBeenCalled();

      expect(await findByTestId('mock-wallet-setup-screen')).toBeTruthy();
      await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
    });

     it('handles error during wallet retrieval and shows setup screen', async () => {
      (retrieveWalletFromStorage as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const { findByTestId } = render(<App />);

      await waitFor(() => expect(retrieveWalletFromStorage).toHaveBeenCalled());
      expect(mockSetWallet).not.toHaveBeenCalled();
      expect(await findByTestId('mock-wallet-setup-screen')).toBeTruthy();
    });
  });

  describe('handleWalletSetupComplete', () => {
    it('should set new wallet and fetch initial data', async () => {
      // Start with app needing wallet setup
      (retrieveWalletFromStorage as jest.Mock).mockResolvedValueOnce(null);
      const { getByTestId } = render(<App />);

      // Wait for WalletSetupScreen to be rendered
      const walletSetupScreen = await waitFor(() => getByTestId('mock-wallet-setup-screen'));

      const mockNewKeypair = Keypair.generate();
      const mockNewPublicKey = mockNewKeypair.publicKey.toBase58();

      // Simulate calling onWalletSetupComplete from WalletSetupScreen
      // This requires `act` because it will cause state updates in App.tsx
      await act(async () => {
        walletSetupScreen.props.onWalletSetupComplete(mockNewKeypair);
      });

      await waitFor(() => expect(mockSetWallet).toHaveBeenCalledWith(mockNewPublicKey));

      expect(logger.info).toHaveBeenCalledWith("App: Fetching initial transactions and balance after new wallet setup.", { newPublicKey: mockNewPublicKey });
      expect(mockFetchPortfolioBalance).toHaveBeenCalledWith(mockNewPublicKey);
      expect(mockFetchRecentTransactions).toHaveBeenCalledWith(mockNewPublicKey);

      // Check if it navigates away from setup (Navigation component rendered)
      await waitFor(() => expect(getByTestId('mock-navigation')).toBeTruthy());
    });
  });
});
