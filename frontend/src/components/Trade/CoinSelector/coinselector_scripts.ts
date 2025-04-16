import { Coin } from '@/types/index';
import { WalletBalanceResponse } from 'services/grpc/model';

export const DEFAULT_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export const getCoinIcon = (coinObj?: Coin): string => {
	if (!coinObj) return DEFAULT_ICON;
	return coinObj.icon_url || DEFAULT_ICON;
};

export const renderCoinBalance = (coin: Coin, walletBalance: WalletBalanceResponse | null) => {
	let coinBalanceAmount = 0; // Amount in standard units
	const coinDecimals = coin?.decimals ?? 0;

	if (walletBalance && coin && walletBalance.balances) {
		// Find the token (including SOL) in the tokens array
		const tokenInfo = walletBalance.balances.find(balance => balance.id === coin.id);
		if (tokenInfo) {
			// Balance is already in standard units for all tokens in the array
			coinBalanceAmount = tokenInfo.amount || 0;
		}
	}

	// Calculate the exact USD value using the standard unit balance amount
	const valueAmount = (coin?.price || 0) * coinBalanceAmount;

	// Format balance string based on coin's decimals
	const balanceString = coinBalanceAmount.toFixed(coinDecimals);

	return {
		balance: balanceString,
		value: valueAmount // Return raw number for value
	};
};
