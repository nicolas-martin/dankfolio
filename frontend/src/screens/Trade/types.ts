import { Coin } from '@/types/index';
import { RouteProp, NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export type TradeScreenParams = {
	initialFromCoin?: Coin | null;
	initialToCoin?: Coin | null;
};

export type TradeScreenNavigationProp = NavigationProp<RootStackParamList>;
export type TradeScreenRouteProp = RouteProp<RootStackParamList, 'Trade'>;
