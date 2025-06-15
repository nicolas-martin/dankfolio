import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import TokenSelector from './index'; // Adjust path as necessary
import type { Coin } from '@/types'; // Use type import
import { useCoinStore } from '@/store/coins'; // Import the actual store
import { logger } from '@/utils/logger';

// --- Mocks ---
// grpcApi mock removed as getUsdPrice is no longer directly called

// Mock the useCoinStore
const mockGetCoinByID = jest.fn();
let mockCoinStoreState: { coinMap: Record<string, Coin | undefined> } = { coinMap: {} };

jest.mock('@/store/coins', () => ({
  useCoinStore: jest.fn(selector => selector(mockCoinStoreState)),
}));
// Setup getState for actions like getCoinByID
// We need to ensure useCoinStore.getState can be mocked before it's used.
// A common way is to assign it after the module mock.
if (useCoinStore) { // Check if useCoinStore is now defined after mocking
    (useCoinStore as any).getState = jest.fn(() => ({
        getCoinByID: mockGetCoinByID,
        // other actions if needed
    }));
}


jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('./styles', () => ({
  useStyles: jest.fn(() => ({
    cardContainer: {},
    cardContent: {},
    selectorButtonContainer: {},
    tokenInfo: {},
    tokenIcon: {},
    tokenSymbol: {},
    inputContainer: {},
    amountInput: { height: 50 }, // Mock height for ActivityIndicator style
    bottomTextContainer: {},
    equivalentValueText: {},
    helperText: {},
    switchContainer: {},
    switchLabel: {},
    colors: { primary: 'blue', onTertiaryContainer: 'grey', onSurface: 'black' },
  })),
}));

// Mock react-native-paper Switch
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const RNSwitch = require('react-native').Switch;
  return {
    ...RealModule,
    Switch: jest.fn(({ value, onValueChange, testID }) => (
      <RNSwitch value={value} onValueChange={onValueChange} testID={testID} />
    )),
    // Mock other Paper components if they are used directly and cause issues
    Text: RealModule.Text,
    Card: RealModule.Card,
  };
});

// Mock sub-components like CachedImage, ChevronDownIcon if they are not part of the core logic being tested
jest.mock('@/components/Common/CachedImage', () => 'CachedImage');
jest.mock('@components/Common/Icons', () => ({
  ChevronDownIcon: () => 'ChevronDownIcon',
}));
// TokenSearchModal is complex; mock it if its direct functionality isn't tested here.
// For these tests, we are focusing on the amount input and USD toggle, not modal interaction.
// jest.mock('./TokenSearchModal', () => 'TokenSearchModal'); // Or a more functional mock if needed

const SOL: Coin = { mintAddress: 'SOLANA_ADDRESS_MOCK', name: 'Solana', symbol: 'SOL', decimals: 9, price: 0, resolvedIconUrl: 'sol.png' };
const USDC: Coin = { mintAddress: 'USDC_ADDRESS_MOCK', name: 'USD Coin', symbol: 'USDC', decimals: 6, price: 0, resolvedIconUrl: 'usdc.png' };

