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
	logger.info(`[fetchPriceHistory] Starting request for ${coin.symbol} (${coin.mintAddress}) with timeframe ${timeframeValue}`);

	try {
		const response = await grpcApi.getPriceHistory(
			coin.mintAddress,
			timeframeValue,
			currentTime.toISOString(), // Current time in seconds
			"token"
		);

		logger.info(`[fetchPriceHistory] Raw gRPC response:`, {
			success: response?.success,
			itemCount: response?.data?.items?.length || 0,
			firstItem: response?.data?.items?.[0],
			lastItem: response?.data?.items?.[response?.data?.items?.length - 1]
		});

		if (response?.data?.items) {
			const mapped: PriceData[] = response.data.items
				.filter(item => item.value !== null && item.unixTime !== null)
				.map(item => ({
					timestamp: new Date(item.unixTime * 1000).toISOString(),
					value: item.value,
					unixTime: item.unixTime,
				}));

			logger.info(`[fetchPriceHistory] Mapped data:`, {
				originalCount: response.data.items.length,
				filteredCount: mapped.length,
				firstMapped: mapped[0],
				lastMapped: mapped[mapped.length - 1],
				sampleTimestamps: mapped.slice(0, 3).map(item => ({
					unixTime: item.unixTime,
					timestamp: item.timestamp,
					value: item.value
				}))
			});

			// Cache the newly fetched data
			// cacheExpiry is TTL in seconds for the store, not absolute timestamp
			return { data: mapped, error: null };

		} else {
			logger.warn(`[fetchPriceHistory] No items in response data`, { response });
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
