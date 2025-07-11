import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { useCoinStore } from '@/store/coins';
import { grpcApi } from '@/services/grpcApi';
import { Coin } from '@/types';
import { logger } from '@/utils/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const useXStocksData = () => {
	const navigation = useNavigation<NavigationProp>();
	const [xStocksTokens, setXStocksTokens] = useState<Coin[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const { getCoinByID } = useCoinStore();

	const fetchXStocks = useCallback(async () => {
		try {
			const coins = await grpcApi.getXStocksCoins(100, 0);
			logger.log('[XStocks] Fetched coins:', {
				count: coins.length,
				sample: coins.slice(0, 3).map(c => ({
					symbol: c.symbol,
					name: c.name,
					logoURI: c.logoURI,
					hasLogo: !!c.logoURI,
				})),
			});
			setXStocksTokens(coins);
		} catch (error) {
			logger.error('[XStocks] Failed to fetch:', error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchXStocks();
	}, [fetchXStocks]);

	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		fetchXStocks();
	}, [fetchXStocks]);

	const handleCoinPress = useCallback(async (coin: Coin) => {
		// Fetch and store coin details before navigation
		const detailedCoin = await getCoinByID(coin.address);
		if (detailedCoin) {
			navigation.navigate('CoinDetail', { coin: detailedCoin });
		}
	}, [navigation, getCoinByID]);

	return {
		xStocksTokens,
		loading,
		refreshing,
		handleRefresh,
		handleCoinPress,
	};
};
