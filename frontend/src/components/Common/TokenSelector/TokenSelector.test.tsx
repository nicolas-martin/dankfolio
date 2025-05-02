import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import TokenSelector from './index';
import { handleAmountInputChange, calculateUsdValue, findPortfolioToken } from './scripts';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { useProxiedImage } from '@/hooks/useProxiedImage';
import { Coin } from '@/types';

//BUG: SOMEHOW THESE TESTS ARE POLUTING THE STORE?

// Mock the stores and hooks
jest.mock('@store/portfolio');
jest.mock('@store/coins');
jest.mock('@/hooks/useProxiedImage');
jest.mock('@components/Common/Icons', () => ({
	ChevronDownIcon: 'ChevronDownIcon',
}));

// Mock implementation for useProxiedImage
(useProxiedImage as jest.Mock).mockImplementation((url: string) => ({
	imageUri: url, // Just return the URL as is for testing
	isLoading: false,
	error: null
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
		mintAddress: "So11111111111111111111111111111111111111112",
		name: "Solana",
		symbol: "SOL",
		iconUrl: "https://example.com/sol.png",
		decimals: 9,
		price: 150.0,
		description: "Solana Blockchain",
		website: "https://solana.com",
		twitter: "https://twitter.com/solana",
		telegram: "",
		dailyVolume: 5e9,
		tags: ["layer-1"],
		createdAt: new Date("2024-01-01T00:00:00Z"),
	};

	const mockEthCoin: Coin = {
		mintAddress: "So11111111111111111111111111111111111111113",
		name: "Ethereum",
		symbol: "ETH",
		iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ethereum/logo.png",
		decimals: 18,
		price: 3000,
		description: "Ethereum Blockchain",
		website: "https://ethereum.org",
		twitter: "https://twitter.com/ethereum",
		telegram: "",
		dailyVolume: 500000,
		createdAt: new Date("2024-01-01T00:00:00Z"),
		tags: ["cryptocurrency"],
	};

	const mockPortfolioToken = {
		mintAddress: mockCoin.mintAddress,
		amount: 1.5,
		price: mockCoin.price,
		value: 1.5 * mockCoin.price,
		coin: mockCoin
	};

	const mockOnSelectToken = jest.fn();
	const mockOnAmountChange = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		(usePortfolioStore as unknown as jest.Mock).mockReturnValue({ tokens: [] });
		(useCoinStore as unknown as jest.Mock).mockReturnValue({ availableCoins: [mockCoin] });
		// Reset and set up useProxiedImage mock for each test
		(useProxiedImage as jest.Mock).mockReset();
		(useProxiedImage as jest.Mock).mockImplementation((url: string) => ({
			imageUri: url,
			isLoading: false,
			error: null
		}));
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
			expect(getByText('SOL')).toBeTruthy();
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
				mintAddress: "So11111111111111111111111111111111111111113",
				name: "Ethereum",
				symbol: "ETH",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ethereum/logo.png",
				decimals: 18,
				price: 3000,
				description: "Ethereum Blockchain",
				website: "https://ethereum.org",
				twitter: "https://twitter.com/ethereum",
				telegram: "",
				dailyVolume: 500000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["cryptocurrency"],
			};

			// Mock available coins to include both SOL and ETH
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

			// Search for SOL
			const searchInput = getByPlaceholderText('Search tokens');
			await act(async () => {
				fireEvent.changeText(searchInput, 'SOL');
				jest.runAllTimers();
			});

			// Select SOL from the list
			await act(async () => {
				fireEvent.press(getByText('Solana'));
				jest.runAllTimers();
			});

			// Verify SOL is now selected
			expect(getByText('SOL')).toBeTruthy();

			// Verify onSelectToken was called with SOL
			expect(mockOnSelectToken).toHaveBeenCalledWith(mockCoin);
		});

		it('filters tokens based on showOnlyPortfolioTokens flag', async () => {
			const mockEthCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111113",
				name: "Ethereum",
				symbol: "ETH",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ethereum/logo.png",
				decimals: 18,
				price: 3000,
				description: "Ethereum Blockchain",
				website: "https://ethereum.org",
				twitter: "https://twitter.com/ethereum",
				telegram: "",
				dailyVolume: 500000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["cryptocurrency"],
			};

			const mockSolCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111114",
				name: "Solana",
				symbol: "SOL",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/solana/logo.png",
				decimals: 9,
				price: 100,
				description: "Solana Blockchain",
				website: "https://solana.com",
				twitter: "https://twitter.com/solana",
				telegram: "",
				dailyVolume: 200000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["cryptocurrency"],
			};

			// Mock store with portfolio containing only SOL and ETH
			(usePortfolioStore as unknown as jest.Mock).mockReturnValue({
				tokens: [
					{ mintAddress: mockCoin.mintAddress, coin: mockCoin, amount: 1.5, price: mockCoin.price, value: 1.5 * mockCoin.price },
					{ mintAddress: mockEthCoin.mintAddress, coin: mockEthCoin, amount: 10, price: mockEthCoin.price, value: 10 * mockEthCoin.price }
				]
			});

			// Mock available coins to include SOL, ETH, and SOL
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
			expect(getAllTokensGetByText('Solana')).toBeTruthy();
			expect(getAllTokensGetByText('Ethereum')).toBeTruthy();

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
			expect(getAllTokensGetByText('Solana')).toBeTruthy();
			expect(getAllTokensGetByText('Ethereum')).toBeTruthy();
			expect(getAllTokensQueryByText('Solana')).toBeNull();
		});

		it('correctly extracts and displays coin info from PortfolioTokens', async () => {
			// Create more test coins
			const mockDogeCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111115",
				name: "Dogecoin",
				symbol: "DOGE",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/dogecoin/logo.png",
				decimals: 8,
				price: 0.1,
				description: "Much wow",
				website: "",
				twitter: "",
				telegram: "",
				dailyVolume: 100000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["meme"],
			};

			const mockShibaCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111116",
				name: "Shiba Inu",
				symbol: "SHIB",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/shiba-inu/logo.png",
				decimals: 8,
				price: 0.00001,
				description: "Very meme",
				website: "",
				twitter: "",
				telegram: "",
				dailyVolume: 50000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["meme"],
			};

			const mockArbCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111117",
				name: "Arbitrum",
				symbol: "ARB",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/arbitrum/logo.png",
				decimals: 18,
				price: 1.5,
				description: "L2 scaling",
				website: "",
				twitter: "",
				telegram: "",
				dailyVolume: 200000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["l2"],
			};

			// Create portfolio with SOL and DOGE only
			const portfolioTokens = [
				{
					mintAddress: mockCoin.mintAddress,
					coin: mockCoin,
					amount: 1.5,
					price: mockCoin.price,
					value: 1.5 * mockCoin.price
				},
				{
					mintAddress: mockEthCoin.mintAddress,
					coin: mockEthCoin,
					amount: 10,
					price: mockEthCoin.price,
					value: 10 * mockEthCoin.price
				}
			];

			// Mock store with more available coins than what's in portfolio
			(usePortfolioStore as unknown as jest.Mock).mockReturnValue({
				tokens: portfolioTokens
			});
			(useCoinStore as unknown as jest.Mock).mockReturnValue({
				availableCoins: [mockCoin, mockDogeCoin, mockShibaCoin, mockArbCoin]
			});

			const { getByText, getByTestId, queryByText } = renderWithProvider(
				<TokenSelector
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
					showOnlyPortfolioTokens={true}
				/>
			);

			// Open the modal
			await act(async () => {
				fireEvent.press(getByTestId('token-selector-button'));
				jest.runAllTimers();
			});

			// Verify portfolio tokens are shown
			expect(getByText('SOL')).toBeTruthy();
			expect(getByText('Solana')).toBeTruthy();
			expect(getByText('DOGE')).toBeTruthy();
			expect(getByText('Dogecoin')).toBeTruthy();
			expect(queryByText('1.5')).toBeTruthy();
			expect(queryByText('10')).toBeTruthy();

			// Verify non-portfolio tokens are NOT shown
			expect(queryByText('SHIB')).toBeNull();
			expect(queryByText('Shiba Inu')).toBeNull();
			expect(queryByText('ARB')).toBeNull();
			expect(queryByText('Arbitrum')).toBeNull();
		});

		it('shows all available coins when showOnlyPortfolioTokens is false', async () => {
			// Create more test coins
			const mockDogeCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111115",
				name: "Dogecoin",
				symbol: "DOGE",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/dogecoin/logo.png",
				decimals: 8,
				price: 0.1,
				description: "Much wow",
				website: "",
				twitter: "",
				telegram: "",
				dailyVolume: 100000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["meme"],
			};

			const mockShibaCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111116",
				name: "Shiba Inu",
				symbol: "SHIB",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/shiba-inu/logo.png",
				decimals: 8,
				price: 0.00001,
				description: "Very meme",
				website: "",
				twitter: "",
				telegram: "",
				dailyVolume: 50000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["meme"],
			};

			const mockArbCoin: Coin = {
				mintAddress: "So11111111111111111111111111111111111111117",
				name: "Arbitrum",
				symbol: "ARB",
				iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/arbitrum/logo.png",
				decimals: 18,
				price: 1.5,
				description: "L2 scaling",
				website: "",
				twitter: "",
				telegram: "",
				dailyVolume: 200000,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				tags: ["l2"],
			};

			// Create portfolio with SOL and DOGE only
			const portfolioTokens = [
				{
					mintAddress: mockCoin.mintAddress,
					coin: mockCoin,
					amount: 1.5,
					price: mockCoin.price,
					value: 1.5 * mockCoin.price
				},
				{
					mintAddress: mockEthCoin.mintAddress,
					coin: mockEthCoin,
					amount: 10,
					price: mockEthCoin.price,
					value: 10 * mockEthCoin.price
				}
			];

			// Mock store with more available coins than what's in portfolio
			(usePortfolioStore as unknown as jest.Mock).mockReturnValue({
				tokens: portfolioTokens
			});
			(useCoinStore as unknown as jest.Mock).mockReturnValue({
				availableCoins: [mockCoin, mockDogeCoin, mockShibaCoin, mockArbCoin]
			});

			const { getByText, getByTestId, queryByText } = renderWithProvider(
				<TokenSelector
					onSelectToken={mockOnSelectToken}
					testID="token-selector-button"
					showOnlyPortfolioTokens={false} // Set to false to show all coins
				/>
			);

			// Open the modal
			await act(async () => {
				fireEvent.press(getByTestId('token-selector-button'));
				jest.runAllTimers();
			});

			// Verify ALL coins are shown, regardless of portfolio status
			expect(getByText('SOL')).toBeTruthy(); // In portfolio
			expect(getByText('Solana')).toBeTruthy();
			expect(getByText('DOGE')).toBeTruthy(); // In portfolio
			expect(getByText('Dogecoin')).toBeTruthy();
			expect(getByText('SHIB')).toBeTruthy(); // Not in portfolio
			expect(getByText('Shiba Inu')).toBeTruthy();
			expect(getByText('ARB')).toBeTruthy(); // Not in portfolio
			expect(getByText('Arbitrum')).toBeTruthy();

			// Verify portfolio amounts are still shown for portfolio tokens
			expect(queryByText('1.5')).toBeTruthy();
			expect(queryByText('10')).toBeTruthy();
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
				fireEvent.changeText(searchInput, 'SOL');
			});

			expect(getByText('Solana')).toBeTruthy();
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
				expect(result).toBe('300.00');
			});

			it('returns 0.00 for invalid inputs', () => {
				expect(calculateUsdValue(undefined, '2')).toBe('0.00');
				expect(calculateUsdValue(mockCoin, undefined)).toBe('0.00');
			});
		});

		describe('findPortfolioToken', () => {
			const portfolioTokens = [
				{
					mintAddress: mockCoin.mintAddress,
					coin: mockCoin,
					amount: 1.5,
					price: mockCoin.price,
					value: 1.5 * mockCoin.price
				},
				{
					mintAddress: mockEthCoin.mintAddress,
					coin: { ...mockCoin, id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
					amount: 10,
					price: 3000,
					value: 30000
				}
			];

			it('finds matching portfolio token', () => {
				const result = findPortfolioToken(mockCoin, portfolioTokens);
				expect(result).toEqual(portfolioTokens[0]);
			});

			it('returns undefined when token not found', () => {
				const result = findPortfolioToken(
					{ ...mockCoin, mintAddress: 'nonexistent' },
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
