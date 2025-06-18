export interface Coin {
	address: string;                    // Was: mintAddress (aligned with BirdEye)
	name: string;
	symbol: string;
	decimals: number;
	description: string;
	logoURI: string;                    // Was: iconUrl (aligned with BirdEye)
	resolvedIconUrl?: string;           // Keep for our internal optimization
	tags: string[];
	price: number;
	price24hChangePercent?: number;     // BirdEye standard
	marketcap?: number;                 // BirdEye uses lowercase
	volume24hUSD?: number;              // BirdEye standard (was: dailyVolume)
	volume24hChangePercent?: number;    // BirdEye standard
	liquidity?: number;
	fdv?: number;                       // BirdEye uses uppercase
	rank?: number;
	website?: string;
	twitter?: string;
	telegram?: string;
	discord?: string;                   // Add discord field
	createdAt?: Date;
	lastUpdated?: Date;
	jupiterListedAt?: Date;
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
	coinMint?: string;
	amount: number;
}

export interface CoinTransferPrepareResponse {
	unsignedTransaction: string;
}

export interface CoinTransferSubmitRequest {
	signedTransaction: string;
	unsignedTransaction: string;
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
	error?: unknown;
}

export interface TradePayload {
	fromCoinMintAddress: string;
	toCoinMintAddress: string;
	amount: number;
	signedTransaction: string;
	// used to retreive the record
	unsignedTransaction: string;
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
	| "volume_24h"
	| "market_cap"
	| "created_at"
	| "last_updated"
	| "jupiter_listed_at"
	| "price_change_percentage_24h";

export interface SearchRequest {
	query: string;
	tags?: string[];
	minVolume24h?: number;
	limit?: number;
	offset?: number;
	sortBy?: SearchSortByOption;
	sortDesc?: boolean;
}

export interface SearchResponse {
	coins: Coin[];
	totalCount: number;
}

export interface SearchCoinByAddressRequest {
	mintAddress: string;
}

export interface SearchCoinByAddressResponse {
	coin?: Coin;
}

export interface PrepareSwapRequest {
	fromCoinId: string;
	toCoinId: string;
	amount: string;
	slippageBps: string;
	userPublicKey: string;
}

export interface Transaction {
	id: string;
	type: 'SWAP' | 'TRANSFER' | 'UNKNOWN';
	fromCoinSymbol: string;
	toCoinSymbol: string;
	amount: number;
	status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
	date: string;
	transactionHash: string;
}

export interface ListTradesRequest {
	userId: string;
	limit?: number;
	offset?: number;
	sortBy?: string;
	sortDesc?: boolean;
}

export interface ListTradesResponse {
	transactions: Transaction[];
	totalCount: number;
}

export interface API {
	getAvailableCoins: (trendingOnly?: boolean) => Promise<Coin[]>;
	getCoinByID: (mintAddress: string) => Promise<Coin>;
	search: (params: SearchRequest) => Promise<SearchResponse>;
	searchCoinByAddress: (mintAddress: string) => Promise<SearchCoinByAddressResponse>;
	submitSwap: (payload: TradePayload) => Promise<SubmitSwapResponse>;
	getSwapQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<SwapQuoteResponse>;
	getSwapStatus: (txHash: string) => Promise<TradeStatusResponse>;
	getPriceHistory: (address: string, type: string, time: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
	getCoinPrices: (coinIds: string[]) => Promise<Record<string, number>>;
	prepareCoinTransfer: (payload: CoinTransferPrepareRequest) => Promise<CoinTransferPrepareResponse>;
	submitCoinTransfer: (payload: CoinTransferSubmitRequest) => Promise<CoinTransferResponse>;
	createWallet: () => Promise<CreateWalletResponse>;
	getProxiedImage: (imageUrl: string) => Promise<GetProxiedImageResponse>;
	prepareSwap: (params: PrepareSwapRequest) => Promise<{ unsignedTransaction: string }>;
	listTrades: (params: ListTradesRequest) => Promise<ListTradesResponse>;
	getFullSwapQuoteOrchestrated: (amount: string, fromCoin: Coin, toCoin: Coin) => Promise<FullSwapQuoteDetails>;
	getNewCoins: (limit?: number, offset?: number) => Promise<Coin[]>;
	getTrendingCoins: (limit?: number, offset?: number) => Promise<Coin[]>;
	getTopGainersCoins: (limit?: number, offset?: number) => Promise<Coin[]>;
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

export interface FullSwapQuoteDetails {
	estimatedAmount: string;
	exchangeRate: string;
	fee: string;
	priceImpactPct: string;
	totalFee: string;
	route: string;
}
