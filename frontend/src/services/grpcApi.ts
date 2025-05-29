import { coinClient, priceClient, tradeClient, utilityClient, walletClient } from './grpc/apiClient';
import * as grpcModel from './grpc/model';
import { GetPriceHistoryRequest_PriceHistoryType } from "@/gen/dankfolio/v1/price_pb";
import { Timestamp, timestampFromDate } from '@bufbuild/protobuf/wkt';
import * as grpcUtils from './grpc/grpcUtils';
import { mapGrpcCoinToFrontendCoin } from './grpc/grpcUtils'; // Import the new mapper

// Helper to convert timestamp strings to Timestamp objects
function convertToTimestamp(dateStr: string): Timestamp {
	return timestampFromDate(new Date(dateStr));
}

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

			const response = await tradeClient.submitSwap({
				fromCoinId: payload.fromCoinMintAddress,
				toCoinId: payload.toCoinMintAddress,
				amount: payload.amount,
				signedTransaction: payload.signedTransaction,
				unsignedTransaction: payload.unsignedTransaction
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	getPriceHistory: async (address: string, type: string, timeFrom: string, timeTo: string, addressType: string): Promise<grpcModel.PriceHistoryResponse> => {
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
		}
	},

	// Redundant getTransferTransaction was removed.
	// The functionality is covered by prepareCoinTransfer which correctly uses fromAddress.

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

		} catch (error) {
			return grpcUtils.handleGrpcError(error, serviceName, methodName);
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
