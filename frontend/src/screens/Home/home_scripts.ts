export const SOL_MINT = 'So11111111111111111111111111111111111111112';

import { Coin } from '@/types';
import { HomeScreenNavigationProp } from './home_types';

export const handleCoinPress = (coin: Coin, navigation: HomeScreenNavigationProp) => {
	navigation.navigate('CoinDetail', {
		coin
	});
};
