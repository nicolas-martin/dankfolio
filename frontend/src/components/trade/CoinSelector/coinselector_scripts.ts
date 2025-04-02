import { Coin } from '../../../types/index';
import { WalletBalanceResponse, TokenInfo } from '../../../services/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const DEFAULT_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export const getCoinIcon = (coinObj?: Coin): string => {
	if (!coinObj) return DEFAULT_ICON;
	return coinObj.icon_url || DEFAULT_ICON;
};

const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

export const renderCoinBalance = (coin: Coin, walletBalance: WalletBalanceResponse | null) => {
	let coinBalanceAmount = 0; // Amount in standard units
	const coinDecimals = coin?.decimals ?? 0;

	if (walletBalance && coin) {
		if (coin.id === SOL_MINT_ADDRESS) {
			// Handle SOL specifically (balance is in Lamports)
			const balanceInLamports = walletBalance.sol_balance || 0;
			coinBalanceAmount = balanceInLamports / LAMPORTS_PER_SOL;
		} else if (walletBalance.tokens) {
			// Handle other tokens (balance assumed to be in standard units)
			const tokenInfo = walletBalance.tokens.find((token: TokenInfo) => token.id === coin.id);
			if (tokenInfo) {
				// Assume tokenInfo.balance is already in standard units
				coinBalanceAmount = tokenInfo.balance || 0;
			}
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
