import { coinClient, priceClient, tradeClient, utilityClient, walletClient } from './grpc/apiClient';
import * as grpcModel from './grpc/model';
import { Trade } from '../gen/dankfolio/v1/trade_pb';
import { GetPriceHistoryRequest_PriceHistoryType } from "@/gen/dankfolio/v1/price_pb";
import * as grpcUtils from './grpc/grpcUtils';
import { mapGrpcCoinToFrontendCoin } from './grpc/grpcUtils'; // Import the new mapper
import { Buffer } from 'buffer';

// Implementation of the API interface using gRPC
export const grpcApi: grpcModel.API = {
	submitSwap: async (payload: grpcModel.TradePayload): Promise<grpcModel.SubmitSwapResponse> => {

		const serviceName = "TradeService";
		const methodName = "submitSwap";
		try {
			grpcUtils.logRequest(serviceName, methodName, payload);
			if (payload.unsignedTransaction === '' || payload.signedTransaction === '') {
				throw new Error('unsigned and signed transaction cannot be empty');
			}

			const headers = grpcUtils.getRequestHeaders();
			const response = await tradeClient.submitSwap({
				fromCoinId: payload.fromCoinMintAddress,
				toCoinId: payload.toCoinMintAddress,
				amount: payload.amount,
				signedTransaction: payload.signedTransaction,
				unsignedTransaction: payload.unsignedTransaction
			}, { headers });

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				transactionHash: response.transactionHash,
				tradeId: response.tradeId
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				// Handle cases where the thrown value is not an Error object
				console.error("An unknown error occurred:", error);
				// You might want to throw a generic error or handle it differently
				throw new Error("An unknown error occurred in submitSwap");
			}
		}
	},

	getSwapStatus: async (txHash: string): Promise<grpcModel.TradeStatusResponse> => {
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getSwapStatus");
			}
		}
	},

	getAvailableCoins: async (trendingOnly?: boolean): Promise<grpcModel.Coin[]> => {
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
			return response.coins.map(mapGrpcCoinToFrontendCoin);
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getAvailableCoins");
			}
		}
	},

	getSwapQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<grpcModel.SwapQuoteResponse> => {
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getSwapQuote");
			}
		}
	},

	getPriceHistory: async (address: string, type: string, timeStr: string, addressType: string): Promise<grpcModel.PriceHistoryResponse> => {
		const serviceName = 'PriceService';
		const methodName = 'getPriceHistory';
		try {
			console.log('[grpcApi] 📤 getPriceHistory REQUEST:', {
				address,
				type,
				timeStr,
				addressType,
				timestamp: new Date().toISOString()
			});

			grpcUtils.logRequest(serviceName, methodName, { address, type, timeStr, addressType });

			const timetimestamp = grpcUtils.convertToTimestamp(timeStr);
			const typeMap: { [key: string]: GetPriceHistoryRequest_PriceHistoryType; } = {
				"1m": GetPriceHistoryRequest_PriceHistoryType.ONE_MINUTE,
				"3m": GetPriceHistoryRequest_PriceHistoryType.THREE_MINUTE,
				"5m": GetPriceHistoryRequest_PriceHistoryType.FIVE_MINUTE,
				"15m": GetPriceHistoryRequest_PriceHistoryType.FIFTEEN_MINUTE,
				"30m": GetPriceHistoryRequest_PriceHistoryType.THIRTY_MINUTE,
				"1H": GetPriceHistoryRequest_PriceHistoryType.ONE_HOUR,
				"2H": GetPriceHistoryRequest_PriceHistoryType.TWO_HOUR,
				"4H": GetPriceHistoryRequest_PriceHistoryType.FOUR_HOUR,
				"6H": GetPriceHistoryRequest_PriceHistoryType.SIX_HOUR,
				"8H": GetPriceHistoryRequest_PriceHistoryType.EIGHT_HOUR,
				"12H": GetPriceHistoryRequest_PriceHistoryType.TWELVE_HOUR,
				"1D": GetPriceHistoryRequest_PriceHistoryType.ONE_DAY,
				"3D": GetPriceHistoryRequest_PriceHistoryType.THREE_DAY,
				"1W": GetPriceHistoryRequest_PriceHistoryType.ONE_WEEK,
			};

			const priceHistoryType = typeMap[type] ?? GetPriceHistoryRequest_PriceHistoryType.PRICE_HISTORY_TYPE_UNSPECIFIED;

			const response = await priceClient.getPriceHistory({
				address: address,
				type: priceHistoryType,
				time: timetimestamp,
				addressType: addressType
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			// Convert the response to match the expected REST API structure
			const convertedResponse = {
				data: {
					items: response.data?.items.map(item => ({
						unixTime: Number(item.unixTime),
						value: item.value
					})) || []
				},
				success: response.success
			};


			return convertedResponse;
		} catch (error: unknown) {
			console.error('[grpcApi] ❌ getPriceHistory ERROR:', {
				error,
				address,
				type,
				timeStr,
				addressType
			});
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getPriceHistory");
			}
		}
	},

	getWalletBalance: async (address: string): Promise<grpcModel.WalletBalanceResponse> => {
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getWalletBalance");
			}
		}
	},

	getCoinByID: async (mintAddress: string): Promise<grpcModel.Coin> => {
		const serviceName = 'CoinService';
		const methodName = 'getCoinByID';
		try {
			grpcUtils.logRequest(serviceName, methodName, { mintAddress });

			const response = await coinClient.getCoinByID(
				{ mintAddress },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, response);

			return mapGrpcCoinToFrontendCoin(response);
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getCoinByID");
			}
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getCoinPrices");
			}
		}
	},

	prepareCoinTransfer: async (payload: grpcModel.CoinTransferPrepareRequest): Promise<grpcModel.CoinTransferPrepareResponse> => {
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in prepareCoinTransfer");
			}
		}
	},

	submitCoinTransfer: async (payload: grpcModel.CoinTransferSubmitRequest): Promise<grpcModel.CoinTransferResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'submitTransfer';
		try {
			grpcUtils.logRequest(serviceName, methodName, payload);

			const response = await walletClient.submitTransfer({
				signedTransaction: payload.signedTransaction,
				unsignedTransaction: payload.unsignedTransaction

			});

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				transactionHash: response.transactionHash
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in submitCoinTransfer");
			}
		}
	},

	searchCoins: async (params: grpcModel.SearchCoinsRequest): Promise<grpcModel.SearchCoinsResponse> => {
		const serviceName = 'CoinService';
		const methodName = 'searchCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, params);

			const response = await coinClient.search(params);

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				coins: response.coins.map(mapGrpcCoinToFrontendCoin)
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in searchCoins");
			}
		}
	},

	searchCoinByMint: async (mintAddress: string): Promise<grpcModel.SearchCoinByMintResponse> => {
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
				coin: mapGrpcCoinToFrontendCoin(response.coin)
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in searchCoinByMint");
			}
		}
	},

	async createWallet(): Promise<grpcModel.CreateWalletResponse> {
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

		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in createWallet");
			}
		}
	},

	getProxiedImage: async (imageUrl: string): Promise<grpcModel.GetProxiedImageResponse> => {
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
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getProxiedImage");
			}
		}
	},

	prepareSwap: async ({ fromCoinId, toCoinId, amount, slippageBps, userPublicKey }: {
		fromCoinId: string;
		toCoinId: string;
		amount: string;
		slippageBps: string;
		userPublicKey: string;
	}): Promise<{ unsignedTransaction: string }> => {
		const serviceName = 'TradeService';
		const methodName = 'prepareSwap';
		try {
			grpcUtils.logRequest(serviceName, methodName, { fromCoinId, toCoinId, amount, slippageBps, userPublicKey });
			const response = await tradeClient.prepareSwap({
				fromCoinId,
				toCoinId,
				amount,
				slippageBps,
				userPublicKey
			}, { headers: grpcUtils.getRequestHeaders() });
			grpcUtils.logResponse(serviceName, methodName, response);
			return { unsignedTransaction: response.unsignedTransaction };
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in prepareSwap");
			}
		}
	},

	listTrades: async ({
		userId,
		limit = 10,
		offset = 0,
		sortBy = "created_at",
		sortDesc = true,
	}: grpcModel.ListTradesRequest): Promise<grpcModel.ListTradesResponse> => {
		const serviceName = "TradeService";
		const methodName = "listTrades";
		try {
			grpcUtils.logRequest(serviceName, methodName, { userId, limit, offset, sortBy, sortDesc });

			const response = await tradeClient.listTrades(
				{
					userId,
					limit,
					offset,
					sortBy,
					sortDesc,
				},
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, response);

			const transactions: grpcModel.Transaction[] = response.trades.map((trade: Trade) => {
				const type: 'SWAP' | 'TRANSFER' | 'UNKNOWN' =
					trade.type === 'SWAP' ? 'SWAP' :
						trade.type === 'TRANSFER' ? 'TRANSFER' : 'UNKNOWN';

				const status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN' =
					trade.status === 'PENDING' ? 'PENDING' :
						trade.status === 'COMPLETED' ? 'COMPLETED' :
							trade.status === 'FAILED' ? 'FAILED' : 'UNKNOWN';

				return {
					id: trade.id,
					type,
					fromCoinSymbol: trade.fromCoinId, // Placeholder
					toCoinSymbol: trade.toCoinId, // Placeholder
					amount: trade.amount,
					status,
					date: trade.createdAt ? new Date(Number(trade.createdAt.seconds) * 1000).toISOString() : "",
					transactionHash: trade.transactionHash,
				};
			});

			return {
				transactions,
				totalCount: response.totalCount,
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in listTrades");
			}
		}
	},
};
