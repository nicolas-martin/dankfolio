import { useState } from 'react';
import { Coin } from '@/types';
import { PriceData } from '@/types';
import { grpcApi } from '@/services/grpcApi';
import { TimeframeOption } from './coindetail_types';
import { GetPriceHistoryRequest_PriceHistoryType } from '@/gen/dankfolio/v1/price_pb';
import { useCoinStore } from '@/store/coins';
import { SOLANA_ADDRESS } from '@/utils/constants';
import { logger } from '@/utils/logger';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastParams {
	type: ToastType;
	message: string;
	txHash?: string;
}

export const TIMEFRAMES: TimeframeOption[] = [
	{ label: "15m", value: "FIFTEEN_MINUTE" },
	{ label: "1H", value: "ONE_HOUR" },
	{ label: "4H", value: "FOUR_HOUR" },
	{ label: "1D", value: "ONE_DAY" },
];

export const fetchPriceHistory = async (
	timeframe: string,
	setLoading: (loading: boolean) => void,
	setPriceHistory: (history: PriceData[]) => void,
	coin: Coin | null,
	isInitialLoad: boolean = false
) => {
	try {
		if (isInitialLoad) {
			setLoading(true);
		}
		if (!coin) {
			logger.error('No coin provided for price history', { functionName: 'fetchPriceHistory' });
			setPriceHistory([]);
			return;
		}
		const now = new Date();
		let startDate = new Date(now);
		const points = 100;
		switch (timeframe) {
			case 'FIFTEEN_MINUTE':
				startDate = new Date(now.getTime() - points * 15 * 60 * 1000);
				break;
			case 'ONE_HOUR':
				startDate = new Date(now.getTime() - points * 60 * 60 * 1000);
				break;
			case 'FOUR_HOUR':
				startDate = new Date(now.getTime() - points * 4 * 60 * 60 * 1000);
				break;
			case 'ONE_DAY':
				startDate = new Date(now.getTime() - points * 24 * 60 * 60 * 1000);
				break;
			case 'ONE_WEEK':
				startDate = new Date(now.getTime() - points * 7 * 24 * 60 * 60 * 1000);
				break;
			default:
				throw new Error(`Invalid timeframe: ${timeframe}`);
		}
		const time_to = now.toISOString();
		const time_from = startDate.toISOString();
		const response = await grpcApi.getPriceHistory(
			coin.mintAddress,
			timeframe,
			time_from,
			time_to,
			"token"
		);
		if (response?.data?.items) {
			const mapped: PriceData[] = response.data.items
				.filter(item => item.value !== null && item.unixTime !== null)
				.map(item => ({
					timestamp: new Date(item.unixTime * 1000).toISOString(),
					value: item.value,
					unixTime: item.unixTime
				}));
			setPriceHistory(mapped);
		} else {
			setPriceHistory([]);
		}
	} catch (error) {
		logger.exception(error, { functionName: 'fetchPriceHistory', params: { coinMintAddress: coin?.mintAddress, timeframe } });
		setPriceHistory([]);
	} finally {
		setLoading(false);
	}
};

export const handleTradeNavigation = async (
	toCoin: Coin | null,
	fromCoin: Coin | null,
	showToast: (params: ToastParams) => void,
	navigate: (screen: string, params: any) => void
) => {
	if (!toCoin) {
		showToast({
			type: 'error',
			message: 'Please select a coin to trade'
		});
		return;
	}
	let selectedFromCoin = fromCoin;
	if (!selectedFromCoin) {
		try {
			selectedFromCoin = await useCoinStore.getState().getCoinByID(SOLANA_ADDRESS);
		} catch (error: any) {
			logger.warn('Failed to get SOL coin during trade navigation.', { error: error.message, functionName: 'handleTradeNavigation' });
		}
	}
	if (selectedFromCoin && toCoin.mintAddress === selectedFromCoin.mintAddress) {
		showToast({
			type: 'error',
			message: 'Cannot trade a coin for itself'
		});
		return;
	}
	logger.breadcrumb({
		category: 'navigation',
		message: 'Navigating to TradeScreen from CoinDetail',
		data: { 
			fromCoin: selectedFromCoin?.symbol || 'N/A', 
			toCoin: toCoin.symbol 
		},
	});
	navigate('Trade', {
		initialFromCoin: selectedFromCoin,
		initialToCoin: toCoin
	});
};
