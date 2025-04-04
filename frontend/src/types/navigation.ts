import { Coin } from './index';

export type RootStackParamList = {
	Splash: undefined;
	Home: undefined;
	Profile: undefined;
	CoinDetail: {
		coin: Coin;
		fromScreen: string;
	};
	Trade: {
		initialFromCoin: Coin;
		initialToCoin: Coin;
	};
}; 
