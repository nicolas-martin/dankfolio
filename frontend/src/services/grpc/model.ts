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

export interface CreateWalletResponse {
	public_key: string;
	secret_key: string;
	mnemonic: string;
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

export interface Token {
	mintAddress: string;
	symbol: string;
	name: string;
	decimals: number;
	logoURI: string;
	coingeckoId?: string;
	priceUSD: number;
	marketCapUSD: number;
	volume24h: number;
	priceChange24h: number;
	lastUpdatedAt: string;
	tags?: string[];
}

export interface SearchTokensRequest {
	query: string;
	tags?: string[];
	minVolume24h?: number;
	limit?: number;
	offset?: number;
	sortBy?: string;
	sortDesc?: boolean;
}

export interface SearchTokensResponse {
	tokens: Token[];
}

export interface SearchTokenByMintRequest {
	mintAddress: string;
}

export interface SearchTokenByMintResponse {
	token?: Token;
}
