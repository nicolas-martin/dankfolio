import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Trade from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { grpcApi } from '@/services/grpcApi';
// Assuming useStyles returns a simple object for testing

// --- Mocks ---

// React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    reset: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    params: { initialFromCoin: null, initialToCoin: null },
  })),
}));

// Zustand Stores
jest.mock('@store/portfolio', () => ({
  usePortfolioStore: jest.fn(),
}));
jest.mock('@store/coins', () => ({
  useCoinStore: jest.fn(),
}));
jest.mock('@store/transactions', () => ({
  useTransactionsStore: jest.fn(() => ({
    fetchRecentTransactions: jest.fn(),
  })),
}));

// Toast
jest.mock('@components/Common/Toast', () => ({
  useToast: jest.fn(),
}));

// gRPC API
jest.mock('@/services/grpcApi', () => ({
  grpcApi: {
    // getUsdPrice: jest.fn(), // Removed, no longer used by TradeScreen directly
    getFullSwapQuoteOrchestrated: jest.fn(),
    getSwapStatus: jest.fn(), // For useTransactionPolling
    // Add other methods if they get called and need mocking
  },
}));

// Logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    breadcrumb: jest.fn(),
    exception: jest.fn(),
  },
}));

// Styles
jest.mock('./styles', () => ({
  useStyles: jest.fn(() => ({
    // Provide some basic style objects to prevent errors if accessed
    container: {},
    scrollView: {},
    content: {},
    tradeContainer: {},
    tradeCard: {},
    cardLabel: {},
    colors: { onPrimary: 'white', primary: 'blue', onSurfaceVariant: 'grey', onSurface: 'black' }, // Mock colors
    detailsCard: {},
    detailsTitle: {},
    detailsContent: {},
    detailRow: {},
    detailLabel: {},
    detailValue: {},
    exchangeRateRow: {},
    exchangeRateLabel: {},
    exchangeRateValue: {},
    detailsIcon: {},
    exchangeRateLabelText: {},
    toCardContainerStyle: {},
    swapButtonContainer: {},
    swapButton: {},
    actionContainer: {},
    tradeButton: {},
    tradeButtonContent: {},
    tradeButtonLabel: {},
  })),
}));

// Debounced callback - return the function directly for immediate execution
jest.mock('@/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: jest.fn((callback) => callback),
}));

// Transaction Polling Hook
jest.mock('@/hooks/useTransactionPolling', () => ({
  useTransactionPolling: jest.fn(() => ({
    txHash: null,
    status: 'pending',
    error: null,
    confirmations: 0,
    startPolling: jest.fn(),
    resetPolling: jest.fn(),
  })),
  PollingStatus: { // Export PollingStatus enum if needed
    PENDING: 'pending',
    SUCCESS: 'success',
    ERROR: 'error',
  }
}));

// Mock react-native-paper components that are directly used or causing issues
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const { Switch: RNSwitch } = jest.requireActual('react-native');
  const MockedModule = {
    ...RealModule,
    // Mock specific components if they cause trouble or need spies
    // For example, if Switch needs specific handling:
    Switch: jest.fn(({ value, onValueChange }) => {
      // A simple mock, can be enhanced
      return <RNSwitch value={value} onValueChange={onValueChange} />;
    }),
    // Text: (props) => <RNText {...props} />, // If you need to mock Text specifically
  };
  return MockedModule;
});


// --- Default Mock Implementations ---
const mockShowToast = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();

const mockDefaultPortfolio = {
  tokens: [],
  wallet: { address: 'test-wallet-address' },
  fetchPortfolioBalance: jest.fn(),
};

const mockDefaultCoins = {
  getCoinByID: jest.fn(async (id) => {
    if (id === 'SOLANA_ADDRESS_MOCK') return { mintAddress: id, symbol: 'SOL', name: 'Solana', decimals: 9, price: 150 };
    if (id === 'USDC_ADDRESS_MOCK') return { mintAddress: id, symbol: 'USDC', name: 'USD Coin', decimals: 6, price: 1 };
    return null;
  }),
};

const SOL = { 
  mintAddress: 'SOLANA_ADDRESS_MOCK', 
  name: 'Solana', 
  symbol: 'SOL', 
  decimals: 9, 
  price: 150, 
  logoURI: '',
  description: 'Solana native token',
  tags: ['native'],
  dailyVolume: 1000000
};
const USDC = { 
  mintAddress: 'USDC_ADDRESS_MOCK', 
  name: 'USD Coin', 
  symbol: 'USDC', 
  decimals: 6, 
  price: 1, 
  logoURI: '',
  description: 'USD Coin stablecoin',
  tags: ['stablecoin'],
  dailyVolume: 500000
};


