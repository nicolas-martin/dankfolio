import { render, fireEvent, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ProfileScreen from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useToast } from '@components/Common/Toast';
import { mocked } from 'jest-mock';
import { ProfileCoin } from './profile_types';
import { Coin } from '@/types';

// Mock dependencies
jest.mock('@store/portfolio', () => ({
	usePortfolioStore: jest.fn(),
}));
jest.mock('@store/transactions', () => ({
	useTransactionsStore: jest.fn(),
}));

jest.mock('@components/Common/Toast', () => ({
	useToast: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
	setString: jest.fn(),
}));

// Mock CoinCard component
jest.mock('@components/Home/CoinCard', () => {
	const CoinCard = ({ coin, onPress }: any) => {
		const React = require('react');
		const View = require('react-native').View;
		const Text = require('react-native').Text;
		const MockImage = (props: any) => <View {...props} />;

		return (
			<View testID={`coin-card-${coin.mintAddress}`} onPress={onPress}>
				<MockImage
					accessibilityRole="image"
					accessibilityLabel={`${coin.name} icon`}
				/>
				<Text>{coin.symbol}</Text>
				<Text>{`$${coin.value?.toFixed(2)}`}</Text>
				{coin.balance && <Text>{`${coin.balance} ${coin.symbol}`}</Text>}
			</View>
		);
	};
	return CoinCard;
});

// Mock Icons
jest.mock('@components/Common/Icons', () => ({
	ProfileIcon: (props: any) => {
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-profile-icon" {...props} />;
	},
	WalletIcon: (props: any) => {
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-wallet-icon" {...props} />;
	},
	CoinsIcon: (props: any) => {
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-coins-icon" {...props} />;
	},
	SendIcon: (props: any) => {
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-send-icon" {...props} />;
	},
	HistoryIcon: (props: any) => { // Added
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-history-icon" {...props} />;
	},
	SwapIcon: (props: any) => { // Added
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-swap-icon" {...props} />;
	},
	ArrowUpIcon: (props: any) => { // Added for transfers
		const React = require('react');
		const View = require('react-native').View;
		return <View testID="mock-arrow-up-icon" {...props} />;
	}
}));

// Mock react-native-paper components that might cause issues or are complex
jest.mock('react-native-paper', () => {
	const actualPaper = jest.requireActual('react-native-paper');
	const React = require('react'); // Ensure React is in scope for JSX
	return {
		...actualPaper,
		List: {
			...actualPaper.List,
			Item: (props: any) => {
				// Simplified List.Item mock to render title and description for easier querying
				const View = require('react-native').View;
				const Text = require('react-native').Text;
				const title = typeof props.title === 'function' ? props.title({}) : props.title;
				const description = typeof props.description === 'function' ? props.description({}) : props.description;
				return (
					<View testID={props.testID || 'list-item'} onPress={props.onPress}>
						{props.left && props.left({})}
						<View>
							{typeof title === 'string' ? <Text>{title}</Text> : title}
							{typeof description === 'string' ? <Text>{description}</Text> : description}
						</View>
						{props.right && props.right({})}
					</View>
				);
			}
		},
		ActivityIndicator: (props: any) => {
			const View = require('react-native').View;
			return <View testID="activity-indicator" {...props} />;
		},
		Icon: (props: any) => { // Mock Icon if used directly and not via specific named icons
			const View = require('react-native').View;
			const Text = require('react-native').Text; // To display source prop for verification
			return <View testID={`mock-icon-${props.source}`} {...props}><Text>{props.source}</Text></View>;
		},
	};
});

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({
			navigate: mockNavigate,
		}),
	};
});

// Simplified test data - focus on structure, not exact values
const mockProfileTokens: ProfileCoin[] = [
	{
		mintAddress: "So11111111111111111111111111111111111111112",
		amount: 100,
		price: 50,
		value: 5000,
		coin: {
			mintAddress: "So11111111111111111111111111111111111111112",
			name: "Solana",
			symbol: "SOL",
			decimals: 9,
			description: "Solana blockchain",
			resolvedIconUrl: "https://example.com/sol.png",
			tags: ["layer-1"],
			price: 100,
			dailyVolume: 1000000,
			createdAt: new Date(),
			change24h: 5.5,
			website: 'https://solana.com',
			twitter: 'https://twitter.com/solana',
			telegram: '',
		}
	},
	{
		mintAddress: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
		amount: 1000,
		price: 0.1,
		value: 100,
		coin: {
			mintAddress: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
			name: "Pwease",
			symbol: "PWEASE",
			decimals: 6,
			description: "Pwease token",
			resolvedIconUrl: "https://example.com/pwease.png",
			tags: ["meme"],
			price: 0.5,
			dailyVolume: 500000,
			createdAt: new Date(),
			change24h: -2.3,
			website: 'https://pwease.com',
			twitter: 'https://twitter.com/pwease',
			telegram: '',
		}
	}
];

const mockWallet = {
	address: 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R',
};

import { useTransactionsStore } from '@/store/transactions'; // Import for typing mock
import { Transaction } from '@/types';

