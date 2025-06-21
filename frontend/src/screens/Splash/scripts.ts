import { useEffect, useState } from 'react';
import { LoadingState, SplashScreenNavigationProp } from './types';
import { usePortfolioStore } from '@store/portfolio';
import { logger } from '@/utils/logger';

export const useLoadingState = (navigation?: SplashScreenNavigationProp) => { // Make navigation optional
	const [loadingState, setLoadingState] = useState<LoadingState>({
		portfolioLoaded: false,
		trendingLoaded: false, // This can be removed if not used, or set to true if trending is loaded elsewhere
	});

	// No direct data fetching here as App.tsx handles it.
	// This hook can now primarily be for observing the loading state from stores if needed,
	// or simply managing local UI state for the splash screen.

	// For this example, we'll assume App.tsx sets some global state or the necessary data
	// is loaded before this component is unmounted.
	// If specific loading indicators are still needed on Splash:
	// - Listen to zustand store changes (e.g., usePortfolioStore for wallet and balance)
	// - Listen to useCoinStore for available coins (if that's what "trending" implies)

	useEffect(() => {
		// Simulate loading completion for demonstration if direct store observation is complex
		// In a real scenario, you would derive this from store states.
		const timer = setTimeout(() => {
			setLoadingState({ portfolioLoaded: true, trendingLoaded: true });
			// Navigation is handled by App.tsx based on `appIsReady` and `needsWalletSetup`
			// So, no direct navigation call from here unless Splash screen has its own navigation logic
			// (e.g. navigating to an error screen if critical load fails, which is not the case here)
		}, 2000); // Simulate a delay, App.tsx will unmount this component when ready

		return () => clearTimeout(timer);
	}, []);


	// This hook might not need to return loadingState if App.tsx controls visibility.
	// Or, it can return states for more granular UI updates on the splash screen itself.
	return loadingState;
};
