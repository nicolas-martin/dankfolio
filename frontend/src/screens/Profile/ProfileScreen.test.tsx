import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ProfileScreen from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useToast } from '@components/Common/Toast';
import { mocked } from 'jest-mock';
import Clipboard from '@react-native-clipboard/clipboard';
import { ProfileCoin } from './profile_types';

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

// Test data based on actual API response
const mockProfileTokens: ProfileCoin[] = [
	{
		mintAddress: "So11111111111111111111111111111111111111112",
		amount: 100,
		price: 50,
		value: 5000,
		coin: {
			mintAddress: "So11111111111111111111111111111111111111112",
			name: "Wrapped SOL",
			symbol: "SOL",
			decimals: 9,
			description: "Wrapped SOL (SOL) is a Solana token.",
			iconUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
			tags: ["verified", "community", "strict"],
			price: 126.675682,
			dailyVolume: 651534477.8800015,
			createdAt: new Date("2023-01-01T00:00:00Z")
		}
	},
	{
		mintAddress: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
		amount: 1000,
		price: 0.1,
		value: 100,
		coin: {
			mintAddress: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
			name: "PWEASE",
			symbol: "pwease",
			decimals: 6,
			description: "PWEASE (pwease) is a Solana token.",
			iconUrl: "https://ipfs.io/ipfs/QmboNoCSu87DLgnqqf3LVWCUF2zZtzpSE5LtAa3tx8hUUG",
			tags: ["verified", "launchpad", "birdeye-trending", "community"],
			price: 0.023736,
			dailyVolume: 9370569.942992656,
			createdAt: new Date("2023-01-01T00:00:00Z")
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
		const { getAllByTestId, getByText, getByTestId } = render(
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

			// Check token details are displayed correctly
			expect(cardContent.getByText(`$${token.value.toFixed(2)}`)).toBeTruthy();
			expect(cardContent.getByText(token.coin.symbol)).toBeTruthy();
			expect(cardContent.getByLabelText(`${token.coin.name} icon`)).toBeTruthy();
			expect(cardContent.getByText(`${token.amount} ${token.coin.symbol}`)).toBeTruthy();
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
