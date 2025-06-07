import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';
import { NotificationProps } from '@/types/index';

export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

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

export interface NotificationState {
	visible: boolean;
	type: NotificationProps['type'];
	message: string;
}
