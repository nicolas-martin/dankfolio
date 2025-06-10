import { useEffect, useState } from 'react';
import { LoadingState } from './types';
import { usePortfolioStore } from '@store/portfolio';
import { useCoinStore } from '@store/coins';
import { logger } from '@/utils/logger';

export const useLoadingState = (navigation: unknown) => {
	const [loadingState, setLoadingState] = useState<LoadingState>({
		portfolioLoaded: false,
		trendingLoaded: false,
	});

	const { fetchPortfolioBalance, wallet } = usePortfolioStore();
	const { fetchAvailableCoins, availableCoins } = useCoinStore();

	useEffect(() => {
		const loadData = async () => {
			let _portfolioSuccess = false; // Prefixed
			let _trendingSuccess = false; // Prefixed

			try {
				// Load trending coins with timeout
				const trendingPromise = availableCoins.length > 0 
					? Promise.resolve() 
					: fetchAvailableCoins();
				
				await Promise.race([
					trendingPromise,
					new Promise((_, reject) => setTimeout(() => reject(new Error('Trending coins timeout')), 10000))
				]);
				
				_trendingSuccess = true;
				setLoadingState(prev => ({
					...prev,
					trendingLoaded: true
				}));
			} catch (error) {
				logger.error('Error loading trending coins:', error);
				// Still mark as loaded to prevent getting stuck
				setLoadingState(prev => ({
					...prev,
					trendingLoaded: true
				}));
				_trendingSuccess = false;
			}

			// Load portfolio data with timeout and error handling
			try {
				if (wallet?.address) {
					await Promise.race([
						fetchPortfolioBalance(wallet.address),
						new Promise((_, reject) => setTimeout(() => reject(new Error('Portfolio fetch timeout')), 15000))
					]);
					_portfolioSuccess = true;
				}
			} catch (error) {
				logger.error('Error loading portfolio balance:', error);
				// Don't throw - just log and continue
				_portfolioSuccess = false;
			} finally {
				// Always mark portfolio as loaded to prevent getting stuck
				setLoadingState(prev => ({
					...prev,
					portfolioLoaded: true
				}));
			}

			// Always navigate to Home after attempting to load data
			try {
				navigation.replace('Home');
			} catch (navError) {
				logger.error('Navigation error:', navError);
			}
		};

		// Add a safety timeout to ensure we never get stuck on splash screen
		const safetyTimeout = setTimeout(() => {
			logger.warn('Safety timeout triggered - forcing navigation to Home');
			setLoadingState({
				portfolioLoaded: true,
				trendingLoaded: true
			});
			try {
				navigation.replace('Home');
			} catch (navError) {
				logger.error('Safety navigation error:', navError);
			}
		}, 20000); // 20 second safety timeout

		loadData().finally(() => {
			clearTimeout(safetyTimeout);
		});

		// Cleanup function
		return () => {
			clearTimeout(safetyTimeout);
		};
	}, [fetchPortfolioBalance, fetchAvailableCoins, navigation, wallet, availableCoins]);

	return loadingState;
}; 
