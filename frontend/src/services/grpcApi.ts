import { REACT_APP_API_URL } from '@env';
import { coinClient, priceClient, tradeClient, utilityClient, walletClient } from './grpc/apiClient';
import { API, Coin, SearchCoinsRequest, SearchCoinsResponse, SearchCoinByMintResponse, TradePayload, SubmitSwapResponse, SwapQuoteResponse, TradeStatusResponse, PriceHistoryResponse, WalletBalanceResponse, CoinTransferPrepareRequest, CoinTransferPrepareResponse, CoinTransferSubmitRequest, CoinTransferResponse, CreateWalletResponse, GetProxiedImageResponse } from './grpc/model';
import { DEBUG_MODE } from '@env';
import { GetPriceHistoryRequest_PriceHistoryType } from "@/gen/dankfolio/v1/price_pb";
import { Timestamp, timestampFromDate } from '@bufbuild/protobuf/wkt';
import * as grpcUtils from './grpc/grpcUtils';

if (!DEBUG_MODE) {
	console.log = () => { };
}

// Helper to convert timestamp strings to Timestamp objects
function convertToTimestamp(dateStr: string): Timestamp {
	return timestampFromDate(new Date(dateStr));
}

// Implementation of the API interface using gRPC
export const grpcApi: API = {
	submitSwap: async (payload: TradePayload): Promise<SubmitSwapResponse> => {
		const serviceName = "TradeService";
		const methodName = "submitSwap";
		try {
			grpcUtils.logRequest(serviceName, methodName, payload);

			const response = await tradeClient.submitSwap({
				fromCoinId: payload.fromCoinMintAddress,
				toCoinId: payload.toCoinMintAddress,
				amount: payload.amount,
				signedTransaction: payload.signedTransaction
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				transactionHash: response.transactionHash,
				tradeId: response.tradeId
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getSwapStatus: async (txHash: string): Promise<TradeStatusResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'getSwapStatus';
		try {
			grpcUtils.logRequest(serviceName, methodName, { txHash });

			const response = await tradeClient.getTrade(
				{ identifier: { case: 'transactionHash', value: txHash } },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				transaction_hash: txHash,
				status: response.status,
				confirmations: response.confirmations,
				finalized: response.finalized,
				error: response.error
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getAvailableCoins: async (trendingOnly?: boolean): Promise<Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getAvailableCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, { trendingOnly });

			const response = await coinClient.getAvailableCoins(
				{ trendingOnly },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, response);

			// Convert the response to match our frontend model
			return response.coins.map(coin => ({
				mintAddress: coin.mintAddress,
				name: coin.name,
				symbol: coin.symbol,
				decimals: coin.decimals,
				description: coin.description,
				iconUrl: coin.iconUrl,
				tags: coin.tags,
				price: coin.price,
				dailyVolume: coin.dailyVolume,
				website: coin.website,
				twitter: coin.twitter,
				telegram: coin.telegram,
				coingeckoId: coin.coingeckoId,
				createdAt: coin.createdAt ? new Date(Number(coin.createdAt.seconds) * 1000) : undefined,
				lastUpdated: coin.lastUpdated ? new Date(Number(coin.lastUpdated.seconds) * 1000) : undefined
			}));
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getSwapQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<SwapQuoteResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'getTradeQuote';
		try {
			grpcUtils.logRequest(serviceName, methodName, { fromCoin, toCoin, amount });

			const response = await tradeClient.getSwapQuote({
				fromCoinId: fromCoin,
				toCoinId: toCoin,
				amount: amount
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

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
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getPriceHistory: async (address: string, type: string, timeFrom: string, timeTo: string, addressType: string): Promise<PriceHistoryResponse> => {
		const serviceName = 'PriceService';
		const methodName = 'getPriceHistory';
		try {
			grpcUtils.logRequest(serviceName, methodName, { address, type, timeFrom, timeTo, addressType });

			// Convert timeFrom and timeTo to timestamps without fallbacks
			const fromTimestamp = convertToTimestamp(timeFrom);
			const toTimestamp = convertToTimestamp(timeTo);
			const typeMap: { [key: string]: GetPriceHistoryRequest_PriceHistoryType; } = {
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
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

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
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getWalletBalance: async (address: string): Promise<WalletBalanceResponse> => {
		const serviceName = 'WalletService';
		const methodName = 'getWalletBalances';
		if (address === '') {
			throw new Error('Address cannot be empty');
		}
		try {
			grpcUtils.logRequest(serviceName, methodName, { address });

			const response = await walletClient.getWalletBalances({ address }, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			return {
				balances: response.walletBalance?.balances.map(balance => ({
					id: balance.id,
					amount: balance.amount
				})) || []
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getCoinByID: async (mintAddress: string): Promise<Coin> => {
		const serviceName = 'CoinService';
		const methodName = 'getCoinByID';
		try {
			grpcUtils.logRequest(serviceName, methodName, { mintAddress });

			const response = await coinClient.getCoinByID(
				{ mintAddress },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				mintAddress: response.mintAddress,
				name: response.name,
				symbol: response.symbol,
				decimals: response.decimals,
				description: response.description,
				iconUrl: response.iconUrl,
				tags: response.tags,
				price: response.price,
				dailyVolume: response.dailyVolume,
				website: response.website,
				twitter: response.twitter,
				telegram: response.telegram,
				coingeckoId: response.coingeckoId,
				createdAt: response.createdAt ? new Date(Number(response.createdAt.seconds) * 1000) : undefined,
				lastUpdated: response.lastUpdated ? new Date(Number(response.lastUpdated.seconds) * 1000) : undefined
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getCoinPrices: async (coinIds: string[]): Promise<Record<string, number>> => {
		const serviceName = 'PriceService';
		const methodName = 'getCoinPrices';
		try {
			grpcUtils.logRequest(serviceName, methodName, { coinIds });

			const response = await priceClient.getCoinPrices(
				{ coinIds },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, response);

			return response.prices;
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	prepareCoinTransfer: async (payload: CoinTransferPrepareRequest): Promise<CoinTransferPrepareResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'prepareTransfer';
		try {
			grpcUtils.logRequest(serviceName, methodName, payload);

			const response = await walletClient.prepareTransfer({
				fromAddress: payload.fromAddress,
				toAddress: payload.toAddress,
				coinMint: payload.coinMint,
				amount: payload.amount
			});

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				unsignedTransaction: response.unsignedTransaction
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	submitCoinTransfer: async (payload: CoinTransferSubmitRequest): Promise<CoinTransferResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'submitTransfer';
		try {
			grpcUtils.logRequest(serviceName, methodName, payload);

			const response = await walletClient.submitTransfer({
				signedTransaction: payload.signedTransaction
			});

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				transactionHash: response.transactionHash
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	searchCoins: async (params: SearchCoinsRequest): Promise<SearchCoinsResponse> => {
		const serviceName = 'CoinService';
		const methodName = 'searchCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, params);

			const response = await coinClient.search(params);

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				coins: response.coins.map(coin => ({
					mintAddress: coin.mintAddress,
					name: coin.name,
					symbol: coin.symbol,
					decimals: coin.decimals,
					description: coin.description,
					iconUrl: coin.iconUrl,
					tags: coin.tags,
					price: coin.price,
					dailyVolume: coin.dailyVolume,
					website: coin.website,
					twitter: coin.twitter,
					telegram: coin.telegram,
					coingeckoId: coin.coingeckoId,
					createdAt: coin.createdAt ? new Date(Number(coin.createdAt.seconds) * 1000) : undefined,
					lastUpdated: coin.lastUpdated ? new Date(Number(coin.lastUpdated.seconds) * 1000) : undefined
				}))
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	searchCoinByMint: async (mintAddress: string): Promise<SearchCoinByMintResponse> => {
		const serviceName = 'CoinService';
		const methodName = 'searchCoinByMint';
		try {
			grpcUtils.logRequest(serviceName, methodName, { mintAddress });

			const response = await coinClient.searchCoinByMint({ mintAddress });

			grpcUtils.logResponse(serviceName, methodName, response);

			if (!response.coin) {
				return { coin: undefined };
			}

			return {
				coin: {
					mintAddress: response.coin.mintAddress,
					name: response.coin.name,
					symbol: response.coin.symbol,
					decimals: response.coin.decimals,
					description: response.coin.description,
					iconUrl: response.coin.iconUrl,
					tags: response.coin.tags,
					price: response.coin.price,
					dailyVolume: response.coin.dailyVolume,
					website: response.coin.website,
					twitter: response.coin.twitter,
					telegram: response.coin.telegram,
					coingeckoId: response.coin.coingeckoId,
					createdAt: response.coin.createdAt ? new Date(Number(response.coin.createdAt.seconds) * 1000) : undefined,
					lastUpdated: response.coin.lastUpdated ? new Date(Number(response.coin.lastUpdated.seconds) * 1000) : undefined
				}
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	async getTransferTransaction(params: {
		toAddress: string;
		coinMint: string;
		amount: string;
	}) {
		const serviceName = 'TradeService';
		const methodName = 'prepareTransfer';
		try {
			grpcUtils.logRequest(serviceName, methodName, params);

			const response = await walletClient.prepareTransfer({
				fromAddress: '',
				toAddress: params.toAddress,
				coinMint: params.coinMint,
				amount: parseFloat(params.amount)
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				unsignedTransaction: response.unsignedTransaction
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	async createWallet(): Promise<CreateWalletResponse> {
		const serviceName = 'WalletService';
		const methodName = 'createWallet';

		try {
			grpcUtils.logRequest(serviceName, methodName, {});

			const response = await walletClient.createWallet(
				{}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				public_key: response.publicKey,
				secret_key: response.secretKey,
				mnemonic: response.mnemonic
			}

		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getProxiedImage: async (imageUrl: string): Promise<GetProxiedImageResponse> => {
		const serviceName = "UtilityService";
		const methodName = "getProxiedImage";
		try {
			grpcUtils.logRequest(serviceName, methodName, { imageUrl });

			const response = await utilityClient.getProxiedImage(
				{ imageUrl },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			// grpcUtils.logResponse(serviceName, methodName, response);

			return {
				imageData: Buffer.from(response.imageData).toString('base64')
			};
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	prepareSwap: async ({ fromCoinId, toCoinId, amount, slippageBps, userPublicKey, fromAddress }: {
		fromCoinId: string;
		toCoinId: string;
		amount: string;
		slippageBps: string;
		userPublicKey: string;
		fromAddress: string;
	}): Promise<{ unsignedTransaction: string }> => {
		const serviceName = 'TradeService';
		const methodName = 'prepareSwap';
		try {
			grpcUtils.logRequest(serviceName, methodName, { fromCoinId, toCoinId, amount, slippageBps, userPublicKey, fromAddress });
			const response = await tradeClient.prepareSwap({
				fromCoinId,
				toCoinId,
				amount,
				slippageBps,
				userPublicKey,
				fromAddress
			}, { headers: grpcUtils.getRequestHeaders() });
			grpcUtils.logResponse(serviceName, methodName, response);
			return { unsignedTransaction: response.unsignedTransaction };
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	}
};
