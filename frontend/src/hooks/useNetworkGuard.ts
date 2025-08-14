import { useEffect, useState } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { logger } from '@/utils/logger';

/**
 * Hook that provides network guarding functionality
 * Returns whether the network error modal should be shown
 */
export const useNetworkGuard = () => {
	const { isOnline, networkState } = useNetwork();
	const [shouldShowError, setShouldShowError] = useState(false);

	useEffect(() => {
		// Only show error if we've determined we're offline
		// Don't show immediately on app launch while network state is still loading
		const hasCheckedNetwork = networkState.isConnected !== null && networkState.isInternetReachable !== null;

		if (hasCheckedNetwork && !isOnline) {
			logger.warn('[NetworkGuard] Network connectivity lost, showing error modal');
			setShouldShowError(true);
		} else if (isOnline) {
			logger.info('[NetworkGuard] Network connectivity restored, hiding error modal');
			setShouldShowError(false);
		}
	}, [isOnline, networkState]);

	return {
		shouldShowNetworkError: shouldShowError,
		isOnline,
		networkState
	};
};
