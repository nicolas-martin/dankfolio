import { Coin, PriceData } from '@/types';

export interface ExtendedCoin extends Coin {
	balance?: number;
	value?: number;
}

export interface TokenListCardProps {
	title?: string;
	coins: (Coin | ExtendedCoin)[];
	priceHistories?: Record<string, PriceData[]>;
	isLoadingPriceHistories?: Record<string, boolean>;
	onCoinPress: (coin: Coin | ExtendedCoin) => void;
	showSparkline?: boolean;
	showBalanceAndValue?: boolean;
	noHorizontalMargin?: boolean;
	noRoundedCorners?: boolean;
	testIdPrefix?: string;
}

export interface TokenListItemProps {
	coin: Coin | ExtendedCoin;
	onPress: (coin: Coin | ExtendedCoin) => void;
	priceHistory?: PriceData[];
	isPriceHistoryLoading?: boolean;
	showSparkline?: boolean;
	showBalanceAndValue?: boolean;
	isLastItem?: boolean;
	testIdPrefix?: string;
}
