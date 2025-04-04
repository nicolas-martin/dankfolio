import { useEffect, useState } from 'react';
import { LoadingState } from './types';
import { usePortfolioStore } from '../../store/portfolio';

export const useLoadingState = (onLoadComplete: () => void) => {
	const [loadingState, setLoadingState] = useState<LoadingState>({
		portfolioLoaded: false,
		trendingLoaded: false,
	});

	const { fetchPortfolioBalance, wallet } = usePortfolioStore();

	const checkLoadingComplete = (state: LoadingState) => {
		if (state.portfolioLoaded && state.trendingLoaded) {
			onLoadComplete();
		}
	};

	useEffect(() => {
		const loadData = async () => {
			try {
				// Load portfolio data only if we have a wallet
				if (wallet?.address) {
					await fetchPortfolioBalance(wallet.address);
				}
				setLoadingState(prev => {
					const newState = { ...prev, portfolioLoaded: true };
					checkLoadingComplete(newState);
					return newState;
				});

				// Simulate trending data loading (replace with actual API call)
				setTimeout(() => {
					setLoadingState(prev => {
						const newState = { ...prev, trendingLoaded: true };
						checkLoadingComplete(newState);
						return newState;
					});
				}, 1500);
			} catch (error) {
				console.error('Error loading initial data:', error);
				// Handle error appropriately
			}
		};

		loadData();
	}, [fetchPortfolioBalance, onLoadComplete, wallet?.address]);

	return loadingState;
}; 
