import { Coin } from '@/types';
import { PriceData } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import usePriceHistoryCacheStore from '@/store/priceHistoryCache'; // Import the cache store
import { TimeframeOption } from './coindetail_types';
import { GetPriceHistoryRequest_PriceHistoryType } from '@/gen/dankfolio/v1/price_pb';
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

export const TIMEFRAME_CONFIG: Record<string, { granularity: GetPriceHistoryRequest_PriceHistoryType, durationMs: number, roundingMinutes: number }> = {
	"1H": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE, durationMs: 1 * 60 * 60 * 1000, roundingMinutes: 1 },
	"4H": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE, durationMs: 4 * 60 * 60 * 1000, roundingMinutes: 1 },
	"1D": { granularity: GetPriceHistoryRequest_PriceHistoryType.FIVE_MINUTE, durationMs: 24 * 60 * 60 * 1000, roundingMinutes: 5 },
	"1W": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_HOUR, durationMs: 7 * 24 * 60 * 60 * 1000, roundingMinutes: 60 },
	"1M": { granularity: GetPriceHistoryRequest_PriceHistoryType.FOUR_HOUR, durationMs: 30 * 24 * 60 * 60 * 1000, roundingMinutes: 240 }, // 4 hours
	"1Y": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_DAY, durationMs: 365 * 24 * 60 * 60 * 1000, roundingMinutes: 1440 }, // 1 day
	// Default for any other case, though UI should restrict to above
	"DEFAULT": { granularity: GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE, durationMs: 4 * 60 * 60 * 1000, roundingMinutes: 1 },
};

// Helper function to round date down to the nearest interval
export function roundDateDown(dateToRound: Date, granularityMinutes: number): Date {
	const msInMinute = 60 * 1000;
	const dateInMs = dateToRound.getTime();

	const roundedMs = Math.floor(dateInMs / (granularityMinutes * msInMinute)) * (granularityMinutes * msInMinute);

	const roundedDate = new Date(roundedMs);

	// Zero out seconds and milliseconds, as Math.floor might not perfectly align if granularityMinutes is large
	// For smaller granularities like 1 or 5 minutes, this is more of a safeguard.
	// For larger granularities like 60 minutes (1 hour) or 240 minutes (4 hours),
	// the Math.floor on minutes (or hours derived from minutes) effectively handles this.
	roundedDate.setSeconds(0, 0);

	return roundedDate;
}


export const fetchPriceHistory = async (
	selectedTimeframeValue: string, // e.g., "1H", "4H"
	setLoading: (loading: boolean) => void,
	setPriceHistory: (history: PriceData[]) => void,
	coin: Coin | null,
	isInitialLoad: boolean = false
) => {
	try {
		if (isInitialLoad) {
			setLoading(true);
		}
		if (!coin) {
			logger.error('No coin provided for price history', { functionName: 'fetchPriceHistory' });
			setPriceHistory([]);
			if (isInitialLoad) setLoading(false); // Ensure loading is stopped if returning early
			return;
		}

		const cacheKey = `${coin.mintAddress}-${selectedTimeframeValue}`;
		const cachedEntry = usePriceHistoryCacheStore.getState().getCache(cacheKey);

		if (cachedEntry) {
			logger.info(`Using cached price history for ${cacheKey}`, { functionName: 'fetchPriceHistory' });
			setPriceHistory(cachedEntry.data as PriceData[]); // Assuming data is PriceData[]
			setLoading(false); // Stop loading as we found data in cache
			return;
		}

		// Cache miss, proceed to fetch
		logger.info(`Cache miss for ${cacheKey}, fetching new price history.`, { functionName: 'fetchPriceHistory' });
		// If not initial load, we might want to set loading true here if not already set by isInitialLoad
		// However, the original logic sets loading only on isInitialLoad at the top.
		// For a fetch operation, it's typical to set loading to true.
		if (!isInitialLoad) { // If it's a refresh, not an initial load, also set loading
			setLoading(true);
		}


		const config = TIMEFRAME_CONFIG[selectedTimeframeValue] || TIMEFRAME_CONFIG["DEFAULT"];
		const { durationMs, roundingMinutes } = config; // roundingMinutes is used for cache expiry calculation

		const currentTime = new Date();
		let dateTo = new Date(currentTime);
		let dateFrom = new Date(currentTime.getTime() - durationMs);

		const roundedTimeTo = roundDateDown(dateTo, roundingMinutes);
		const roundedTimeFrom = roundDateDown(dateFrom, roundingMinutes);

		const timeToISO = roundedTimeTo.toISOString();
		const timeFromISO = roundedTimeFrom.toISOString();


		// Find the key in typeMap (grpcApi.ts) that corresponds to the enum value
		const typeMap = GetPriceHistoryRequest_PriceHistoryType;
		const grpcTypeKey = Object.keys(typeMap).find(key => typeMap[key as keyof typeof typeMap] === config.granularity);


		if (!grpcTypeKey) {
			logger.error(`Invalid granularity type for timeframe: ${selectedTimeframeValue}`, { functionName: 'fetchPriceHistory' });
			setPriceHistory([]);
			setLoading(false);
			return;
		}

		const response = await grpcApi.getPriceHistory(
			coin.mintAddress,
			grpcTypeKey, // Pass the string key e.g. "ONE_MINUTE"
			timeFromISO,
			timeToISO,
			"token"
		);
		if (response?.data?.items) {
			const mapped: PriceData[] = response.data.items
				.filter(item => item.value !== null && item.unixTime !== null)
				.map(item => ({
					timestamp: new Date(item.unixTime * 1000).toISOString(),
					value: item.value,
					unixTime: item.unixTime // Keep unixTime if needed by PriceData, or remove if not
				}));
				
			setPriceHistory(mapped);

			// Cache the newly fetched data
			const cacheExpiryMs = Date.now() + roundingMinutes * 60 * 1000;
			usePriceHistoryCacheStore.getState().setCache(cacheKey, mapped, cacheExpiryMs);
			logger.info(`Cached new price history for ${cacheKey} with expiry ${new Date(cacheExpiryMs).toISOString()}`, { functionName: 'fetchPriceHistory' });

		} else {
			setPriceHistory([]);
		}
	} catch (error) {
		logger.exception(error, { functionName: 'fetchPriceHistory', params: { coinMintAddress: coin?.mintAddress, timeframe: selectedTimeframeValue } });
		setPriceHistory([]);
	} finally {
		// setLoading(false) is called regardless of success or failure,
		// or if data came from cache (handled earlier) or fetch.
		// If cache hit, setLoading(false) was already called.
		// If cache miss, it's called here.
		setLoading(false);
	}
};

export const handleTradeNavigation = async (
	toCoin: Coin | null,
	fromCoin: Coin | null,
	showToast: (params: ToastParams) => void,
	navigate: (screen: string, params: any) => void
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
		} catch (error: any) {
			logger.warn('Failed to get SOL coin during trade navigation.', { error: error.message, functionName: 'handleTradeNavigation' });
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
