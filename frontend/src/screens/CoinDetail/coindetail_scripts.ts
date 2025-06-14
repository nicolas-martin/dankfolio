import { Coin } from '@/types';
import { logger } from '@/utils/logger';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastParams {
	type: ToastType;
	message: string;
	txHash?: string;
}

// TIMEFRAMES constant has been moved to frontend/src/utils/constants.ts
// export const TIMEFRAMES: TimeframeOption[] = [
// 	{ label: "1H", value: "1H" },
// 	{ label: "4H", value: "4H" },
// 	{ label: "1D", value: "1D" },
// 	{ label: "1W", value: "1W" },
// 	{ label: "1M", value: "1M" },
// ];

// fetchPriceHistory has been moved to grpcApi.ts and its logic integrated there.
// The CoinDetail screen now uses the usePriceHistory hook, which calls
// the updated grpcApi.getPriceHistory method.

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
