import { useEffect, useState } from 'react';
import { LoadingState, SplashScreenNavigationProp } from './types';
import { usePortfolioStore } from '@store/portfolio';
import { logger } from '@/utils/logger';

export const useLoadingState = (navigation: SplashScreenNavigationProp) => {
	const [loadingState, setLoadingState] = useState<LoadingState>({
		portfolioLoaded: false,
		trendingLoaded: false,
	});

	const { fetchPortfolioBalance, wallet } = usePortfolioStore();

	useEffect(() => {
		const loadData = async () => {
			let _portfolioSuccess = false; // Prefixed
			let _trendingSuccess = false; // Prefixed

			// Note: Available coins loading moved to App.tsx
			// This splash screen component is not used in the current navigation flow
			_trendingSuccess = true;
			setLoadingState(prev => ({
				...prev,
				trendingLoaded: true
			}));

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
	}, [fetchPortfolioBalance, navigation, wallet]);

	return loadingState;
}; 