describe('Trade Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate, reset: mockReset });
    (useRoute as jest.Mock).mockReturnValue({ params: { initialFromCoin: null, initialToCoin: null } });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
    (usePortfolioStore as unknown as jest.Mock).mockReturnValue(mockDefaultPortfolio);
    (useCoinStore as unknown as jest.Mock).mockReturnValue(mockDefaultCoins);
    // (grpcApi.getUsdPrice as jest.Mock).mockResolvedValue(150); // This mock is removed from here, TokenSelector will handle its own
    (grpcApi.getFullSwapQuoteOrchestrated as jest.Mock).mockResolvedValue({
      estimatedAmount: '0.5',
      exchangeRate: '0.006666',
      fee: '0.000005',
      priceImpactPct: '0.1',
      totalFee: '0.000005 SOL',
      route: 'Direct',
    });
  });

  const renderTradeScreen = (initialFromCoin: any = null, initialToCoin: any = null) => {
    (useRoute as jest.Mock).mockReturnValue({ params: { initialFromCoin, initialToCoin } });
    return render(<Trade />);
  };

  test('renders correctly and shows initial state', () => {
    const { getByTestId } = renderTradeScreen();
    expect(getByTestId('trade-screen')).toBeTruthy();
    expect(getByTestId('from-token-selector')).toBeTruthy();
    expect(getByTestId('to-token-selector')).toBeTruthy();
  });

  describe('Simplified handleFromAmountChange', () => {
    test('should update fromAmount and fetch quote', async () => {
      const { getByTestId } = renderTradeScreen(SOL, USDC);
      const fromTokenSelector = getByTestId('from-token-selector');

      act(() => {
        // Simulate TokenSelector calling onAmountChange with a crypto amount
        fromTokenSelector.props.onAmountChange('10');
      });

      await waitFor(() => {
        // Check that fromAmount in TradeScreen's state is updated (indirectly via what's passed to quote)
        // And that quote is fetched with this crypto amount
        expect(grpcApi.getFullSwapQuoteOrchestrated).toHaveBeenCalledWith('10', SOL, USDC, 'from');
      });
    });

    test('should clear toAmount and tradeDetails if crypto amount is invalid', async () => {
        const { getByTestId, UNSAFE_getByProps } = renderTradeScreen(SOL, USDC);
        const fromTokenSelector = getByTestId('from-token-selector');

        // First, set a valid amount to populate toAmount
        act(() => { fromTokenSelector.props.onAmountChange('10'); });
        await waitFor(() => expect(grpcApi.getFullSwapQuoteOrchestrated).toHaveBeenCalledWith('10', SOL, USDC, 'from'));
        // Assume getFullSwapQuoteOrchestrated populates toAmount, e.g., to '0.5'
        // We need to ensure the mock for getFullSwapQuoteOrchestrated updates toAmount via setTradeDetails
        // For this test, we can check that after an invalid amount, toAmount is cleared in the UI
         await waitFor(() => {
            expect(UNSAFE_getByProps({ testID: 'to-token-selector' }).props.amountValue).toBe('0.5');
         });

        (grpcApi.getFullSwapQuoteOrchestrated as jest.Mock).mockClear();

        act(() => {
          fromTokenSelector.props.onAmountChange(''); // Pass an empty (invalid) crypto amount
        });

        await waitFor(() => {
          expect(UNSAFE_getByProps({ testID: 'to-token-selector' }).props.amountValue).toBe('');
        });
        expect(grpcApi.getFullSwapQuoteOrchestrated).not.toHaveBeenCalled();
      });
  });

  describe('TokenSelector Interaction', () => {
    test('From TokenSelector should have enableUsdToggle set to true', () => {
      const { getByTestId } = renderTradeScreen(SOL, USDC);
      const fromTokenSelector = getByTestId('from-token-selector');
      expect(fromTokenSelector.props.enableUsdToggle).toBe(true);
    });

    test('To TokenSelector should have enableUsdToggle set to false', () => {
      const { getByTestId } = renderTradeScreen(SOL, USDC);
      const toTokenSelector = getByTestId('to-token-selector');
      expect(toTokenSelector.props.enableUsdToggle).toBe(false);
    });
  });

  describe('Trade Submission (Simplified)', () => {
    test('handleTradeSubmitClick should use crypto fromAmount from state', async () => {
      const cryptoAmount = '15.5';
      const scripts = require('./scripts');
      const handleTradeSubmitSpy = jest.spyOn(scripts, 'handleTradeSubmit');

      const { getByTestId, getByText } = renderTradeScreen(SOL, USDC);

      // Simulate TokenSelector providing a crypto amount via onAmountChange
      const fromTokenSelector = getByTestId('from-token-selector');
      act(() => {
        fromTokenSelector.props.onAmountChange(cryptoAmount);
      });

      // Wait for quote to be fetched and toAmount to be populated
      await waitFor(() => {
        expect(grpcApi.getFullSwapQuoteOrchestrated).toHaveBeenCalledWith(cryptoAmount, SOL, USDC, 'from');
      });
      // Assume getFullSwapQuoteOrchestrated mock sets a valid toAmount for the button to be enabled
      (grpcApi.getFullSwapQuoteOrchestrated as jest.Mock).mockResolvedValue({
        estimatedAmount: '0.75', // Mock toAmount
        exchangeRate: '0.005', fee: '0.000005', priceImpactPct: '0.1', totalFee: '0.000005 SOL', route: 'Direct',
      });
      // Re-trigger with same amount to update toAmount
      act(() => { fromTokenSelector.props.onAmountChange(cryptoAmount); });
      await waitFor(() => expect(getByTestId('to-token-selector').props.amountValue).toBe('0.75'));


      const tradeButton = getByText('Trade');
      fireEvent.press(tradeButton);

      expect(handleTradeSubmitSpy).toHaveBeenCalled();
      const LATEST_CALL_INDEX = handleTradeSubmitSpy.mock.calls.length -1;
      expect(handleTradeSubmitSpy.mock.calls[LATEST_CALL_INDEX][0]).toBe(cryptoAmount);

      handleTradeSubmitSpy.mockRestore();
    });
  });

  // Removed tests for internal TradeScreen USD logic:
  // - Initial State for inputUnit, usdAmount, exchangeRate (direct state)
  // - handleUnitToggle
  // - UI Updates on Unit Toggle (placeholder/helper text previously controlled by TradeScreen)
  // - Exchange Rate Fetching (useEffect in TradeScreen)
  // - Real-time Calculations in handleFromAmountChange (complex conversion logic)
  // These are now the responsibility of TokenSelector and will be tested in its own test file.
});
