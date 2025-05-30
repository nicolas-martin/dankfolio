import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import TokenSelector from './index';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { Coin } from '@/types';

// Mock the stores
jest.mock('@store/portfolio');
jest.mock('@store/coins');

// Mock CachedImage component
jest.mock('@/components/Common/CachedImage', () => ({
	CachedImage: ({ uri, testID }: { uri?: string; testID?: string }) => {
		const { View } = require('react-native');
		return <View testID={testID || 'cached-image'} />;
	},
}));

const mockCoin: Coin = {
	mintAddress: 'So11111111111111111111111111111111111111112',
	symbol: 'SOL',
	name: 'Solana',
	resolvedIconUrl: 'https://example.com/sol.png',
	decimals: 9,
	price: 100,
	change24h: 5.5,
	dailyVolume: 1000000,
	description: 'Solana blockchain',
	website: 'https://solana.com',
	twitter: 'https://twitter.com/solana',
	telegram: '',
	tags: ['layer-1'],
	createdAt: new Date(),
};

describe('TokenSelector', () => {
	beforeEach(() => {
		// Reset and set up store mocks for each test
		(usePortfolioStore as unknown as jest.Mock).mockReset();
		(usePortfolioStore as unknown as jest.Mock).mockImplementation(() => ({
			tokens: [],
		}));

		(useCoinStore as unknown as jest.Mock).mockReset();
		(useCoinStore as unknown as jest.Mock).mockImplementation(() => ({
			availableCoins: [mockCoin],
		}));
	});

	const renderWithProvider = (component: React.ReactElement) => {
		return render(
			<PaperProvider>
				{component}
			</PaperProvider>
		);
	};

	it('renders correctly with default props', () => {
		const { getByText } = renderWithProvider(
			<TokenSelector
				selectedToken={undefined}
				onSelectToken={jest.fn()}
				label="Select Token"
			/>
		);

		expect(getByText('Select Token')).toBeTruthy();
	});

	it('displays selected token information', () => {
		const { getByText } = renderWithProvider(
			<TokenSelector
				selectedToken={mockCoin}
				onSelectToken={jest.fn()}
				label="Select Token"
			/>
		);

		expect(getByText('SOL')).toBeTruthy();
	});

	it('opens modal when pressed', async () => {
		const { getByPlaceholderText, getByTestId } = renderWithProvider(
			<TokenSelector
				selectedToken={undefined}
				onSelectToken={jest.fn()}
				label="Select Token"
				testID="token-selector"
			/>
		);

		fireEvent.press(getByTestId('token-selector'));

		await waitFor(() => {
			expect(getByPlaceholderText('Search tokens')).toBeTruthy();
		});
	});

	it('calls onSelectToken when a token is selected', async () => {
		const mockOnSelectToken = jest.fn();
		const { getByText, getByTestId } = renderWithProvider(
			<TokenSelector
				selectedToken={undefined}
				onSelectToken={mockOnSelectToken}
				label="Select Token"
				testID="token-selector"
			/>
		);

		fireEvent.press(getByTestId('token-selector'));

		await waitFor(() => {
			expect(getByText('SOL')).toBeTruthy();
		});

		fireEvent.press(getByText('SOL'));

		expect(mockOnSelectToken).toHaveBeenCalledWith(mockCoin);
	});
});
