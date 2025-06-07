import { Coin } from '@/types';
import { PriceData } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { TimeframeOption } from './coindetail_types';
import { useCoinStore } from '@/store/coins';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { logger } from '@/utils/logger';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastParams {
	type: ToastType;
	message: string;
	txHash?: string;
}

export const TIMEFRAMES: TimeframeOption[] = [
	{ label: "1H", value: "1H" },
	{ label: "4H", value: "4H" },
	{ label: "1D", value: "1D" },
	{ label: "1W", value: "1W" },
	{ label: "1M", value: "1M" },
];

export const fetchPriceHistory = async (
	coin: Coin,
	timeframeValue: string, // e.g., "1H", "4H"
): Promise<{ data: PriceData[] | null; error: Error | null }> => {
	if (!coin || !coin.mintAddress) {
		const error = new Error('No coin or mint address provided for price history');
		logger.error(error.message, { functionName: 'fetchPriceHistory' });
		return { data: null, error };
	}

	const currentTime = new Date();

	try {
		const response = await grpcApi.getPriceHistory(
			coin.mintAddress,
			timeframeValue,
			currentTime.toISOString(), // Current time in seconds
			"token"
		);

		if (response?.data?.items) {
			const mapped: PriceData[] = response.data.items
				.filter(item => item.value !== null && item.unixTime !== null)
				.map(item => ({
					timestamp: new Date(item.unixTime * 1000).toISOString(),
					value: item.value,
					unixTime: item.unixTime,
				}));


			// Cache the newly fetched data
			// cacheExpiry is TTL in seconds for the store, not absolute timestamp
			return { data: mapped, error: null };

		} else {
			return { data: [], error: null }; // Return empty data if no items, not an error
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			logger.exception(error, {
				functionName: 'fetchPriceHistory',
				params: { coinMintAddress: coin.mintAddress, timeframe: timeframeValue }
			});
			return { data: null, error: error };
		} else {
			logger.error("An unknown error occurred in fetchPriceHistory:", error);
			return { data: null, error: new Error(`An unknown error occurred: ${error}`) };
		}
	}
};

export const handleTradeNavigation = async (
	toCoin: Coin | null,
	fromCoin: Coin | null,
	showToast: (params: ToastParams) => void,
	navigate: (screen: string, params: unknown) => void
) => {
	if (!toCoin) {
		showToast({
			type: 'error',
			message: 'Please select a coin to trade'
		});
		return;
	}
	let selectedFromCoin = fromCoin;
	if (!selectedFromCoin) {
		try {
			selectedFromCoin = await useCoinStore.getState().getCoinByID(SOLANA_ADDRESS);
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.warn('Failed to get SOL coin during trade navigation.', { error: error.message, functionName: 'handleTradeNavigation' });
			} else {
				logger.warn('An unknown error occurred while getting SOL coin during trade navigation.', { error, functionName: 'handleTradeNavigation' });
			}
		}
	}
	if (selectedFromCoin && toCoin.mintAddress === selectedFromCoin.mintAddress) {
		showToast({
			type: 'error',
			message: 'Cannot trade a coin for itself'
		});
		return;
	}
	logger.breadcrumb({
		category: 'navigation',
		message: 'Navigating to TradeScreen from CoinDetail',
		data: {
			fromCoin: selectedFromCoin?.symbol || 'N/A',
			toCoin: toCoin.symbol
		},
	});
	navigate('Trade', {
		initialFromCoin: selectedFromCoin,
		initialToCoin: toCoin
	});
};