describe('Profile Screen', () => {
	const showToastMock = jest.fn();
	let consoleLogSpy: jest.SpyInstance;

	// Default mock state for transactions store
	const mockDefaultTransactionsState = {
		transactions: [],
		isLoading: false,
		error: null,
		fetchRecentTransactions: jest.fn(),
		hasFetched: false,
		totalCount: 0,
		clearTransactions: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

		// Setup default mocks for stores
		mocked(usePortfolioStore).mockReturnValue({
			wallet: mockWallet,
			tokens: mockProfileTokens,
			fetchPortfolioBalance: jest.fn(),
			isLoading: false,
		});
		mocked(useTransactionsStore).mockReturnValue(mockDefaultTransactionsState);

		mocked(useToast).mockReturnValue({
			showToast: showToastMock,
			hideToast: jest.fn(),
		});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it('renders basic profile structure and token display correctly', () => {
		const { getAllByTestId, getByTestId, getByText } = render(
			<NavigationContainer>
				<ProfileScreen />
			</NavigationContainer>
		);

		expect(getByText('Portfolio')).toBeTruthy(); // Header
		expect(getByText(new RegExp(mockWallet.address.substring(0, 6)))).toBeTruthy(); // Wallet address
		expect(getByText('Your Tokens')).toBeTruthy(); // Tokens section title

		// Verify tokens are rendered
		mockProfileTokens.forEach(token => {
			const card = getAllByTestId(`coin-card-${token.mintAddress}`)[0];
			expect(card).toBeTruthy();
		});
	});

	it('handles empty wallet state correctly', () => {
		mocked(usePortfolioStore).mockReturnValue({
			wallet: null,
			tokens: [],
			fetchPortfolioBalance: jest.fn(),
			isLoading: false,
		});

		const { getByText } = render(
			<NavigationContainer>
				<ProfileScreen />
			</NavigationContainer>
		);
		expect(getByText('No Wallet Connected')).toBeTruthy();
	});

	describe('Recent Transactions Section', () => {
		it('renders the "Recent Transactions" title', () => {
			const { getByText } = render(
				<NavigationContainer>
					<ProfileScreen />
				</NavigationContainer>
			);
			expect(getByText('Recent Transactions')).toBeTruthy();
		});

		it('shows loading indicator when transactions are loading', () => {
			mocked(useTransactionsStore).mockReturnValue({
				...mockDefaultTransactionsState,
				isLoading: true,
				hasFetched: false, // Or true, depending on when loading is shown
			});
			const { getByTestId } = render(
				<NavigationContainer>
					<ProfileScreen />
				</NavigationContainer>
			);
			expect(getByTestId('activity-indicator')).toBeTruthy();
		});

		it('shows error message when transactions fetch fails', () => {
			const errorMessage = 'Failed to fetch transactions';
			mocked(useTransactionsStore).mockReturnValue({
				...mockDefaultTransactionsState,
				error: errorMessage,
				hasFetched: true,
			});
			const { getByText } = render(
				<NavigationContainer>
					<ProfileScreen />
				</NavigationContainer>
			);
			expect(getByText('Error Loading Transactions')).toBeTruthy();
			expect(getByText(errorMessage)).toBeTruthy();
		});

		it('shows empty state message when no transactions and hasFetched is true', () => {
			mocked(useTransactionsStore).mockReturnValue({
				...mockDefaultTransactionsState,
				transactions: [],
				hasFetched: true,
			});
			const { getByText } = render(
				<NavigationContainer>
					<ProfileScreen />
				</NavigationContainer>
			);
			expect(getByText('No Transactions Yet')).toBeTruthy();
			expect(getByText(/Your transaction history will appear here/)).toBeTruthy();
		});

		it('renders transaction items correctly', () => {
			const mockTx: Transaction[] = [
				{ id: 'tx1', type: 'SWAP', fromCoinSymbol: 'SOL', toCoinSymbol: 'USDC', amount: 10, status: 'COMPLETED', date: new Date().toISOString(), transactionHash: 'hash1' },
				{ id: 'tx2', type: 'TRANSFER', fromCoinSymbol: 'BTC', toCoinSymbol: '', amount: 0.5, status: 'PENDING', date: new Date().toISOString(), transactionHash: 'hash2' },
			];
			mocked(useTransactionsStore).mockReturnValue({
				...mockDefaultTransactionsState,
				transactions: mockTx,
				totalCount: mockTx.length,
				hasFetched: true,
			});

			const { getByText, getAllByTestId } = render(
				<NavigationContainer>
					<ProfileScreen />
				</NavigationContainer>
			);

			// Check for rendered transaction items (List.Item mock is simplified)
			const listItems = getAllByTestId('list-item');
			expect(listItems).toHaveLength(mockTx.length);

			// Check content of the first transaction (example)
			// Note: This depends heavily on how List.Item mock renders title/description
			// And how the actual ProfileScreen formats these.
			// The mock for List.Item renders title and description as Text if they are strings.
			// If they are complex components, more specific querying or adjustments to mock are needed.
			expect(getByText(/Swap SOL for USDC/i)).toBeTruthy();
			expect(getByText(/COMPLETED/i)).toBeTruthy();

			expect(getByText(/Transfer 0.5 BTC/i)).toBeTruthy(); // Assuming amount & symbol are in title for transfers
			expect(getByText(/PENDING/i)).toBeTruthy();
		});
	});
});
