import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ProfileScreen from './index';
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

// Mock TokenCard component
jest.mock('./TokenCard', () => ({
	TokenCard: ({ profileCoin, onPress }: { profileCoin: ProfileCoin; onPress: () => void }) => (
		require('react-native').View.render({
			testID: `token-card-${profileCoin.id}`,
			onPress,
			children: `$${profileCoin.value.toFixed(2)}`
		})
	)
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
	Icon: () => 'MockedIcon',
}));

// Mock react-native-vector-icons/MaterialCommunityIcons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

// Mock react-native-paper's Icon component
jest.mock('react-native-paper', () => {
  const actualPaper = jest.requireActual('react-native-paper');
  return {
    ...actualPaper,
    Icon: () => 'MockedPaperIcon',
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

// Test data based on actual API response
const mockProfileTokens: ProfileCoin[] = [
	{
		id: "So11111111111111111111111111111111111111112",
		amount: 0.046201915,
		price: 126.675682,
		value: 5.852816,
		coin: {
			id: "So11111111111111111111111111111111111111112",
			name: "Wrapped SOL",
			symbol: "SOL",
			decimals: 9,
			description: "Wrapped SOL (SOL) is a Solana token.",
			icon_url: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
			tags: ["verified", "community", "strict"],
			price: 126.675682,
			daily_volume: 651534477.8800015,
			created_at: "2023-01-01T00:00:00Z"
		}
	},
	{
		id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
		amount: 1.365125,
		price: 0.023736,
		value: 0.032402,
		coin: {
			id: "CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump",
			name: "PWEASE",
			symbol: "pwease",
			decimals: 6,
			description: "PWEASE (pwease) is a Solana token.",
			icon_url: "https://ipfs.io/ipfs/QmboNoCSu87DLgnqqf3LVWCUF2zZtzpSE5LtAa3tx8hUUG",
			tags: ["verified", "launchpad", "birdeye-trending", "community"],
			price: 0.023736,
			daily_volume: 9370569.942992656,
			created_at: "2023-01-01T00:00:00Z"
		}
	}
];

const mockWallet = {
	address: 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R',
};

describe('Profile Screen', () => {
	const showToastMock = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock portfolio store
		mocked(usePortfolioStore).mockReturnValue({
			wallet: mockWallet,
			tokens: mockProfileTokens,
		});

		// Mock toast
		mocked(useToast).mockReturnValue({
			showToast: showToastMock,
			hideToast: jest.fn(),
		});
	});

	it('renders tokens with correct values', () => {
		const { getAllByTestId, getByText, getByAltText } = render(
			<NavigationContainer>
				<ProfileScreen />
			</NavigationContainer>
		);

		// Verify tokens are present with correct values, icons, and names
		mockProfileTokens.forEach(token => {
			const card = getAllByTestId(`token-card-${token.id}`)[0];
			expect(card.props.children).toBe(`$${token.value.toFixed(2)}`);
			expect(getByText(token.coin.name)).toBeTruthy();
			expect(getByAltText(`${token.coin.name} icon`)).toBeTruthy();
		});
	});

	it('navigates to CoinDetail screen when token is pressed', () => {
		const { getByTestId } = render(
			<NavigationContainer>
				<Profile />
			</NavigationContainer>
		);

		// Press the SOL token card
		const solCard = getByTestId(`token-card-${mockProfileTokens[0].id}`);
		fireEvent.press(solCard);

		expect(mockNavigate).toHaveBeenCalledWith('CoinDetail', {
			coin: mockProfileTokens[0].coin,
		});
		expect(mockNavigate).toHaveBeenCalledTimes(1);
	});

	it('displays empty state when no wallet data is available', () => {
		// Mock empty portfolio
		mocked(usePortfolioStore).mockReturnValue({
			wallet: null,
			tokens: [],
		});

		const { getByText } = render(
			<NavigationContainer>
				<Profile />
			</NavigationContainer>
		);

		expect(getByText('No wallet data available')).toBeTruthy();
	});

	it('uses correct store hooks and call counts', () => {
		render(
			<NavigationContainer>
				<Profile />
			</NavigationContainer>
		);

		expect(usePortfolioStore).toHaveBeenCalledTimes(1);
		expect(useToast).toHaveBeenCalledTimes(1);
	});
});
