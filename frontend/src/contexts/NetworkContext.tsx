import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { NetworkState, checkNetworkConnectivity, subscribeToNetworkChanges, getNetworkStatusMessage } from '@/utils/networkUtils';
import { logger } from '@/utils/logger';

interface NetworkContextValue {
	networkState: NetworkState;
	isOnline: boolean;
	statusMessage: string;
	refreshNetworkState: () => Promise<void>;
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

	// Derived state - we consider the app "online" only when we have both connection and internet reachability
	const isOnline = networkState.isConnected === true && networkState.isInternetReachable === true;
	const statusMessage = getNetworkStatusMessage(networkState);

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

	const contextValue: NetworkContextValue = {
		networkState,
		isOnline,
		statusMessage,
		refreshNetworkState
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
