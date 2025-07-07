import { useState, useCallback } from 'react';
import { getActiveWalletKeys } from '@/store/portfolio';
import { logger } from '@/utils/logger';
import type { Base58PrivateKey } from '@/utils/cryptoUtils';

export interface PrivateKeyState {
	isVisible: boolean;
	privateKey: Base58PrivateKey | null;
	isLoading: boolean;
	error: string | null;
}

export const usePrivateKeyVisibility = () => {
	const [privateKeyState, setPrivateKeyState] = useState<PrivateKeyState>({
		isVisible: false,
		privateKey: null,
		isLoading: false,
		error: null
	});

	const togglePrivateKeyVisibility = useCallback(async () => {
		logger.breadcrumb({ category: 'settings', message: 'User toggled private key visibility' });
		
		if (privateKeyState.isVisible) {
			// Hide the private key
			setPrivateKeyState(prev => ({
				...prev,
				isVisible: false,
				privateKey: null,
				error: null
			}));
			return;
		}

		// Show the private key - need to retrieve it
		setPrivateKeyState(prev => ({
			...prev,
			isLoading: true,
			error: null
		}));

		try {
			const walletKeys = await getActiveWalletKeys();
			
			if (!walletKeys || !walletKeys.privateKey) {
				throw new Error('Unable to retrieve private key from secure storage');
			}

			setPrivateKeyState(prev => ({
				...prev,
				isVisible: true,
				privateKey: walletKeys.privateKey,
				isLoading: false,
				error: null
			}));

			logger.info('Private key successfully retrieved and displayed');
		} catch (error) {
			logger.error('Failed to retrieve private key', { error: error.message });
			setPrivateKeyState(prev => ({
				...prev,
				isVisible: false,
				privateKey: null,
				isLoading: false,
				error: 'Failed to retrieve private key. Please try again.'
			}));
		}
	}, [privateKeyState.isVisible]);

	const getPrivateKeyDisplay = useCallback(() => {
		if (privateKeyState.isLoading) {
			return 'Loading...';
		}
		
		if (privateKeyState.error) {
			return privateKeyState.error;
		}
		
		if (privateKeyState.isVisible && privateKeyState.privateKey) {
			return privateKeyState.privateKey;
		}
		
		return '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';
	}, [privateKeyState]);

	const getEyeIconName = useCallback(() => {
		if (privateKeyState.isLoading) {
			return 'loading';
		}
		return privateKeyState.isVisible ? 'eye-off' : 'eye';
	}, [privateKeyState.isVisible, privateKeyState.isLoading]);

	return {
		privateKeyState,
		togglePrivateKeyVisibility,
		getPrivateKeyDisplay,
		getEyeIconName
	};
};