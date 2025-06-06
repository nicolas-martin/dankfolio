import { Coin, PriceData } from '@/types';

export interface CoinCardProps {
	coin: Coin;
	onPress: (coin: Coin) => void;
	balance?: number; // Assuming balance is optional as per original
	value?: number;   // Assuming value is optional
	isHorizontal?: boolean; // New prop
	priceHistory?: PriceData[];
	isPriceHistoryLoading?: boolean;
	showSparkline?: boolean; // Controls whether to show the sparkline chart
}
