import React, { ReactNode } from 'react';
import { NetworkProvider } from '@/contexts/NetworkContext';
import NetworkError from '@/components/Common/NetworkError';
import { useNetworkGuard } from '@/hooks/useNetworkGuard';

interface NetworkWrapperProps {
	children: ReactNode;
}

// Inner component that uses the network context
const NetworkGuardedContent: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { shouldShowNetworkError } = useNetworkGuard();

	return (
		<>
			{children}
			<NetworkError visible={shouldShowNetworkError} />
		</>
	);
};

// Main wrapper that provides network context and guards
const NetworkWrapper: React.FC<NetworkWrapperProps> = ({ children }) => {
	return (
		<NetworkProvider>
			<NetworkGuardedContent>
				{children}
			</NetworkGuardedContent>
		</NetworkProvider>
	);
};

export default NetworkWrapper;
