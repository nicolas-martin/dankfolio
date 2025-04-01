// import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin, Wallet, Base58PrivateKey } from '../../types/index';
import api from '../../services/api';
import { buildAndSignSwapTransaction } from '../../services/solana';
import { ToastProps } from '../../components/Common/Toast/toast_types';
import { toRawAmount } from 'utils/numberFormat';
import { TradeDetailsProps } from '../../components/Trade/TradeDetails/tradedetails_types';

export const MIN_AMOUNT = "0.0001";
export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 500;

export const fetchTradeQuote = async (
	amount: string,
	fromCoin: Coin,
	toCoin: Coin,
	setQuoteLoading: (loading: boolean) => void,
	setToAmount: (amount: string) => void,
	setTradeDetails: (details: TradeDetailsProps) => void,
) => {
	if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
		return;
	}

	try {
		setQuoteLoading(true);
		const rawAmount = toRawAmount(amount, fromCoin.decimals);

		const response = await api.getTradeQuote(fromCoin.id, toCoin.id, rawAmount);

		setToAmount(response.estimatedAmount.toString());

		const formattedGasFee = response.fee.gas;
		const formattedPriceImpact = response.fee.priceImpactPct;
		const formattedTotal = response.fee.total;

		setTradeDetails({
			exchangeRate: response.exchangeRate,
			gasFee: formattedGasFee,
			priceImpactPct: formattedPriceImpact,
			totalFee: formattedTotal
		});
	} catch (error) {
		console.error('❌ Error fetching trade quote:', error);
	} finally {
		setQuoteLoading(false);
	}
};

export const handleSwapCoins = (
	fromCoin: Coin,
	toCoin: Coin,
	setFromCoin: (coin: Coin) => void,
	setToCoin: (coin: Coin) => void,
	fromAmount: string,
	setFromAmount: (amount: string) => void,
	toAmount: string,
	setToAmount: (amount: string) => void
): void => {
	setFromCoin(toCoin);
	setToCoin(fromCoin);
	setFromAmount(toAmount);
	setToAmount(fromAmount);
};

export const handleTrade = async (
	fromCoin: Coin,
	toCoin: Coin,
	amount: string,
	slippage: number,
	wallet: Wallet,
	showNotification: (type: ToastProps['type'], message: string) => void,
	navigation: any
): Promise<void> => {
	try {
		console.log('🔄 Starting trade:', {
			fromCoin: fromCoin.symbol,
			toCoin: toCoin.symbol,
			amount,
			slippage,
			walletAddress: wallet.address,
			privateKeyType: 'Base58'  // Now we're explicit about the format
		});

		// Convert amount to raw units (lamports)
		const rawAmount = Number(toRawAmount(amount, fromCoin.decimals));

		// Build and sign the transaction
		const signedTransaction = await buildAndSignSwapTransaction(
			fromCoin.id,
			toCoin.id,
			rawAmount,
			slippage,
			wallet
		);

		// Execute the trade
		const response = await api.executeTrade({
			from_coin_id: fromCoin.id,
			to_coin_id: toCoin.id,
			amount: parseFloat(amount),
			signed_transaction: signedTransaction
		});

		if (response.transaction_hash) {
			showNotification('success', 'Trade executed successfully!');
			navigation.navigate('Home');
		} else {
			throw new Error('No transaction hash received');
		}
	} catch (error) {
		console.error('❌ Trade error:', error);
		showNotification('error', error.message || 'Failed to execute trade');
	}
};
