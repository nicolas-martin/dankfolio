import { useEffect, useState } from 'react';
import { LoadingState } from './types';
import { usePortfolioStore } from '../../store/portfolio';
import { useCoinStore } from '../../store/coins';

export const useLoadingState = (navigation: any) => {
	const [loadingState, setLoadingState] = useState<LoadingState>({
		portfolioLoaded: false,
		trendingLoaded: false,
	});

	const { fetchPortfolioBalance, wallet } = usePortfolioStore();
	const { fetchAvailableCoins, availableCoins } = useCoinStore();

	useEffect(() => {
		const loadData = async () => {
			try {
				// Check if data is already loaded
				if (availableCoins.length > 0) {
					setLoadingState(prev => ({
						...prev,
						trendingLoaded: true
					}));
				} else {
					await fetchAvailableCoins();
					setLoadingState(prev => ({
						...prev,
						trendingLoaded: true
					}));
				}

				// Load portfolio data if needed
				if (wallet?.address) {
					await fetchPortfolioBalance(wallet.address);
					setLoadingState(prev => ({
						...prev,
						portfolioLoaded: true
					}));
				} else {
					setLoadingState(prev => ({
						...prev,
						portfolioLoaded: true
					}));
				}

				// Navigate to Home screen
				navigation.replace('Home');
			} catch (error) {
				console.error('Error loading initial data:', error);
				// After error, still navigate to home since initial load was attempted
				navigation.replace('Home');
			}
		};

		loadData();
	}, [fetchPortfolioBalance, fetchAvailableCoins, navigation, wallet, availableCoins]);

	return loadingState;
}; 
