import { Coin, PriceData } from '@/types/index';
import grpcApi from '@/services/grpcApi';
import { TimeframeOption } from './coindetail_types';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastParams {
	type: ToastType;
	message: string;
	txHash?: string;
}

export const TIMEFRAMES: TimeframeOption[] = [
	{ label: "15m", value: "15m" },
	{ label: "1H", value: "1H" },
	{ label: "4H", value: "4H" },
	{ label: "1D", value: "1D" },
];

export const fetchPriceHistory = async (
	timeframe: string,
	setLoading: (loading: boolean) => void,
	setPriceHistory: (history: PriceData[]) => void,
	coin: Coin | null,
	isInitialLoad: boolean = false
) => {
	try {
		// Only set loading on initial load
		if (isInitialLoad) {
			setLoading(true);
		}

		// If no coin is provided, we can't fetch the price history
		if (!coin) {
			console.error('❌ No coin provided for price history');
			setPriceHistory([]);
			return;
		}

		// Calculate the date range based on the timeframe
		const now = new Date();
		let startDate = new Date(now);
		const points = 100;

		switch (timeframe) {
			case '15m':
				startDate = new Date(now.getTime() - points * 15 * 60 * 1000);
				break;
			case '1H':
				startDate = new Date(now.getTime() - points * 60 * 60 * 1000);
				break;
			case '4H':
				startDate = new Date(now.getTime() - points * 4 * 60 * 60 * 1000);
				break;
			case '1D':
				startDate = new Date(now.getTime() - points * 24 * 60 * 60 * 1000);
				break;
			case '1W':
				startDate = new Date(now.getTime() - points * 7 * 24 * 60 * 60 * 1000);
				break;
			default:
				throw new Error(`Invalid timeframe: ${timeframe}`);
		}

		// Format dates in RFC3339 format
		const time_to = now.toISOString();
		const time_from = startDate.toISOString();

		const response = await grpcApi.getPriceHistory(
			coin.id,
			timeframe,
			time_from, // Changed order: time_from should be first (earlier date)
			time_to,   // time_to should be second (later date)
			"token"
		);

		if (response?.data?.items) {
			const mapped: PriceData[] = response.data.items
				.filter(item => item.value !== null && item.unixTime !== null)
				.map(item => ({
					timestamp: new Date(item.unixTime * 1000).toISOString(),
					value: item.value,
					unixTime: item.unixTime
				}));
			setPriceHistory(mapped);
		} else {
			setPriceHistory([]);
		}
	} catch (error) {
		console.error("Error fetching price history:", error);
		setPriceHistory([]);
	} finally {
		setLoading(false);
	}
};

export const handleTradeNavigation = (
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

	if (fromCoin) {
		// Prevent trading the same coin
		if (toCoin.id === fromCoin.id) {
			showToast({
				type: 'error',
				message: 'Cannot trade a coin for itself'
			});
			return;
		}

		navigate('Trade', {
			initialFromCoin: fromCoin,
			initialToCoin: toCoin
		});
	} else {
		navigate('Trade', {
			initialFromCoin: null,
			initialToCoin: toCoin
		});
	}
};
