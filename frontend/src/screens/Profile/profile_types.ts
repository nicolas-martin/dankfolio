import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/index';
import { Coin } from '@/types';

// Profile screen doesn't receive any params
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// For screens that navigate to Profile
export type ProfileScreenNavigationProp = ProfileScreenProps['navigation'];

export interface ProfileCoin {
	id: string;
	amount: number;
	price: number;
	value: number;
	coin: Coin;
}
