import { Coin } from '@/types';
import { logger } from '@/utils/logger';

export const handleTokenPress = (coin: Coin, onPress: (coin: Coin) => void) => {
	logger.info('[TokenListCard] Token pressed:', coin.symbol, coin.address);
	onPress(coin);
};
