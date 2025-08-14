import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NetworkState, checkNetworkConnectivity, subscribeToNetworkChanges, getNetworkStatusMessage } from '@/utils/networkUtils';
import { logger } from '@/utils/logger';
import { env } from '@/utils/env';

interface NetworkContextValue {
	networkState: NetworkState;
	isOnline: boolean;
	statusMessage: string;
	refreshNetworkState: () => Promise<void>;
	setTestMode: (enabled: boolean) => void;
	simulateOffline: () => void;
	simulateOnline: () => void;
	isTestMode: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

interface NetworkProviderProps {
	children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
	const [networkState, setNetworkState] = useState<NetworkState>({
		isConnected: null,
		type: null,
		isInternetReachable: null
	});

	// Test mode state
	const [isTestMode, setIsTestMode] = useState(false);
	const [testNetworkState, setTestNetworkState] = useState<NetworkState | null>(null);

	// Use test state when in test mode, otherwise use real network state
	const effectiveNetworkState = isTestMode && testNetworkState ? testNetworkState : networkState;

	// Derived state - we consider the app "online" only when we have both connection and internet reachability
	const isOnline = effectiveNetworkState.isConnected === true && effectiveNetworkState.isInternetReachable === true;
	const statusMessage = getNetworkStatusMessage(effectiveNetworkState);

	const refreshNetworkState = async () => {
		try {
			logger.info('[NetworkProvider] Manually refreshing network state');
			const newState = await checkNetworkConnectivity();
			setNetworkState(newState);
		} catch (error) {
			logger.error('[NetworkProvider] Failed to refresh network state', error);
			setNetworkState({
				isConnected: false,
				type: null,
				isInternetReachable: false
			});
		}
	};

	useEffect(() => {
		// Initial network check
		refreshNetworkState();

		// Subscribe to network changes
		const unsubscribe = subscribeToNetworkChanges((newState: NetworkState) => {
			logger.info('[NetworkProvider] Network state changed', newState);
			setNetworkState(newState);
		});

		return () => {
			unsubscribe();
		};
	}, []);

	// Auto-activate test mode based on environment variable
	useEffect(() => {
		if (!__DEV__) return;
		if (env.hasNetwork === undefined) return;

		logger.info(`[NetworkProvider] Auto-activating network test mode from env.hasNetwork: ${env.hasNetwork}`);

		if (env.hasNetwork === false) {
			simulateOffline();
		} else {
			simulateOnline();
		}
	}, []);

	// Test mode functions
	const setTestMode = (enabled: boolean) => {
		logger.info(`[NetworkProvider] Test mode ${enabled ? 'enabled' : 'disabled'}`);
		setIsTestMode(enabled);
		if (!enabled) {
			setTestNetworkState(null);
		}
	};

	const simulateOffline = () => {
		if (!__DEV__) {
			logger.warn('[NetworkProvider] simulateOffline only works in development mode');
			return;
		}
		logger.info('[NetworkProvider] Simulating offline state');
		setTestNetworkState({
			isConnected: false,
			type: null,
			isInternetReachable: false
		});
		setIsTestMode(true);
	};

	const simulateOnline = () => {
		if (!__DEV__) {
			logger.warn('[NetworkProvider] simulateOnline only works in development mode');
			return;
		}
		logger.info('[NetworkProvider] Simulating online state');
		setTestNetworkState({
			isConnected: true,
			type: 'WIFI',
			isInternetReachable: true
		});
		setIsTestMode(true);
	};

	// eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
	const contextValue: NetworkContextValue = {
		networkState: effectiveNetworkState,
		isOnline,
		statusMessage,
		refreshNetworkState,
		setTestMode,
		simulateOffline,
		simulateOnline,
		isTestMode
	};

	return (
		<NetworkContext.Provider value={contextValue}>
			{children}
		</NetworkContext.Provider>
	);
};

export const useNetwork = (): NetworkContextValue => {
	const context = useContext(NetworkContext);
	if (!context) {
		throw new Error('useNetwork must be used within a NetworkProvider');
	}
	return context;
};
