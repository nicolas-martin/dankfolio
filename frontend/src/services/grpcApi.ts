import { tradeClient, coinClient, priceClient, walletClient } from './grpc/apiClient';
import { GetPriceHistoryRequest_PriceHistoryType } from "@/gen/dankfolio/v1/price_pb";
import { Timestamp, timestampFromDate } from '@bufbuild/protobuf/wkt';
import {
	Coin,
	TradePayload,
	TradeQuoteResponse,
	WalletBalanceResponse,
	PriceHistoryResponse,
	SubmitTradeResponse,
	TradeStatusResponse,
	TokenTransferPrepareRequest,
	TokenTransferPrepareResponse,
	TokenTransferSubmitRequest,
	TokenTransferResponse
} from './api';

// Helper function to safely serialize objects with BigInt values
const safeStringify = (obj: any, indent = 2): string => {
	return JSON.stringify(obj, (_, value) =>
		typeof value === 'bigint' ? value.toString() + 'n' : value
		, indent);
};

// Logger functions for consistent request/response logging
const logRequest = (serviceName: string, methodName: string, params: any): void => {
	console.log(`📤 gRPC ${serviceName}.${methodName} Request:`, safeStringify(params));
};

const logResponse = (serviceName: string, methodName: string, response: any): void => {
	console.log(`📥 gRPC ${serviceName}.${methodName} Response:`, safeStringify(response));
};

const logError = (serviceName: string, methodName: string, error: any): void => {
	console.error(`❌ gRPC ${serviceName}.${methodName} Error:`, safeStringify({
		message: error.message || 'Unknown error',
		code: error.code,
		data: error.metadata ? (typeof error.metadata.toObject === 'function' ? error.metadata.toObject() : error.metadata) : undefined
	}));
};

