import { Wallet } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure storage functions for the wallet.
 * In a real app, use a secure storage solution like react-native-keychain.
 */
export const secureStorage = {
	saveWallet: async (wallet: Wallet): Promise<boolean> => {
		try {
			console.log('💾 Saving wallet to storage:', {
				address: wallet.address,
				privateKeyLength: wallet.privateKey?.length,
				privateKeyPreview: wallet.privateKey?.substring(0, 10) + '...',
				privateKeyFormat: wallet.privateKey?.match(/^[A-Za-z0-9+/]*={0,2}$/) ? 'Base64' : 'Base58'
			});

			await AsyncStorage.setItem('wallet', JSON.stringify({
				address: wallet.address,
				privateKey: wallet.privateKey,
			}));

			// Verify what was saved
			const savedData = await AsyncStorage.getItem('wallet');
			console.log('✅ Verified saved wallet:', {
				saved: !!savedData,
				dataLength: savedData?.length,
				parsed: savedData ? JSON.parse(savedData) : null
			});

			return true;
		} catch (error) {
			console.error('❌ Error saving wallet to secure storage:', error);
			return false;
		}
	},

	getWallet: async (): Promise<Wallet | null> => {
		try {
			const walletData = await AsyncStorage.getItem('wallet');
			console.log('📱 Retrieved wallet from storage:', {
				found: !!walletData,
				dataLength: walletData?.length
			});

			if (!walletData) return null;

			const parsed = JSON.parse(walletData) as Wallet;
			console.log('🔐 Parsed wallet data:', {
				address: parsed.address,
				privateKeyLength: parsed.privateKey?.length,
				privateKeyPreview: parsed.privateKey?.substring(0, 10) + '...',
				privateKeyFormat: parsed.privateKey?.match(/^[A-Za-z0-9+/]*={0,2}$/) ? 'Base64' : 'Base58'
			});

			return parsed;
		} catch (error) {
			console.error('❌ Error getting wallet from secure storage:', error);
			return null;
		}
	},

	deleteWallet: async (): Promise<boolean> => {
		try {
			console.log('🗑️ Deleting wallet from storage');
			await AsyncStorage.removeItem('wallet');

			// Verify deletion
			const remainingData = await AsyncStorage.getItem('wallet');
			console.log('✅ Verified wallet deletion:', {
				isDeleted: !remainingData
			});

			return true;
		} catch (error) {
			console.error('❌ Error deleting wallet from secure storage:', error);
			return false;
		}
	}
};
