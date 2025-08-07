import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getActiveWalletKeys } from '@/store/portfolio';
import { usePortfolioStore } from '@/store/portfolio';
import { logger } from '@/utils/logger';
import type { Base58PrivateKey } from '@/utils/cryptoUtils';
import { grpcApi } from '@/services/grpcApi';
import * as SecureStore from 'expo-secure-store';
import * as Keychain from 'react-native-keychain';
import { KEYCHAIN_SERVICE } from '@/utils/keychainService';

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

export const useDeleteAccount = () => {
	const [isDeleting, setIsDeleting] = useState(false);
	const { wallet, clearWallet } = usePortfolioStore();
	
	const performDeleteAccount = useCallback(async () => {
		if (!wallet?.address) {
			Alert.alert('Error', 'No wallet found to delete');
			return;
		}
		
		setIsDeleting(true);
		logger.info('Starting account deletion process', { wallet: wallet.address });
		
		try {
			// Call the backend to delete account data
			const response = await grpcApi.deleteAccount({
				walletPublicKey: wallet.address,
				confirmation: 'DELETE'
			});
			
			if (!response.success) {
				throw new Error(response.message || 'Failed to delete account');
			}
			
			logger.info('Account deletion successful, clearing local data');
			
			// Clear keychain storage
			await Keychain.resetGenericPassword({
				service: KEYCHAIN_SERVICE
			});
			
			// Clear secure storage (legacy)
			await SecureStore.deleteItemAsync('wallet_private_key');
			await SecureStore.deleteItemAsync('wallet_public_key');
			
			// Clear the portfolio store
			clearWallet();
			
			// Show success message
			Alert.alert(
				'Account Deleted',
				'Your account has been successfully deleted.',
				[{ text: 'OK', style: 'default' }]
			);
			
			logger.info('Account deletion completed successfully');
		} catch (error) {
			logger.error('Failed to delete account', { error: error.message });
			Alert.alert(
				'Error',
				`Failed to delete account: ${error.message}`,
				[{ text: 'OK', style: 'default' }]
			);
		} finally {
			setIsDeleting(false);
		}
	}, [wallet, clearWallet]);
	
	const showFinalConfirmation = useCallback(() => {
		Alert.alert(
			'Final Confirmation',
			'This is your last chance. Type "DELETE" to permanently delete your account.',
			[
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'I understand, delete my account',
					style: 'destructive',
					onPress: () => performDeleteAccount()
				}
			],
			{ cancelable: false }
		);
	}, [performDeleteAccount]);
	
	const showDeleteConfirmation = useCallback(() => {
		Alert.alert(
			'Delete Account',
			'Are you sure you want to delete your account? This action cannot be undone.\n\nAll your trading history and wallet data will be permanently deleted.',
			[
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => showFinalConfirmation()
				}
			],
			{ cancelable: true }
		);
	}, [showFinalConfirmation]);
	
	return {
		isDeleting,
		showDeleteConfirmation
	};
};