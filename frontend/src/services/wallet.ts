import { RawWalletData } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

/**
 * Secure storage functions for the wallet.
 * In a real app, use a secure storage solution like react-native-keychain.
 */
export const secureStorage = {
	saveWallet: async (wallet: RawWalletData): Promise<boolean> => {
		try {
			// Log with less sensitive data for production
			logger.info('Saving wallet to storage', {
				address: wallet.address,
				privateKeyLength: wallet.privateKey?.length,
				// Avoid logging privateKeyPreview or format in production logs
			});

			await AsyncStorage.setItem('wallet', JSON.stringify({
				address: wallet.address,
				privateKey: wallet.privateKey, // Storing the actual private key
			}));

			// Verification log for debugging, could be logger.debug
			const savedData = await AsyncStorage.getItem('wallet');
			logger.info('Verified saved wallet state', {
				saved: !!savedData,
				// dataLength: savedData?.length, // Potentially sensitive if key length is known
			});

			return true;
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.exception(error, { functionName: 'secureStorage.saveWallet' });
			} else {
				logger.error("An unknown error occurred in secureStorage.saveWallet:", error);
			}
			return false;
		}
	},

	getWallet: async (): Promise<RawWalletData | null> => {
		try {
			const walletData = await AsyncStorage.getItem('wallet');
			logger.info('Retrieved wallet from storage', {
				found: !!walletData,
				// dataLength: walletData?.length, // Potentially sensitive
			});

			if (!walletData) return null;

			const parsed = JSON.parse(walletData) as RawWalletData;
			// Log with less sensitive data for production
			logger.info('Parsed wallet data', {
				address: parsed.address,
				privateKeyLength: parsed.privateKey?.length,
			});

			return parsed;
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.exception(error, { functionName: 'secureStorage.getWallet' });
			} else {
				logger.error("An unknown error occurred in secureStorage.getWallet:", error);
			}
			return null;
		}
	},

	deleteWallet: async (): Promise<boolean> => {
		try {
			logger.info('Deleting wallet from storage');
			await AsyncStorage.removeItem('wallet');

			// Verification log
			const remainingData = await AsyncStorage.getItem('wallet');
			logger.info('Verified wallet deletion', {
				isDeleted: !remainingData
			});

			return true;
		} catch (error: unknown) {
			if (error instanceof Error) {
				logger.exception(error, { functionName: 'secureStorage.deleteWallet' });
			} else {
				logger.error("An unknown error occurred in secureStorage.deleteWallet:", error);
			}
			return false;
		}
	}
};
