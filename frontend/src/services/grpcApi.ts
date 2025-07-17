import { coinClient, priceClient, tradeClient, utilityClient, walletClient } from './grpc/apiClient';
import * as grpcModel from './grpc/model';
import { Trade } from '@/gen/dankfolio/v1/trade_pb';
import { logger } from '@/utils/logger';
import { toRawAmount as commonToRawAmount } from '@/utils/numberFormat';
import { GetPriceHistoryRequest_PriceHistoryType } from "@/gen/dankfolio/v1/price_pb";
// Import the enum
import * as grpcUtils from './grpc/grpcUtils';
import { mapGrpcCoinToFrontendCoin } from './grpc/grpcUtils';
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
			// Always use handleGrpcError which internally uses getUserFriendlyTradeError for TradeService
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
			// Always use handleGrpcError which internally uses getUserFriendlyTradeError for TradeService
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getAvailableCoins: async (limit?: number, offset?: number): Promise<grpcModel.Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getAvailableCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, { limit, offset });

			const response = await coinClient.getAvailableCoins({
				limit: limit || 50,
				offset: offset || 0
			}, { headers: grpcUtils.getRequestHeaders() });

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

	getSwapQuote: async (fromCoin: string, toCoin: string, amount: string, includeFeeBreakdown: boolean = false, userPublicKey?: string, allowMultiHop: boolean = false): Promise<grpcModel.SwapQuoteResponse> => {
		const serviceName = 'TradeService';
		const methodName = 'getTradeQuote';
		try {
			grpcUtils.logRequest(serviceName, methodName, { fromCoin, toCoin, amount, includeFeeBreakdown, userPublicKey, allowMultiHop });

			const response = await tradeClient.getSwapQuote({
				fromCoinId: fromCoin,
				toCoinId: toCoin,
				amount: amount,
				includeFeeBreakdown: includeFeeBreakdown,
				userPublicKey: userPublicKey,
				allowMultiHop: allowMultiHop
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			// Convert SolFeeBreakdown from protobuf if available
			let solFeeBreakdown: grpcModel.SolFeeBreakdown | undefined;
			if (response.solFeeBreakdown) {
				solFeeBreakdown = {
					tradingFee: response.solFeeBreakdown.tradingFee,
					transactionFee: response.solFeeBreakdown.transactionFee,
					accountCreationFee: response.solFeeBreakdown.accountCreationFee,
					priorityFee: response.solFeeBreakdown.priorityFee,
					total: response.solFeeBreakdown.total,
					accountsToCreate: response.solFeeBreakdown.accountsToCreate,
				};
			}

			// Return the response with enhanced SOL fee breakdown
			return {
				estimatedAmount: response.estimatedAmount,
				exchangeRate: response.exchangeRate,
				fee: response.tradingFeeSol || "0", // Use tradingFeeSol as the fee field for backward compatibility
				priceImpact: response.priceImpact,
				routePlan: response.routePlan,
				inputMint: response.inputMint,
				outputMint: response.outputMint,
				solFeeBreakdown: solFeeBreakdown,
				totalSolRequired: response.totalSolRequired || "0",
				tradingFeeSol: response.tradingFeeSol || "0",
			};
		} catch (error: unknown) {
			// Always use handleGrpcError which internally uses getUserFriendlyTradeError for TradeService
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
				"1M": GetPriceHistoryRequest_PriceHistoryType.ONE_MONTH,
			};

			const priceHistoryType = typeMap[type] ?? GetPriceHistoryRequest_PriceHistoryType.PRICE_HISTORY_TYPE_UNSPECIFIED;

			const response = await priceClient.getPriceHistory({
				address: address,
				type: priceHistoryType,
				time: timeStr,
				addressType: addressType
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, response);

			// Convert the response to match PriceHistoryResponse expected by the API interface
			if (response?.data?.items) {
				return {
					data: {
						items: response.data.items
							.filter(item => item.value !== null && item.unixTime !== null)
							.map(item => ({
								unixTime: parseInt(item.unixTime, 10) * 1000, // Convert to milliseconds so components can use directly
								value: item.value,
							}))
					},
					success: true
				};
			} else {
				// Return empty response if no items
				return {
					data: { items: [] },
					success: false
				};
			}
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

	getPriceHistoriesByIDs: async (requests: grpcModel.PriceHistoryBatchRequest[]): Promise<grpcModel.PriceHistoryBatchResponse> => {
		const serviceName = 'PriceService';
		const methodName = 'getPriceHistoriesByIDs';
		try {
			console.log('[grpcApi] 📤 getPriceHistoriesByIDs REQUEST:', {
				requestCount: requests.length,
				addresses: requests.map(r => r.address),
				timestamp: new Date().toISOString()
			});

			grpcUtils.logRequest(serviceName, methodName, { requestCount: requests.length, requests });

			// Validate batch size limit (same as getCoinsByIDs)
			const maxBatchSize = 50;
			if (requests.length > maxBatchSize) {
				throw new Error(`Batch size ${requests.length} exceeds maximum allowed ${maxBatchSize}`);
			}

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
				"1M": GetPriceHistoryRequest_PriceHistoryType.ONE_MONTH,
			};

			// Convert frontend requests to protobuf format
			const protoRequests = requests.map(req => ({
				address: req.address,
				type: typeMap[req.type] ?? GetPriceHistoryRequest_PriceHistoryType.PRICE_HISTORY_TYPE_UNSPECIFIED,
				time: req.time,
				addressType: req.addressType
			}));

			const response = await priceClient.getPriceHistoriesByIDs({
				items: protoRequests
			}, { headers: grpcUtils.getRequestHeaders() });

			grpcUtils.logResponse(serviceName, methodName, {
				resultsCount: Object.keys(response.results).length,
				failedCount: response.failedAddresses.length
			});

			// Convert the response to match frontend model
			const results: Record<string, grpcModel.PriceHistoryBatchResult> = {};

			Object.entries(response.results).forEach(([address, result]) => {
				if (result.data?.items) {
					results[address] = {
						data: {
							items: result.data.items
								.filter(item => item.value !== null && item.unixTime !== null)
								.map(item => ({
									unixTime: parseInt(item.unixTime, 10) * 1000, // Convert to milliseconds
									value: item.value,
								}))
						},
						success: result.success,
						errorMessage: result.errorMessage
					};
				} else {
					results[address] = {
						data: { items: [] },
						success: false,
						errorMessage: result.errorMessage || 'No data returned'
					};
				}
			});

			return {
				results,
				failedAddresses: response.failedAddresses
			};
		} catch (error: unknown) {
			console.error('[grpcApi] ❌ getPriceHistoriesByIDs ERROR:', {
				error,
				requestCount: requests.length,
				addresses: requests.map(r => r.address)
			});
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getPriceHistoriesByIDs");
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

	getCoinByID: async (address: string): Promise<grpcModel.Coin> => {
		const serviceName = 'CoinService';
		const methodName = 'getCoinByID';
		try {
			grpcUtils.logRequest(serviceName, methodName, { address });

			const response = await coinClient.getCoinByID(
				{ address },
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

	getCoinsByIDs: async (addresses: string[]): Promise<grpcModel.Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getCoinsByIDs';
		try {
			grpcUtils.logRequest(serviceName, methodName, { addresses, count: addresses.length });

			// Validate batch size limit
			const maxBatchSize = 50;
			if (addresses.length > maxBatchSize) {
				throw new Error(`Batch size ${addresses.length} exceeds maximum allowed ${maxBatchSize}`);
			}

			const response = await coinClient.getCoinsByIDs(
				{ addresses },
				{ headers: grpcUtils.getRequestHeaders() }
			);

			grpcUtils.logResponse(serviceName, methodName, { ...response, returned_count: response.coins.length });

			// Convert the response to match our frontend model
			return response.coins.map(mapGrpcCoinToFrontendCoin);
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in getCoinsByIDs");
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

	search: async (params: grpcModel.SearchRequest): Promise<grpcModel.SearchResponse> => {
		const serviceName = 'CoinService';
		const methodName = 'search';
		try {
			grpcUtils.logRequest(serviceName, methodName, params);

			const grpcRequest = {
				query: params.query || "",
				limit: params.limit || 10,
				offset: params.offset || 0
			};

			const response = await coinClient.search(grpcRequest);

			grpcUtils.logResponse(serviceName, methodName, response);

			return {
				coins: response.coins.map(mapGrpcCoinToFrontendCoin),
				totalCount: response.totalCount,
			};
		} catch (error: unknown) {
			if (error instanceof Error) {
				return grpcUtils.handleGrpcError(error, serviceName, methodName);
			} else {
				console.error("An unknown error occurred:", error);
				throw new Error("An unknown error occurred in search");
			}
		}
	},

	searchCoinByAddress: async (address: string): Promise<grpcModel.SearchCoinByAddressResponse> => {
		const serviceName = 'CoinService';
		const methodName = 'searchCoinByAddress';
		try {
			grpcUtils.logRequest(serviceName, methodName, { address });

			const response = await coinClient.searchCoinByAddress({ address });

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
				throw new Error("An unknown error occurred in searchCoinByAddress");
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

	prepareSwap: async ({ fromCoinId, toCoinId, amount, slippageBps, userPublicKey, allowMultiHop = false }: {
		fromCoinId: string;
		toCoinId: string;
		amount: string;
		slippageBps: string;
		userPublicKey: string;
		allowMultiHop?: boolean;
	}): Promise<{ unsignedTransaction: string; solFeeBreakdown?: grpcModel.SolFeeBreakdown; totalSolRequired: string; tradingFeeSol: string }> => {
		const serviceName = 'TradeService';
		const methodName = 'prepareSwap';
		try {
			grpcUtils.logRequest(serviceName, methodName, { fromCoinId, toCoinId, amount, slippageBps, userPublicKey, allowMultiHop });
			const response = await tradeClient.prepareSwap({
				fromCoinId,
				toCoinId,
				amount,
				slippageBps,
				userPublicKey,
				allowMultiHop
			}, { headers: grpcUtils.getRequestHeaders() });
			grpcUtils.logResponse(serviceName, methodName, response);
			return {
				unsignedTransaction: response.unsignedTransaction,
				solFeeBreakdown: response.solFeeBreakdown,
				totalSolRequired: response.totalSolRequired,
				tradingFeeSol: response.tradingFeeSol
			};
		} catch (error: unknown) {
			// Always use handleGrpcError which internally uses getUserFriendlyTradeError for TradeService
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
					trade.status === 'pending' || trade.status === 'prepared' || trade.status === 'submitted' ? 'PENDING' :
						trade.status === 'finalized' || trade.status === 'confirmed' || trade.status === 'processed' ? 'COMPLETED' :
							trade.status === 'failed' ? 'FAILED' : 'UNKNOWN';

				return {
					id: trade.id,
					type,
					fromCoinSymbol: trade.coinSymbol || trade.fromCoinId, // Use coinSymbol if available
					toCoinSymbol: trade.toCoinId, // Will need to look up symbol from coin data
					fromCoinMintAddress: trade.fromCoinId, // fromCoinId is the mint address
					toCoinMintAddress: trade.toCoinId, // toCoinId is the mint address
					amount: trade.amount,
					price: trade.price, // Price per token at transaction time
					totalValue: trade.amount * trade.price, // Calculate total value
					status,
					date: trade.createdAt ? new Date(Number(trade.createdAt.seconds) * 1000).toISOString() : "",
					transactionHash: trade.transactionHash,
					fee: trade.fee,
					platformFeeAmount: trade.platformFeeAmount,
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

	// New method to orchestrate fetching full swap quote details
	getFullSwapQuoteOrchestrated: async (amount: string, fromCoin: grpcModel.Coin, toCoin: grpcModel.Coin, includeFeeBreakdown: boolean = false, userPublicKey?: string, allowMultiHop: boolean = false): Promise<grpcModel.FullSwapQuoteDetails> => {
		const serviceName = 'TradeService';
		const methodName = 'getFullSwapQuoteOrchestrated';
		try {
			grpcUtils.logRequest(serviceName, methodName, { amount, fromCoinSymbol: fromCoin.symbol, toCoinSymbol: toCoin.symbol, includeFeeBreakdown, userPublicKey, allowMultiHop });

			if (!fromCoin || !toCoin || !amount || parseFloat(amount) <= 0) {
				throw new Error("Invalid parameters for getFullSwapQuoteOrchestrated");
			}

			// 1. Get latest prices for both coins

			if (!fromCoin || !fromCoin.address) { throw new Error("Invalid or missing address for fromCoin in getFullSwapQuoteOrchestrated"); }
			if (!toCoin || !toCoin.address) { throw new Error("Invalid or missing address for toCoin in getFullSwapQuoteOrchestrated"); }

			const prices = await grpcApi.getCoinPrices([fromCoin.address, toCoin.address]); // Use existing grpcApi method


			const updatedFromCoin = { ...fromCoin, price: prices[fromCoin.address] };
			const updatedToCoin = { ...toCoin, price: prices[toCoin.address] };

			// 2. Get swap quote using updated prices
			const rawAmount = commonToRawAmount(amount, updatedFromCoin.decimals); // Use imported toRawAmount

			// Normalize addresses for Jupiter API (native SOL -> wSOL)
			const fromAddress = updatedFromCoin.address === '11111111111111111111111111111111' ? 'So11111111111111111111111111111111111111112' : updatedFromCoin.address;
			const toAddress = updatedToCoin.address === '11111111111111111111111111111111' ? 'So11111111111111111111111111111111111111112' : updatedToCoin.address;
			const quoteResponse = await grpcApi.getSwapQuote(fromAddress, toAddress, rawAmount, includeFeeBreakdown, userPublicKey, allowMultiHop);

			// 3. Format and return the combined result
			const fullQuote: grpcModel.FullSwapQuoteDetails = {
				estimatedAmount: quoteResponse.estimatedAmount,
				exchangeRate: quoteResponse.exchangeRate,
				fee: quoteResponse.fee, // gasFee and totalFee are the same in current fetchTradeQuote
				priceImpactPct: quoteResponse.priceImpact,
				totalFee: quoteResponse.totalSolRequired || quoteResponse.fee, // Use comprehensive SOL requirement
				route: quoteResponse.routePlan.join(' → '), // Assuming routePlan is string[]
				solFeeBreakdown: quoteResponse.solFeeBreakdown,
				totalSolRequired: quoteResponse.totalSolRequired || quoteResponse.fee,
				tradingFeeSol: quoteResponse.tradingFeeSol || "0",
				// Optionally include updated coin data if useful for the frontend
				// updatedFromCoin: updatedFromCoin,
				// updatedToCoin: updatedToCoin,
			};
			grpcUtils.logResponse(serviceName, methodName, fullQuote);
			return fullQuote;

		} catch (error: unknown) {
			// Log and rethrow, or handle as other grpcApi methods
			logger.exception(error, { // Assuming logger is available globally or passed/imported
				functionName: methodName,
				params: { amount, fromCoinSc: fromCoin.symbol, toCoinSc: toCoin.symbol }
			});
			if (error instanceof Error) {
				throw error; // Rethrow the original error or a new formatted one
			}
			throw new Error("An unknown error occurred in getFullSwapQuoteOrchestrated");
		}
	},

	// New RPC methods for specific coin categories
	getNewCoins: async (limit?: number, offset?: number): Promise<grpcModel.Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getNewCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, { limit, offset });

			const response = await coinClient.getNewCoins(
				{
					limit: limit || undefined,
					offset: offset || undefined
				},
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
				throw new Error("An unknown error occurred in getNewCoins");
			}
		}
	},

	getTrendingCoins: async (limit?: number, offset?: number): Promise<grpcModel.Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getTrendingCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, { limit, offset });

			const response = await coinClient.getTrendingCoins(
				{
					limit: limit || undefined,
					offset: offset || undefined
				},
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
				throw new Error("An unknown error occurred in getTrendingCoins");
			}
		}
	},

	getTopGainersCoins: async (limit?: number, offset?: number): Promise<grpcModel.Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getTopGainersCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, { limit, offset });

			const response = await coinClient.getTopGainersCoins(
				{
					limit: limit || undefined,
					offset: offset || undefined
				},
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
				throw new Error("An unknown error occurred in getTopGainersCoins");
			}
		}
	},

	getXStocksCoins: async (limit?: number, offset?: number): Promise<grpcModel.Coin[]> => {
		const serviceName = 'CoinService';
		const methodName = 'getXStocksCoins';
		try {
			grpcUtils.logRequest(serviceName, methodName, { limit, offset });

			const response = await coinClient.getXStocksCoins(
				{
					limit: limit || undefined,
					offset: offset || undefined
				},
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
				throw new Error("An unknown error occurred in getXStocksCoins");
			}
		}
	},
};
