import * as Network from 'expo-network';
import { logger } from '@/utils/logger';

export interface NetworkState {
	isConnected: boolean | null;
	type: string | null;
	isInternetReachable: boolean | null;
}

/**
 * Checks the current network connectivity status using Expo Network API
 * @returns Promise<NetworkState> - Current network state
 */
export const checkNetworkConnectivity = async (): Promise<NetworkState> => {
	try {
		const networkState = await Network.getNetworkStateAsync();

		logger.info('[NetworkUtils] Network state checked', {
			isConnected: networkState.isConnected,
			type: networkState.type,
			isInternetReachable: networkState.isInternetReachable
		});

		return {
			isConnected: networkState.isConnected ?? null,
			type: networkState.type ?? null,
			isInternetReachable: networkState.isInternetReachable ?? null
		};
	} catch (error) {
		logger.error('[NetworkUtils] Failed to check network connectivity', error);

		// Return pessimistic state on error
		return {
			isConnected: false,
			type: null,
			isInternetReachable: false
		};
	}
};

/**
 * Sets up a network state listener using Expo Network API
 * @param callback - Function to call when network state changes
 * @returns Unsubscribe function
 */
export const subscribeToNetworkChanges = (
	callback: (networkState: NetworkState) => void
): (() => void) => {
	const subscription = Network.addNetworkStateListener(state => {
		const networkState: NetworkState = {
			isConnected: state.isConnected ?? null,
			type: state.type ?? null,
			isInternetReachable: state.isInternetReachable ?? null
		};

		logger.info('[NetworkUtils] Network state changed', networkState);
		callback(networkState);
	});

	// Return unsubscribe function
	return () => subscription.remove();
};

/**
 * Gets a user-friendly network status message
 * @param networkState - Current network state
 * @returns User-friendly message describing network status
 */
export const getNetworkStatusMessage = (networkState: NetworkState): string => {
	if (networkState.isConnected === false) {
		return 'No network connection detected. Please check your WiFi or cellular data.';
	}

	if (networkState.isInternetReachable === false) {
		return 'Connected to network but internet is not reachable. Please check your connection.';
	}

	if (networkState.isConnected === null || networkState.isInternetReachable === null) {
		return 'Unable to determine network status. Please check your connection.';
	}

	return 'Network connection is available.';
};
