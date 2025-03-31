import { Coin, RootStackParamList, } from '../../types/index';
import { WalletBalanceResponse } from '../../services/api';
import { ToastProps } from '../../components/Common/Toast/toast_types';
import Clipboard from '@react-native-clipboard/clipboard';
import { CoinDetailScreenNavigationProp } from '../CoinDetail/types';

export const calculateTotalValue = (
	walletBalance: WalletBalanceResponse,
	solCoin: Coin | null
): { tokenValue: number; solValue: number; totalValue: number } => {
	const tokenValue = walletBalance.tokens.reduce((sum, token) => sum + token.value, 0);
	const solValue = walletBalance.sol_balance * (solCoin?.price || 0);
	const totalValue = tokenValue + solValue;
	return { tokenValue, solValue, totalValue };
};

export const handleTokenPress = (
	token: Coin | null,
	solCoin: Coin | null,
	walletBalance: WalletBalanceResponse,
	navigate: CoinDetailScreenNavigationProp['navigate']
): void => {
	if (!token?.id) {
		console.error('❌ No token ID available for:', token?.symbol);
		return;
	}

	console.log('👛 ProfileScreen -> CoinDetail with coins:', {
		selectedCoin: {
			id: token.id,
			name: token.name,
			symbol: token.symbol,
			decimals: token.decimals,
			price: token.price,
			daily_volume: token.daily_volume,
			icon_url: token.icon_url,
			address: token.id
		},
		solCoin: solCoin ? {
			id: solCoin.id,
			symbol: solCoin.symbol,
			name: solCoin.name,
			decimals: solCoin.decimals,
			price: solCoin.price,
			icon_url: solCoin.icon_url,
			address: solCoin.id
		} : null
	});

	const navigationParams: RootStackParamList['CoinDetail'] = {
		coinId: token.id,
		coinName: token.name,
		daily_volume: token.daily_volume,
		coin: token || undefined,
		solCoin: solCoin || undefined,
		walletBalance
	};

	navigate('CoinDetail', navigationParams);
};

export const copyToClipboard = (
	text: string,
	symbol: string,
	showToast: (params: ToastProps) => void
): void => {
	Clipboard.setString(text);
	showToast({
		type: 'success',
		message: `${symbol} copied to clipboard! 📋`
	});
};

export const formatAddress = (address: string): string => {
	if (!address) return '';
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
