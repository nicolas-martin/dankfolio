// import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from '../../types/index';
import api from '../../services/api';
import { buildAndSignSwapTransaction, generateWallet, getKeypairFromPrivateKey, secureStorage } from '../../services/solana';
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

	console.log('🔄 Trade Quote Request:', {
		fromCoin: {
			symbol: fromCoin.symbol,
			decimals: fromCoin.decimals,
			price: fromCoin.price,
			id: fromCoin.id
		},
		toCoin: {
			symbol: toCoin.symbol,
			decimals: toCoin.decimals,
			price: toCoin.price,
			id: toCoin.id
		},
		amount,
	});

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
	fromAmount: string,
	toAmount: string,
	setIsSubmitting: (submitting: boolean) => void,
	showToast: (params: ToastProps) => void,
	navigate: (screen: string) => void
): Promise<void> => {
	if (!fromCoin || !toCoin || !fromAmount || !toAmount) {
		showToast({
			type: 'error',
			message: 'Please select coins and enter an amount'
		});
		return;
	}

	try {
		setIsSubmitting(true);

		const savedWallet = await secureStorage.getWallet();
		if (!savedWallet) {
			showToast({
				type: 'error',
				message: 'No wallet found'
			});
			return;
		}

		// Convert fromAmount to raw amount
		const rawAmount = toRawAmount(fromAmount, fromCoin.decimals);

		// Build and sign the swap transaction
		const txHash = await buildAndSignSwapTransaction(
			fromCoin.id,
			toCoin.id,
			parseFloat(rawAmount),
			0.5, // Default slippage
			savedWallet
		);

		showToast({
			type: 'success',
			message: 'Trade executed successfully! 🎉',
			txHash
		});

		// Navigate back to home screen
		navigate('Home');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		console.error('❌ Trade error:', errorMessage);
		showToast({
			type: 'error',
			message: `Trade failed: ${errorMessage}`
		});
	} finally {
		setIsSubmitting(false);
	}
};
