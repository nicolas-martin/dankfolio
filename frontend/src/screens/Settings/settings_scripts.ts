import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getActiveWalletKeys } from '@/store/portfolio';
import { usePortfolioStore } from '@/store/portfolio';
import { logger } from '@/utils/logger';
import type { Base58PrivateKey } from '@/utils/cryptoUtils';
import { grpcApi } from '@/services/grpcApi';
import { clearAllKeychainData } from '@/utils/keychainService';
import { useCoinStore } from '@/store/coins';
import { useTransactionsStore } from '@/store/transactions';
import { useThemeStore } from '@/store/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { DevSettings } from 'react-native';

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

			logger.info('Account deletion successful, clearing all local data');

			// 1. Clear keychain storage (wallet credentials) - use comprehensive clearing
			const keychainCleared = await clearAllKeychainData();
			if (!keychainCleared) {
				logger.warn('Keychain may not have been completely cleared, but continuing with deletion');
			}

			// 3. Clear AsyncStorage (app preferences, cache, etc.)
			try {
				const allKeys = await AsyncStorage.getAllKeys();
				if (allKeys.length > 0) {
					await AsyncStorage.multiRemove(allKeys);
					logger.info(`Cleared ${allKeys.length} AsyncStorage keys`);
				}
			} catch (error) {
				logger.warn('Failed to clear AsyncStorage', { error: error.message });
			}

			// 4. Clear all Zustand stores
			clearWallet(); // Portfolio store
			useCoinStore.getState().clearAllCoins(); // Coin store
			useTransactionsStore.getState().clearTransactions(); // Transaction store
			useThemeStore.getState().resetTheme(); // Theme store (reset to default)
			logger.info('Cleared all Zustand stores');

			// 5. Clear Sentry user context
			Sentry.withScope(scope => scope.setUser(null));
			logger.info('Cleared Sentry user context');

			// 6. Show success message and reload the app
			Alert.alert(
				'Account Deleted',
				'Your account has been successfully deleted. The app will now restart.',
				[{
					text: 'OK',
					style: 'default',
					onPress: () => {
						logger.info('Reloading app after account deletion');
						// Reload the app to start fresh
						if (__DEV__ && DevSettings) {
							// In development mode, use DevSettings to reload
							DevSettings.reload();
						} else {
							// In production, the user will need to manually restart
							// This is a limitation without expo-updates
							logger.info('Please restart the app to complete the process');
						}
					}
				}],
				{ cancelable: false }
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
