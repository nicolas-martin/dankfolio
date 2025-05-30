export interface Coin {
	mintAddress: string;
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	resolvedIconUrl?: string;
	tags: string[];
	price: number;
	dailyVolume: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	coingeckoId?: string;
	createdAt?: Date;
	lastUpdated?: Date;
	jupiterListedAt?: Date; // New field
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

export interface CoinTransferPrepareRequest {
	fromAddress: string;
	toAddress: string;
	coinMint?: string; // Optional, empty for SOL
	amount: number;
}

export interface CoinTransferPrepareResponse {
	unsignedTransaction: string;
}

export interface CoinTransferSubmitRequest {
	signedTransaction: string;
	unsignedTransaction: string; // used to retreive the record
}

export interface CreateWalletResponse {
	public_key: string;
	secret_key: string;
	mnemonic: string;
}

export interface CoinTransferResponse {
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
	fromCoinMintAddress: string;
	toCoinMintAddress: string;
	amount: number;
	signedTransaction: string;
	unsignedTransaction: string; // used to retreive the record
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

export type SearchSortByOption =
	| "name"
	| "symbol"
	| "price"
	| "volume24h"
	| "marketcap"
	| "created_at"
	| "last_updated"
	| "listed_at";

export interface SearchCoinsRequest {
	query: string;
	tags?: string[];
	minVolume24h?: number;
	limit?: number;
	offset?: number;
	sortBy?: SearchSortByOption; // Updated type
	sortDesc?: boolean;
}

export interface SearchCoinsResponse {
	coins: Coin[];
}

export interface SearchCoinByMintRequest {
	mintAddress: string;
}

export interface SearchCoinByMintResponse {
	coin?: Coin;
}

export interface PrepareSwapRequest {
	fromCoinId: string;
	toCoinId: string;
	amount: string;
	slippageBps: string;
	userPublicKey: string;
}

export interface API {
	getAvailableCoins: (trendingOnly?: boolean) => Promise<Coin[]>;
	getCoinByID: (mintAddress: string) => Promise<Coin>;
	searchCoins: (params: SearchCoinsRequest) => Promise<SearchCoinsResponse>;
	searchCoinByMint: (mintAddress: string) => Promise<SearchCoinByMintResponse>;
	submitSwap: (payload: TradePayload) => Promise<SubmitSwapResponse>;
	getSwapQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<SwapQuoteResponse>;
	getSwapStatus: (txHash: string) => Promise<TradeStatusResponse>;
	getPriceHistory: (address: string, type: string | number, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
	getCoinPrices: (coinIds: string[]) => Promise<Record<string, number>>;
	prepareCoinTransfer: (payload: CoinTransferPrepareRequest) => Promise<CoinTransferPrepareResponse>;
	submitCoinTransfer: (payload: CoinTransferSubmitRequest) => Promise<CoinTransferResponse>;
	createWallet: () => Promise<CreateWalletResponse>;
	getProxiedImage: (imageUrl: string) => Promise<GetProxiedImageResponse>;
	prepareSwap: (params: PrepareSwapRequest) => Promise<{ unsignedTransaction: string }>;
}

export interface GetProxiedImageResponse {
	imageData: string;
}

export interface SwapQuoteResponse {
	estimatedAmount: string;
	exchangeRate: string;
	fee: string;
	priceImpact: string;
	routePlan: string[];
	inputMint: string;
	outputMint: string;
}

export interface SubmitSwapResponse {
	transactionHash: string;
	tradeId: string;
}
