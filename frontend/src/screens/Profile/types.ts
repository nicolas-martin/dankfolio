import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/index';

export type ProfileScreenNavigationProp = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export interface ProfileData {
    username: string;
    email: string;
    walletAddress: string;
    balance: number;
    transactions: Transaction[];
}

export interface Transaction {
    id: string;
    type: 'buy' | 'sell';
    amount: number;
    coin: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
} 