describe('TokenSelector Component', () => {
  let mockOnAmountChange: jest.Mock;
  // mockOnUsdAmountChange is removed as the prop is gone
  let mockOnSelectToken: jest.Mock;

  const setupCoinStoreWithPrice = (coin: Coin, price: number | undefined) => {
    const updatedCoin = { ...coin, price: price as number }; // Type assertion for test
    mockCoinStoreState = {
      coinMap: {
        ...mockCoinStoreState.coinMap,
        [coin.mintAddress]: price !== undefined ? updatedCoin : undefined,
      },
    };
    // Ensure getCoinByID resolves correctly for this setup if needed by effects
    mockGetCoinByID.mockImplementation(async (id) => {
        if (id === coin.mintAddress) return mockCoinStoreState.coinMap[id];
        return null;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAmountChange = jest.fn();
    mockOnSelectToken = jest.fn();

    // Reset and default mock for useCoinStore and its actions
    mockCoinStoreState = { coinMap: {} };
    // Default implementation for getCoinByID for cases where it's called but not the focus of the test
    mockGetCoinByID.mockResolvedValue(null);
    if (useCoinStore && (useCoinStore as any).getState) { // Ensure getState is mocked
        (useCoinStore as any).getState.mockReturnValue({ getCoinByID: mockGetCoinByID });
    }
    // Default setup for SOL with a price for general tests
    setupCoinStoreWithPrice(SOL, 150.00);
  });

  const renderTokenSelector = (props: Partial<React.ComponentProps<typeof TokenSelector>> = {}) => {
    const defaultProps: React.ComponentProps<typeof TokenSelector> = {
      selectedToken: SOL,
      onSelectToken: mockOnSelectToken,
      onAmountChange: mockOnAmountChange,
      testID: 'test-selector',
      ...props,
    };
    return render(<TokenSelector {...defaultProps} />);
  };

  describe('1. Initial State & Props', () => {
    test('renders with default CRYPTO unit when enableUsdToggle is true', () => {
      const { getByTestId, queryByTestId } = renderTokenSelector({ enableUsdToggle: true });
      expect(queryByTestId('test-selector-unit-switch')).toBeTruthy();
      expect(getByTestId('test-selector-unit-switch').props.value).toBe(false); // CRYPTO
    });

    test('does not render Switch if enableUsdToggle is false', () => {
      const { queryByTestId } = renderTokenSelector({ enableUsdToggle: false });
      expect(queryByTestId('test-selector-unit-switch')).toBeNull();
    });

    test('initializes with initialInputUnit prop', () => {
      const { getByTestId } = renderTokenSelector({ enableUsdToggle: true, initialInputUnit: 'USD' });
      expect(getByTestId('test-selector-unit-switch').props.value).toBe(true); // USD
    });
  });

  describe('2. Price Fetching via useCoinStore', () => {
    test('calls useCoinStore.getState().getCoinByID when selectedToken changes and toggle is enabled', async () => {
      const { rerender } = renderTokenSelector({ enableUsdToggle: true, selectedToken: null });
      expect(mockGetCoinByID).not.toHaveBeenCalled();

      rerender(<TokenSelector selectedToken={SOL} onSelectToken={mockOnSelectToken} onAmountChange={mockOnAmountChange} testID="test-selector" enableUsdToggle={true} />);
      await waitFor(() => expect(mockGetCoinByID).toHaveBeenCalledWith(SOL.mintAddress, true));
    });

    test('does not call getCoinByID if enableUsdToggle is false', () => {
      renderTokenSelector({ enableUsdToggle: false, selectedToken: SOL });
      expect(mockGetCoinByID).not.toHaveBeenCalled();
    });

    test('handles error if getCoinByID fails (e.g., logs error)', async () => {
      mockGetCoinByID.mockRejectedValueOnce(new Error('Store fetch failed'));
      renderTokenSelector({ enableUsdToggle: true, selectedToken: SOL });
      await waitFor(() => expect(mockGetCoinByID).toHaveBeenCalled());
      expect(logger.error).toHaveBeenCalledWith('[TokenSelector] Failed to fetch coin data for price:', expect.any(Error));
    });
  });

  describe('3. handleUnitToggle Function', () => {
    test('toggles currentInputUnit and clears amounts', async () => {
      // onUsdAmountChange is removed, so no mock for it.
      const { getByTestId } = renderTokenSelector({ enableUsdToggle: true });
      const unitSwitch = getByTestId('test-selector-unit-switch');

      // Initial: CRYPTO
      expect(unitSwitch.props.value).toBe(false);

      // Toggle to USD
      fireEvent(unitSwitch, 'valueChange', true);
      await waitFor(() => expect(unitSwitch.props.value).toBe(true));
      expect(mockOnAmountChange).toHaveBeenCalledWith('');
      // No onUsdAmountChange callback to check

      // Toggle back to CRYPTO
      fireEvent(unitSwitch, 'valueChange', false);
      await waitFor(() => expect(unitSwitch.props.value).toBe(false));
      expect(mockOnAmountChange).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('4. UI Updates on Unit Toggle', () => {
    test('placeholder, helperText, and equivalentValueDisplay update on unit toggle', async () => {
      setupCoinStoreWithPrice(SOL, 150); // Ensure price is in store
      const { getByTestId, queryByTestId } = renderTokenSelector({
        enableUsdToggle: true,
        selectedToken: SOL,
        helperText: "Original helper",
        amountValue: '1',
      });
      // Effect for getCoinByID (to fetch price) runs, then effect for amountValue runs
      await waitFor(() => expect(getByTestId('test-selector-equivalent-value').props.children).toBe('$150.00'));


      const unitSwitch = getByTestId('test-selector-unit-switch');
      const amountInput = getByTestId('test-selector-amount-input');

      // Initial: CRYPTO
      expect(amountInput.props.placeholder).toBe(`0.0000 ${SOL.symbol}`);
      expect(getByTestId('test-selector-helper-text').props.children).toBe("Original helper");
      expect(getByTestId('test-selector-equivalent-value').props.children).toBe('$150.00');

      // Toggle to USD
      fireEvent(unitSwitch, 'valueChange', true);
      await waitFor(() => {
        expect(amountInput.props.placeholder).toBe('$0.00');
        expect(getByTestId('test-selector-helper-text').props.children).toBe('Enter USD amount');
        expect(queryByTestId('test-selector-equivalent-value')).toBeNull();
      });

      fireEvent.changeText(amountInput, '300');
      await waitFor(() => {
          expect(getByTestId('test-selector-equivalent-value').props.children).toBe(`2.000000000 ${SOL.symbol}`);
      });

      // Toggle back to CRYPTO
      fireEvent(unitSwitch, 'valueChange', false);
      await waitFor(() => {
        expect(amountInput.props.placeholder).toBe(`0.0000 ${SOL.symbol}`);
        expect(getByTestId('test-selector-helper-text').props.children).toBe("Original helper");
        expect(queryByTestId('test-selector-equivalent-value')).toBeNull();
      });
    });
  });

  describe('5. Input Handling & Conversions using Store Price', () => {
    const cryptoAmount = '2';
    const usdAmount = '450';

    test('CRYPTO to USD: updates parent crypto, calculates internal USD', async () => {
      setupCoinStoreWithPrice(SOL, 150); // liveExchangeRate = 150
      const { getByTestId } = renderTokenSelector({ enableUsdToggle: true, selectedToken: SOL });
      // Wait for initial effects if any
      await act(async () => {});


      fireEvent.changeText(getByTestId('test-selector-amount-input'), cryptoAmount);

      expect(mockOnAmountChange).toHaveBeenCalledWith(cryptoAmount);
      // internalUsdAmount should be 2 * 150 = 300.00. This is reflected in equivalentValueDisplay
      await waitFor(() => expect(getByTestId('test-selector-equivalent-value').props.children).toBe(`$${(parseFloat(cryptoAmount) * 150).toFixed(2)}`));
    });

    test('USD to CRYPTO: updates internal USD, calculates crypto, calls parent crypto', async () => {
      setupCoinStoreWithPrice(SOL, 150); // liveExchangeRate = 150
      const { getByTestId } = renderTokenSelector({
        enableUsdToggle: true,
        selectedToken: SOL,
        initialInputUnit: 'USD',
      });
      await act(async () => {});

      const expectedCryptoAmount = (parseFloat(usdAmount) / 150).toFixed(SOL.decimals);
      fireEvent.changeText(getByTestId('test-selector-amount-input'), usdAmount);

      // internalUsdAmount is set to usdAmount.
      await waitFor(() => expect(mockOnAmountChange).toHaveBeenCalledWith(expectedCryptoAmount));
      expect(getByTestId('test-selector-equivalent-value').props.children).toBe(`${expectedCryptoAmount} ${SOL.symbol}`);
    });

    test('Edge Case: Empty input clears derived amounts (Store Price)', async () => {
      setupCoinStoreWithPrice(SOL, 150);
      const { getByTestId } = renderTokenSelector({ enableUsdToggle: true, selectedToken: SOL });
      await act(async () => {});

      fireEvent.changeText(getByTestId('test-selector-amount-input'), '');
      expect(mockOnAmountChange).toHaveBeenCalledWith('');
      // internalUsdAmount becomes '', so equivalent display is null
      await waitFor(() => expect(getByTestId('test-selector-equivalent-value')).toBeNull());


      fireEvent(getByTestId('test-selector-unit-switch'), 'valueChange', true); // Switch to USD
      fireEvent.changeText(getByTestId('test-selector-amount-input'), '');
      // internalUsdAmount is '', onAmountChange should be called with ''
      await waitFor(() => expect(mockOnAmountChange).toHaveBeenCalledWith(''));
    });

    test('Edge Case: Store price is 0, loading, or undefined prevents conversion', async () => {
        setupCoinStoreWithPrice(SOL, 0); // liveExchangeRate = 0
        const { getByTestId, queryByTestId } = renderTokenSelector({ enableUsdToggle: true, selectedToken: SOL });
        await act(async () => {});

        fireEvent.changeText(getByTestId('test-selector-amount-input'), '2'); // Input crypto
        expect(mockOnAmountChange).toHaveBeenCalledWith('2');
        // equivalentValueDisplay should show '$-.--' or similar for invalid rate
        await waitFor(() => expect(getByTestId('test-selector-equivalent-value').props.children).toBe('$-.--'));

        fireEvent(getByTestId('test-selector-unit-switch'), 'valueChange', true); // Switch to USD
        fireEvent.changeText(getByTestId('test-selector-amount-input'), '300'); // Input USD
        await waitFor(() => expect(mockOnAmountChange).toHaveBeenCalledWith('')); // Crypto amount is cleared
        expect(getByTestId('test-selector-equivalent-value').props.children).toBe(`--.-- ${SOL.symbol}`);

        // Test with undefined price (loading)
        setupCoinStoreWithPrice(SOL, undefined);
        fireEvent.changeText(getByTestId('test-selector-amount-input'), '300'); // Input USD
        await waitFor(() => expect(mockOnAmountChange).toHaveBeenCalledWith(''));
        expect(getByTestId('test-selector-equivalent-value').props.children).toBe(`... ${SOL.symbol}`);
    });
  });

  describe('6. Cross-Amount Update (useEffect on amountValue prop using Store Price)', () => {
    test('updates internalUsdAmount when amountValue (crypto prop) changes and unit is CRYPTO', async () => {
      setupCoinStoreWithPrice(SOL, 150);
      const { rerender } = renderTokenSelector({
        enableUsdToggle: true,
        selectedToken: SOL,
        amountValue: '1'
      });
      await waitFor(() => expect(getByTestId('test-selector-equivalent-value').props.children).toBe('$150.00'));

      setupCoinStoreWithPrice(SOL, 150); // Ensure store has price for rerendered instance
      rerender(<TokenSelector selectedToken={SOL} onSelectToken={mockOnSelectToken} onAmountChange={mockOnAmountChange} testID="test-selector" enableUsdToggle={true} amountValue="3" />);
      await waitFor(() => expect(getByTestId('test-selector-equivalent-value').props.children).toBe('$450.00'));
    });
  });
});
