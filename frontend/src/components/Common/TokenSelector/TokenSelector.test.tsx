import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import TokenSelector from './index';
import { handleAmountInputChange, calculateUsdValue, findPortfolioToken } from './scripts';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';

// Mock the stores
jest.mock('@store/portfolio');
jest.mock('@store/coins');
jest.mock('@components/Common/Icons', () => ({
	ChevronDownIcon: 'ChevronDownIcon',
}));

const renderWithProvider = (component: React.ReactElement) => {
	return render(
		<PaperProvider>
			{component}
		</PaperProvider>
	);
};

describe('TokenSelector', () => {
	const mockCoin: Coin = {
		id: 'bitcoin',
		symbol: 'BTC',
		name: 'Bitcoin',
		icon_url: 'https://example.com/btc.png',
		price: 50000,
		decimals: 8,
		description: 'Bitcoin description',
		tags: ['cryptocurrency'],
		daily_volume: 1000000,
		created_at: new Date().toISOString(),
	};

	const mockOnSelectToken = jest.fn();
	const mockOnAmountChange = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		(usePortfolioStore as unknown as jest.Mock).mockReturnValue({ tokens: [] });
		(useCoinStore as unknown as jest.Mock).mockReturnValue({ availableCoins: [mockCoin] });
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	describe('Component Rendering', () => {
		it('renders correctly without a selected token', () => {
			const { getByText } = renderWithProvider(
				<TokenSelector onSelectToken={mockOnSelectToken} testID="token-selector-button" />
			);
			expect(getByText('Select Token')).toBeTruthy();
		});

		it('renders correctly with a selected token', () => {
			const { getByText } = renderWithProvider(
				<TokenSelector
					selectedToken={mockCoin}
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
				/>
			);
			expect(getByText('BTC')).toBeTruthy();
		});

		it('renders amount input when onAmountChange is provided', () => {
			const { getByPlaceholderText } = renderWithProvider(
				<TokenSelector
					selectedToken={mockCoin}
					onSelectToken={mockOnSelectToken}
					onAmountChange={mockOnAmountChange}
					testID="token-selector-button"
				/>
			);
			expect(getByPlaceholderText('0.00')).toBeTruthy();
		});

		it('switches between different tokens correctly', async () => {
			const mockEthCoin: Coin = {
				id: 'ethereum',
				symbol: 'ETH',
				name: 'Ethereum',
				icon_url: 'https://example.com/eth.png',
				price: 3000,
				decimals: 18,
				description: 'Ethereum description',
				tags: ['cryptocurrency'],
				daily_volume: 500000,
				created_at: new Date().toISOString(),
			};

			// Mock available coins to include both BTC and ETH
			(useCoinStore as unknown as jest.Mock).mockReturnValue({
				availableCoins: [mockCoin, mockEthCoin]
			});

			const { getByText, getByTestId, getByPlaceholderText } = renderWithProvider(
				<TokenSelector
					selectedToken={mockEthCoin}  // Start with ETH selected
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
				/>
			);

			// Verify ETH is initially selected
			expect(getByText('ETH')).toBeTruthy();

			// Open the token selector modal
			await act(async () => {
				fireEvent.press(getByTestId('token-selector-button'));
				jest.runAllTimers();
			});

			// Search for BTC
			const searchInput = getByPlaceholderText('Search tokens');
			await act(async () => {
				fireEvent.changeText(searchInput, 'BTC');
				jest.runAllTimers();
			});

			// Select BTC from the list
			await act(async () => {
				fireEvent.press(getByText('Bitcoin'));
				jest.runAllTimers();
			});

			// Verify BTC is now selected
			expect(getByText('BTC')).toBeTruthy();

			// Verify onSelectToken was called with BTC
			expect(mockOnSelectToken).toHaveBeenCalledWith(mockCoin);
		});

		it('filters tokens based on showOnlyPortfolioTokens flag', async () => {
			const mockEthCoin: Coin = {
				id: 'ethereum',
				symbol: 'ETH',
				name: 'Ethereum',
				icon_url: 'https://example.com/eth.png',
				price: 3000,
				decimals: 18,
				description: 'Ethereum description',
				tags: ['cryptocurrency'],
				daily_volume: 500000,
				created_at: new Date().toISOString(),
			};

			const mockSolCoin: Coin = {
				id: 'solana',
				symbol: 'SOL',
				name: 'Solana',
				icon_url: 'https://example.com/sol.png',
				price: 100,
				decimals: 9,
				description: 'Solana description',
				tags: ['cryptocurrency'],
				daily_volume: 200000,
				created_at: new Date().toISOString(),
			};

			// Mock store with portfolio containing only BTC and ETH
			(usePortfolioStore as unknown as jest.Mock).mockReturnValue({
				tokens: [
					{ id: 'bitcoin', amount: '1.5' },
					{ id: 'ethereum', amount: '10' }
				]
			});

			// Mock available coins to include BTC, ETH, and SOL
			(useCoinStore as unknown as jest.Mock).mockReturnValue({
				availableCoins: [mockCoin, mockEthCoin, mockSolCoin]
			});

			// First test: showOnlyPortfolioTokens = false should show all tokens
			const { getByText: getAllTokensGetByText, getByTestId: getAllTokensGetByTestId, queryByText: getAllTokensQueryByText, rerender } = renderWithProvider(
				<TokenSelector
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
					showOnlyPortfolioTokens={false}
				/>
			);

			// Open the modal
			await act(async () => {
				fireEvent.press(getAllTokensGetByTestId('token-selector-button'));
				jest.runAllTimers();
			});

			// Verify all tokens are visible
			expect(getAllTokensGetByText('Bitcoin')).toBeTruthy();
			expect(getAllTokensGetByText('Ethereum')).toBeTruthy();
			expect(getAllTokensGetByText('Solana')).toBeTruthy();

			// Close the modal
			await act(async () => {
				fireEvent.press(getAllTokensGetByTestId('token-selector-button'));
				jest.runAllTimers();
			});

			// Second test: showOnlyPortfolioTokens = true should show only portfolio tokens
			await act(async () => {
				rerender(
					<PaperProvider>
						<TokenSelector
							onSelectToken={mockOnSelectToken}
							testID="token-selector-button"
							showOnlyPortfolioTokens={true}
						/>
					</PaperProvider>
				);
				jest.runAllTimers();
			});

			// Open the modal again
			await act(async () => {
				fireEvent.press(getAllTokensGetByTestId('token-selector-button'));
				jest.runAllTimers();
			});

			// Verify only portfolio tokens are visible
			expect(getAllTokensGetByText('Bitcoin')).toBeTruthy();
			expect(getAllTokensGetByText('Ethereum')).toBeTruthy();
			expect(getAllTokensQueryByText('Solana')).toBeNull();
		});
	});

	describe('User Interactions', () => {
		it('calls onAmountChange with valid input', () => {
			const { getByPlaceholderText } = renderWithProvider(
				<TokenSelector
					selectedToken={mockCoin}
					onSelectToken={mockOnSelectToken}
					onAmountChange={mockOnAmountChange}
					testID="token-selector-button"
				/>
			);

			const input = getByPlaceholderText('0.00');
			fireEvent.changeText(input, '123.45');
			expect(mockOnAmountChange).toHaveBeenCalledWith('123.45');
		});

		it('opens modal on token selector press', () => {
			const { getByTestId } = renderWithProvider(
				<TokenSelector
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
				/>
			);

			fireEvent.press(getByTestId('token-selector-button'));
			expect(getByTestId('token-search-modal')).toBeTruthy();
		});

		it('filters tokens in modal based on search input', async () => {
			const { getByTestId, getByPlaceholderText, getByText } = renderWithProvider(
				<TokenSelector
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
				/>
			);

			fireEvent.press(getByTestId('token-selector-button'));
			const searchInput = getByPlaceholderText('Search tokens');
			await act(async () => {
				fireEvent.changeText(searchInput, 'BTC');
			});

			expect(getByText('Bitcoin')).toBeTruthy();
		});
	});

	describe('Script Functions', () => {
		const mockCallback = jest.fn();

		beforeEach(() => {
			jest.clearAllMocks();
		});

		describe('handleAmountInputChange', () => {
			it('allows valid decimal numbers', () => {
				handleAmountInputChange('123.45', mockCallback);
				expect(mockCallback).toHaveBeenCalledWith('123.45');
			});

			it('prevents multiple decimal points', () => {
				handleAmountInputChange('123.45.67', mockCallback);
				expect(mockCallback).not.toHaveBeenCalled();
			});

			it('limits decimal places to 9', () => {
				handleAmountInputChange('123.4567891234', mockCallback);
				expect(mockCallback).not.toHaveBeenCalled();
			});
		});

		describe('calculateUsdValue', () => {
			it('calculates correct USD value', () => {
				const result = calculateUsdValue(mockCoin, '2');
				expect(result).toBe('100000.00');
			});

			it('returns 0.00 for invalid inputs', () => {
				expect(calculateUsdValue(undefined, '2')).toBe('0.00');
				expect(calculateUsdValue(mockCoin, undefined)).toBe('0.00');
			});
		});

		describe('findPortfolioToken', () => {
			const portfolioTokens = [
				{ id: 'bitcoin', amount: '1.5' },
				{ id: 'ethereum', amount: '10' },
			];

			it('finds matching portfolio token', () => {
				const result = findPortfolioToken(mockCoin, portfolioTokens);
				expect(result).toEqual({ id: 'bitcoin', amount: '1.5' });
			});

			it('returns undefined when token not found', () => {
				const result = findPortfolioToken(
					{ ...mockCoin, id: 'nonexistent' },
					portfolioTokens
				);
				expect(result).toBeUndefined();
			});

			it('returns undefined for undefined inputs', () => {
				expect(findPortfolioToken(undefined, portfolioTokens)).toBeUndefined();
				expect(findPortfolioToken(mockCoin, undefined)).toBeUndefined();
			});
		});
	});
}); 