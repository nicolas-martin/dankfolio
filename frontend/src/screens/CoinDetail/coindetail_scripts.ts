import { Coin } from '@/types';
import { PriceData } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { TimeframeOption } from './coindetail_types';
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
	toCoin: Coin,
	navigate: (screen: string, params: unknown) => void
) => {
	logger.breadcrumb({
		category: 'navigation',
		message: 'Navigating to TradeScreen from CoinDetail',
		data: {
			toCoin: toCoin.symbol
		},
	});
	navigate('Trade', {
		initialToCoin: toCoin
	});
};
