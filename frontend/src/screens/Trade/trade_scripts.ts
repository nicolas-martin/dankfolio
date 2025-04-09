// import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coin, Wallet } from '@/types';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';

import api from '@/services/api';
import { buildAndSignSwapTransaction } from '@/services/solana';
import { toRawAmount } from '../../utils/numberFormat';
// import { usePortfolioStore } from '@/store/portfolio'; // No longer needed here
export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 500;

// Function to get prices for multiple tokens in a single API call
export const getTokenPrices = async (tokenIds: string[]): Promise<Record<string, number>> => {
	try {
		return await api.getTokenPrices(tokenIds);
	} catch (error) {
		console.error('❌ Error fetching token prices:', error);
		return Object.fromEntries(tokenIds.map(id => [id, 0]));
	}
};

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

		// Get latest prices for both coins in a single API call
		const prices = await getTokenPrices([fromCoin.id, toCoin.id]);
		fromCoin.price = prices[fromCoin.id];
		toCoin.price = prices[toCoin.id];

		const rawAmount = toRawAmount(amount, fromCoin.decimals);
		console.log('📊 Trade Quote Request:', {
			amount,
			rawAmount,
			fromCoin: {
				symbol: fromCoin.symbol,
				decimals: fromCoin.decimals,
				price: fromCoin.price
			},
			toCoin: {
				symbol: toCoin.symbol,
				decimals: toCoin.decimals,
				price: toCoin.price
			}
		});

		const response = await api.getTradeQuote(fromCoin.id, toCoin.id, rawAmount);
		console.log('📬 Trade Quote Response:', response);

		setToAmount(response.estimatedAmount);

		setTradeDetails({
			exchangeRate: response.exchangeRate,
			gasFee: response.fee,
			priceImpactPct: response.priceImpact,
			totalFee: response.fee,
			route: response.routePlan.join(' → ')
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

// New function to handle only the signing part
export const signTradeTransaction = async (
	fromCoin: Coin,
	toCoin: Coin,
	amount: string,
	slippage: number,
	wallet: Wallet
): Promise<string> => {
	console.log('🔑 Signing trade transaction:', {
		fromCoin: fromCoin.symbol,
		toCoin: toCoin.symbol,
		amount,
		slippage,
		walletAddress: wallet.address,
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

	console.log('✅ Transaction signed.');
	return signedTransaction;
};

// Removed handleTrade function as its logic is moved to the screen component
