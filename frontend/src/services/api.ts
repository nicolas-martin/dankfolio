import { REACT_APP_API_URL } from '@env';

if (!REACT_APP_API_URL) {
	throw new Error('REACT_APP_API_URL environment variable is required');
}

export interface Coin {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	icon_url: string;
	tags: string[];
	price: number;
	daily_volume: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	coingecko_id?: string;
	created_at: string;
	last_updated?: string;
}

export interface balance {
	id: string;
	amount: number;
}

export interface WalletBalanceResponse {
	balances: balance[];
}

export interface PriceHistoryResponse {
	data: {
		items: Array<{
			unixTime: number;
			value: number;
		}>;
	};
	success: boolean;
}

export interface TokenTransferPrepareRequest {
	fromAddress: string;
	toAddress: string;
	tokenMint?: string; // Optional, empty for SOL
	amount: number;
}

export interface TokenTransferPrepareResponse {
	unsignedTransaction: string;
}

export interface TokenTransferSubmitRequest {
	signedTransaction: string;
}

export interface TokenTransferResponse {
	transactionHash: string;
}

export interface SubmitTradeResponse {
	trade_id?: string; // Optional as per backend handler
	transaction_hash: string;
}

export interface TradeStatusResponse {
	transaction_hash: string;
	status: string; // e.g., "Pending", "Confirmed", "Finalized"
	confirmations: number;
	finalized: boolean;
	error?: any; // Include error details if the transaction failed
}

export interface TradePayload {
	from_coin_id: string;
	to_coin_id: string;
	amount: number;
	signed_transaction: string;
}

export interface TradeQuoteResponse {
	estimatedAmount: string;
	exchangeRate: string;
	fee: string;
	priceImpact: string;
	routePlan: string[];
	inputMint: string;
	outputMint: string;
}