// Interface matching the REST API
interface API {
	submitSwap: (payload: TradePayload) => Promise<SubmitTradeResponse>;
	getSwapStatus: (txHash: string) => Promise<TradeStatusResponse>;
	getAvailableCoins: (trendingOnly?: boolean) => Promise<Coin[]>;
	getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
	getPriceHistory: (address: string, type: string | number, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
	getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
	getCoinByID: (id: string) => Promise<Coin>;
	getTokenPrices: (tokenIds: string[]) => Promise<Record<string, number>>;
	prepareTokenTransfer: (payload: TokenTransferPrepareRequest) => Promise<TokenTransferPrepareResponse>;
	submitTokenTransfer: (payload: TokenTransferSubmitRequest) => Promise<TokenTransferResponse>;
}

// Helper to convert timestamp strings to Timestamp objects
const convertToTimestamp = (dateString: string): Timestamp => {
	try {
		// Use the more reliable timestampFromDate API
		return timestampFromDate(new Date(dateString));
	} catch (error) {
		throw new Error(`Invalid date string: ${dateString}`);
	}
};

// Error handling
interface ErrorDetails {
	message: string;
	status?: number;
	data?: any;
	code?: number;
}

const handleGrpcError = (error: any, serviceName: string, methodName: string): never => {
	const errorDetails: ErrorDetails = {
		message: error.message || 'Unknown error',
		code: error.code,
		data: undefined, // Initialize as undefined
	};

	// Safely access metadata if it exists and has a toObject method
	try {
		if (error.metadata && typeof error.metadata.toObject === 'function') {
			errorDetails.data = error.metadata.toObject();
		} else if (error.metadata) {
			// If metadata exists but doesn't have toObject method
			errorDetails.data = error.metadata;
		}
	} catch (metadataError) {
		console.error('Error accessing metadata:', metadataError);
	}

	// Log the error with the service and method name for better tracing
	logError(serviceName, methodName, error);

	throw errorDetails;
};

// Implementation of the API interface using gRPC
const grpcApi: API = {
	submitSwap: async (payload: TradePayload): Promise<SubmitTradeResponse> => {
		const serviceName = "TradeService";
		const methodName = "submitTrade";
		try {
			logRequest(serviceName, methodName, payload);

			const response = await tradeClient.submitTrade({
				fromCoinId: payload.from_coin_id,
				toCoinId: payload.to_coin_id,
				amount: payload.amount,
				signedTransaction: payload.signed_transaction
			});

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				trade_id: response.tradeId,
				transaction_hash: response.transactionHash
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getSwapStatus: async (txHash: string): Promise<TradeStatusResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'getTradeStatus';
		try {
			logRequest(serviceName, methodName, { txHash });

			const headers = new Headers();
			headers.set("X-Debug-Mode", "true");

			const response = await tradeClient.getTradeStatus(
				{ transactionHash: txHash },
				{ headers }
			);

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				transaction_hash: txHash,
				status: response.status,
				confirmations: response.confirmations,
				finalized: response.finalized,
				error: response.error
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getAvailableCoins: async (trendingOnly?: boolean): Promise<Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getAvailableCoins';
		try {
			logRequest(serviceName, methodName, { trendingOnly });

			const response = await coinClient.getAvailableCoins({ trendingOnly });

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return response.coins.map(coin => ({
				id: coin.id,
				name: coin.name,
				symbol: coin.symbol,
				decimals: coin.decimals,
				description: coin.description,
				icon_url: coin.iconUrl,
				tags: coin.tags,
				price: coin.price,
				daily_volume: coin.dailyVolume,
				website: coin.website,
				twitter: coin.twitter,
				telegram: coin.telegram,
				coingecko_id: coin.coingeckoId,
				created_at: coin.createdAt ? new Date(Number(coin.createdAt.seconds) * 1000).toISOString() : new Date().toISOString(),
				last_updated: coin.lastUpdated ? new Date(Number(coin.lastUpdated.seconds) * 1000).toISOString() : undefined,
			}));
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getTradeQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<TradeQuoteResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'getTradeQuote';
		try {
			logRequest(serviceName, methodName, { fromCoin, toCoin, amount });

			const response = await tradeClient.getTradeQuote({
				fromCoinId: fromCoin,
				toCoinId: toCoin,
				amount: amount
			});

			logResponse(serviceName, methodName, response);

			// Return the response directly as it matches the expected structure
			return {
				estimatedAmount: response.estimatedAmount,
				exchangeRate: response.exchangeRate,
				fee: response.fee,
				priceImpact: response.priceImpact,
				routePlan: response.routePlan,
				inputMint: response.inputMint,
				outputMint: response.outputMint
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getPriceHistory: async (address: string, type: string, timeFrom: string, timeTo: string, addressType: string): Promise<PriceHistoryResponse> => {
		const serviceName = 'PriceService';
		const methodName = 'getPriceHistory';
		try {
			logRequest(serviceName, methodName, { address, type, timeFrom, timeTo, addressType });

			// Convert timeFrom and timeTo to timestamps without fallbacks
			const fromTimestamp = convertToTimestamp(timeFrom);
			const toTimestamp = convertToTimestamp(timeTo);
			const typeMap: { [key: string]: GetPriceHistoryRequest_PriceHistoryType } = {
				"ONE_MINUTE": GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE,
				"THREE_MINUTE": GetPriceHistoryRequest_PriceHistoryType.THREE_MINUTE,
				"FIVE_MINUTE": GetPriceHistoryRequest_PriceHistoryType.FIVE_MINUTE,
				"FIFTEEN_MINUTE": GetPriceHistoryRequest_PriceHistoryType.FIFTEEN_MINUTE,
				"THIRTY_MINUTE": GetPriceHistoryRequest_PriceHistoryType.THIRTY_MINUTE,
				"ONE_HOUR": GetPriceHistoryRequest_PriceHistoryType.ONE_HOUR,
				"TWO_HOUR": GetPriceHistoryRequest_PriceHistoryType.TWO_HOUR,
				"FOUR_HOUR": GetPriceHistoryRequest_PriceHistoryType.FOUR_HOUR,
				"SIX_HOUR": GetPriceHistoryRequest_PriceHistoryType.SIX_HOUR,
				"EIGHT_HOUR": GetPriceHistoryRequest_PriceHistoryType.EIGHT_HOUR,
				"TWELVE_HOUR": GetPriceHistoryRequest_PriceHistoryType.TWELVE_HOUR,
				"ONE_DAY": GetPriceHistoryRequest_PriceHistoryType.ONE_DAY,
				"THREE_DAY": GetPriceHistoryRequest_PriceHistoryType.THREE_DAY,
				"ONE_WEEK": GetPriceHistoryRequest_PriceHistoryType.ONE_WEEK,
			};

			const priceHistoryType = typeMap[type] ?? GetPriceHistoryRequest_PriceHistoryType.PRICE_HISTORY_TYPE_UNSPECIFIED;

			const response = await priceClient.getPriceHistory({
				address: address,
				type: priceHistoryType,
				timeFrom: fromTimestamp,
				timeTo: toTimestamp,
				addressType: addressType
			});

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				data: {
					items: response.data?.items.map(item => ({
						unixTime: Number(item.unixTime),
						value: item.value
					})) || []
				},
				success: response.success
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getWalletBalance: async (address: string): Promise<WalletBalanceResponse> => {
		const serviceName = 'WalletService';
		const methodName = 'getWalletBalances';
		try {
			logRequest(serviceName, methodName, { address });

			const response = await walletClient.getWalletBalances({ address });

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				balances: response.walletBalance?.balances.map(balance => ({
					id: balance.id,
					amount: balance.amount
				})) || []
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getCoinByID: async (id: string): Promise<Coin> => {
		const serviceName = 'CoinService';
		const methodName = 'getCoinByID';
		try {
			logRequest(serviceName, methodName, { id });

			const response = await coinClient.getCoinByID({ id });

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				id: response.id,
				name: response.name,
				symbol: response.symbol,
				decimals: response.decimals,
				description: response.description,
				icon_url: response.iconUrl,
				tags: response.tags,
				price: response.price,
				daily_volume: response.dailyVolume,
				website: response.website,
				twitter: response.twitter,
				telegram: response.telegram,
				coingecko_id: response.coingeckoId,
				created_at: response.createdAt ? new Date(Number(response.createdAt.seconds) * 1000).toISOString() : new Date().toISOString(),
				last_updated: response.lastUpdated ? new Date(Number(response.lastUpdated.seconds) * 1000).toISOString() : undefined,
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	getTokenPrices: async (tokenIds: string[]): Promise<Record<string, number>> => {
		const serviceName = 'TradeService';
		const methodName = 'getTokenPrices';
		try {
			logRequest(serviceName, methodName, { tokenIds });

			const response = await tradeClient.getTokenPrices({ tokenIds });

			logResponse(serviceName, methodName, response);

			// The response structure is already a map of token IDs to prices
			return response.prices;
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	prepareTokenTransfer: async (payload: TokenTransferPrepareRequest): Promise<TokenTransferPrepareResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'prepareTransfer';
		try {
			logRequest(serviceName, methodName, payload);

			const response = await tradeClient.prepareTransfer({
				fromAddress: payload.fromAddress,
				toAddress: payload.toAddress,
				tokenMint: payload.tokenMint || '',
				amount: payload.amount
			});

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				unsignedTransaction: response.unsignedTransaction
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	},

	submitTokenTransfer: async (payload: TokenTransferSubmitRequest): Promise<TokenTransferResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'submitTransfer';
		try {
			logRequest(serviceName, methodName, payload);

			const response = await tradeClient.submitTransfer({
				signedTransaction: payload.signedTransaction
			});

			logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				transactionHash: response.transactionHash
			};
		} catch (error) {
			return handleGrpcError(error, serviceName, methodName);
		}
	}
};

export default grpcApi;
