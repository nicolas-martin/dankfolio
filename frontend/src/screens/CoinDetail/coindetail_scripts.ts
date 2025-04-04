import { Coin, PriceData } from '@/types/index';
import api from '@/services/api';
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

		const time_from = Math.floor(Date.now() / 1000);
		const points = 100;
		var durationPerPoint = 900;

		switch (timeframe) {
			case '15m':
				durationPerPoint = 900;
				break;
			case '1H':
				durationPerPoint = 3600;
				break;
			case '4H':
				durationPerPoint = 14400;
				break;
			case '1D':
				durationPerPoint = 86400;
				break;
			case '1W':
				durationPerPoint = 604800;
				break;
			default:
				throw new Error(`Invalid timeframe: ${timeframe}`);
		}

		const time_to = time_from - (points * durationPerPoint);

		const response = await api.getPriceHistory(
			coin.id,
			timeframe,
			time_to.toString(),
			time_from.toString(),
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
