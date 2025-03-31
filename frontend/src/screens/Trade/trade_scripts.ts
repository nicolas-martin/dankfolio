// import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin } from '../../types/index';
import api from '../../services/api';
import { buildAndSignSwapTransaction, getKeypairFromPrivateKey } from '../../services/solana';
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
	console.log(fromCoin)

	try {
		setQuoteLoading(true);
		const rawAmount = toRawAmount(amount, fromCoin.decimals)

		const response = await api.getTradeQuote(fromCoin.id, toCoin.id, rawAmount);

		setToAmount(response.estimatedAmount.toString());

		// Format fee values using fromCoin's decimals
		const formattedGasFee = toRawAmount(response.fee.gas, fromCoin.decimals);
		const formattedSpread = toRawAmount(response.fee.spread, fromCoin.decimals);
		const formattedTotal = toRawAmount(response.fee.total, fromCoin.decimals);

		setTradeDetails({
			exchangeRate: response.exchangeRate,
			gasFee: formattedGasFee,
			spread: formattedSpread,
			total: formattedTotal
		});
	} catch (error) {
		console.error('Error fetching trade quote:', error);
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

		// Get keypair from private key
		// TODO: FETCH FROM STORAGE
		const keypair = getKeypairFromPrivateKey(process.env.TEST_PRIVATE_KEY);

		// Convert fromAmount to raw amount
		const rawAmount = toRawAmount(fromAmount, fromCoin.decimals);

		// Build and sign the swap transaction
		const txHash = await buildAndSignSwapTransaction(
			fromCoin.id,
			toCoin.id,
			parseFloat(rawAmount),
			0.5, // Default slippage
			{ address: keypair.publicKey.toString(), privateKey: keypair.secretKey.toString(), balance: 0, publicKey: keypair.publicKey.toString() }
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
