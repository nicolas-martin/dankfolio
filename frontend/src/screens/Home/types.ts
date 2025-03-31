import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/index';

export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface MarketData {
	id: string;
	name: string;
	symbol: string;
	current_price: number;
	price_change_percentage_24h: number;
	market_cap: number;
	total_volume: number;
	image: string;
}
