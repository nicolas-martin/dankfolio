import { tradeClient, coinClient, priceClient, walletClient } from './grpc/apiClient';
import { Timestamp } from '@bufbuild/protobuf/wkt';
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

// Interface matching the REST API
interface API {
  submitSwap: (payload: TradePayload) => Promise<SubmitTradeResponse>;
  getSwapStatus: (txHash: string) => Promise<TradeStatusResponse>;
  getAvailableCoins: (trendingOnly?: boolean) => Promise<Coin[]>;
  getTradeQuote: (fromCoin: string, toCoin: string, amount: string) => Promise<TradeQuoteResponse>;
  getPriceHistory: (address: string, type: string, timeFrom: string, timeTo: string, addressType: string) => Promise<PriceHistoryResponse>;
  getWalletBalance: (address: string) => Promise<WalletBalanceResponse>;
  getCoinByID: (id: string) => Promise<Coin>;
  getTokenPrices: (tokenIds: string[]) => Promise<Record<string, number>>;
  prepareTokenTransfer: (payload: TokenTransferPrepareRequest) => Promise<TokenTransferPrepareResponse>;
  submitTokenTransfer: (payload: TokenTransferSubmitRequest) => Promise<TokenTransferResponse>;
}

// Helper to convert timestamp strings to Timestamp objects
const convertToTimestamp = (dateString: string): Timestamp => {
  const timestamp = new Timestamp();
  timestamp.seconds = BigInt(Math.floor(new Date(dateString).getTime() / 1000));
  timestamp.nanos = (new Date(dateString).getTime() % 1000) * 1000000;
  return timestamp;
};

// Error handling
interface ErrorDetails {
  message: string;
  status?: number;
  data?: any;
  code?: number;
}

const handleGrpcError = (error: any): never => {
  const errorDetails: ErrorDetails = {
    message: error.message || 'Unknown error',
    code: error.code,
    data: error.metadata?.toObject(),
  };

  console.error('gRPC API Error:', JSON.stringify(errorDetails, null, 2));
  throw errorDetails;
};

// Implementation of the API interface using gRPC
const grpcApi: API = {
  submitSwap: async (payload: TradePayload): Promise<SubmitTradeResponse> => {
    try {
      console.log('🔍 gRPC Submit Trade Request:', payload);
      
      const response = await tradeClient.submitTrade({
        fromCoinId: payload.from_coin_id,
        toCoinId: payload.to_coin_id,
        amount: payload.amount,
        signedTransaction: payload.signed_transaction
      });
      
      // Convert the response to match the expected REST API structure
      return {
        trade_id: response.tradeId,
        transaction_hash: response.transactionHash
      };
    } catch (error) {
      return handleGrpcError(error);
    }
  },

  getSwapStatus: async (txHash: string): Promise<TradeStatusResponse> => {
    try {
      console.log('🔍 gRPC Get Swap Status Request:', txHash);
      
      const response = await tradeClient.getTradeStatus({ txHash });
      
      // Convert the response to match the expected REST API structure
      return {
        transaction_hash: txHash,
        status: response.status,
        confirmations: response.confirmations,
        finalized: response.finalized,
        error: response.error
      };
    } catch (error) {
      return handleGrpcError(error);
    }
  },

  getAvailableCoins: async (trendingOnly?: boolean): Promise<Coin[]> => {
    try {
      console.log('🔍 gRPC Get Available Coins Request, trending only:', trendingOnly);
      
      const response = await coinClient.getAvailableCoins({ 
        trendingOnly: trendingOnly || false
      });
      
      // Convert the response coins to match the REST API structure
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
      return handleGrpcError(error);
    }
  },

  getTradeQuote: async (fromCoin: string, toCoin: string, amount: string): Promise<TradeQuoteResponse> => {
    try {
      console.log('🔍 gRPC Get Trade Quote Request:', { fromCoin, toCoin, amount });
      
      const response = await tradeClient.getTradeQuote({
        fromCoinId: fromCoin,
        toCoinId: toCoin,
        amount: amount
      });
      
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
      return handleGrpcError(error);
    }
  },

  getPriceHistory: async (address: string, type: string, timeFrom: string, timeTo: string, addressType: string): Promise<PriceHistoryResponse> => {
    try {
      console.log('🔍 gRPC Get Price History Request:', { address, type, timeFrom, timeTo, addressType });
      
      // Convert timeFrom and timeTo to timestamps
      const fromTimestamp = convertToTimestamp(timeFrom);
      const toTimestamp = convertToTimestamp(timeTo);
      
      const response = await priceClient.getPriceHistory({
        address,
        type,
        timeFrom: fromTimestamp,
        timeTo: toTimestamp,
        addressType
      });
      
      // Convert the response to match the expected REST API structure
      return {
        data: {
          items: response.data?.items.map(item => ({
            unixTime: Number(item.unixTime?.seconds || 0),
            value: item.value
          })) || []
        },
        success: response.success
      };
    } catch (error) {
      return handleGrpcError(error);
    }
  },

  getWalletBalance: async (address: string): Promise<WalletBalanceResponse> => {
    try {
      console.log('🔍 gRPC Get Wallet Balance Request:', address);
      
      const response = await walletClient.getWalletBalances({ address });
      
      // Convert the response to match the expected REST API structure
      return {
        balances: response.walletBalance?.balances.map(balance => ({
          id: balance.id,
          amount: balance.amount
        })) || []
      };
    } catch (error) {
      return handleGrpcError(error);
    }
  },

  getCoinByID: async (id: string): Promise<Coin> => {
    try {
      console.log('🔍 gRPC Get Coin By ID Request:', id);
      
      const response = await coinClient.getCoinByID({ id });
      
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
      return handleGrpcError(error);
    }
  },

  getTokenPrices: async (tokenIds: string[]): Promise<Record<string, number>> => {
    try {
      console.log('🔍 gRPC Get Token Prices Request:', tokenIds);
      
      const response = await tradeClient.getTokenPrices({ tokenIds });
      
      // The response structure is already a map of token IDs to prices
      return response.prices;
    } catch (error) {
      return handleGrpcError(error);
    }
  },

  prepareTokenTransfer: async (payload: TokenTransferPrepareRequest): Promise<TokenTransferPrepareResponse> => {
    try {
      console.log('🔍 gRPC Prepare Token Transfer Request:', payload);
      
      const response = await tradeClient.prepareTransfer({
        fromAddress: payload.fromAddress,
        toAddress: payload.toAddress,
        tokenMint: payload.tokenMint || '',
        amount: payload.amount
      });
      
      // Convert the response to match the expected REST API structure
      return {
        unsignedTransaction: response.unsignedTransaction
      };
    } catch (error) {
      return handleGrpcError(error);
    }
  },

  submitTokenTransfer: async (payload: TokenTransferSubmitRequest): Promise<TokenTransferResponse> => {
    try {
      console.log('🔍 gRPC Submit Token Transfer Request:', payload);
      
      const response = await tradeClient.submitTransfer({
        signedTransaction: payload.signedTransaction
      });
      
      // Convert the response to match the expected REST API structure
      return {
        transactionHash: response.transactionHash
      };
    } catch (error) {
      return handleGrpcError(error);
    }
  }
};

export default grpcApi;