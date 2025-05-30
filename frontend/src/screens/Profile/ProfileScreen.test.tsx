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
	}
}));

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

describe('Profile Screen', () => {
	const showToastMock = jest.fn();
	let consoleLogSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
		mocked(usePortfolioStore).mockReturnValue({
			wallet: mockWallet,
			tokens: mockProfileTokens,
			fetchPortfolioBalance: jest.fn(),
			isLoading: false
		});
		mocked(useToast).mockReturnValue({
			showToast: showToastMock,
			hideToast: jest.fn(),
		});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	it('handles token display and interaction correctly', () => {
		const { getAllByTestId, getByTestId } = render(
			<NavigationContainer>
				<ProfileScreen />
			</NavigationContainer>
		);

		// Verify store hooks are called correctly
		expect(usePortfolioStore).toHaveBeenCalledTimes(1);
		expect(useToast).toHaveBeenCalledTimes(1);

		// Verify tokens are rendered correctly
		mockProfileTokens.forEach(token => {
			const card = getAllByTestId(`coin-card-${token.mintAddress}`)[0];
			const cardContent = within(card);

			// Check token details are displayed (don't assert exact formatting)
			expect(cardContent.getByText(new RegExp(`\\$.*${token.value}.*`))).toBeTruthy();
			expect(cardContent.getByText(token.coin.symbol)).toBeTruthy();
			expect(cardContent.getByLabelText(`${token.coin.name} icon`)).toBeTruthy();
			expect(cardContent.getByText(new RegExp(`.*${token.amount}.*${token.coin.symbol}`))).toBeTruthy();
		});

		// Test navigation on token press
		const solCard = getByTestId(`coin-card-${mockProfileTokens[0].mintAddress}`);
		fireEvent.press(solCard);

		expect(mockNavigate).toHaveBeenCalledWith('CoinDetail', {
			coin: mockProfileTokens[0].coin,
		});
	});

	it('handles empty wallet state correctly', () => {
		// Mock empty portfolio state
		mocked(usePortfolioStore).mockReturnValue({
			wallet: null,
			tokens: [],
		});

		const { getByText } = render(
			<NavigationContainer>
				<ProfileScreen />
			</NavigationContainer>
		);

		// Verify empty state message
		expect(getByText('No Wallet Connected')).toBeTruthy();

		// Verify store hooks are still called
		expect(usePortfolioStore).toHaveBeenCalledTimes(1);
		expect(useToast).toHaveBeenCalledTimes(1);
	});
});
