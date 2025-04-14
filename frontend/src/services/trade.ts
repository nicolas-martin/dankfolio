import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { TradeService } from "../gen/dankfolio/v1/trade_connect";
import { Trade, GetTradeQuoteResponse, GetTradeStatusResponse } from "../gen/dankfolio/v1/trade_pb";

const transport = createConnectTransport({
	baseUrl: "http://localhost:8080",
});

const client = createPromiseClient(TradeService, transport);

export interface TradeQuote {
	estimatedAmount: string;
	exchangeRate: string;
	fee: string;
	priceImpact: string;
	routePlan: string[];
	inputMint: string;
	outputMint: string;
}

export const getTradeQuote = async (
	fromCoinId: string,
	toCoinId: string,
	amount: string,
	slippageBps?: string
): Promise<TradeQuote> => {
	const response = await client.getTradeQuote({
		fromCoinId,
		toCoinId,
		amount,
		slippageBps,
	});
	return {
		estimatedAmount: response.estimatedAmount,
		exchangeRate: response.exchangeRate,
		fee: response.fee,
		priceImpact: response.priceImpact,
		routePlan: response.routePlan,
		inputMint: response.inputMint,
		outputMint: response.outputMint,
	};
};

export const submitTrade = async (
	fromCoinId: string,
	toCoinId: string,
	amount: number,
	signedTransaction: string
): Promise<{ tradeId: string; transactionHash: string }> => {
	const response = await client.submitTrade({
		fromCoinId,
		toCoinId,
		amount,
		signedTransaction,
	});
	return {
		tradeId: response.tradeId,
		transactionHash: response.transactionHash,
	};
};

export const getTradeStatus = async (
	transactionHash: string
): Promise<GetTradeStatusResponse> => {
	const response = await client.getTradeStatus({ transactionHash });
	return response;
};

export const getTradeById = async (id: string): Promise<Trade> => {
	const response = await client.getTradeByID({ id });
	return response;
};

export const listTrades = async (): Promise<Trade[]> => {
	const response = await client.listTrades({});
	return response.trades;
}; 