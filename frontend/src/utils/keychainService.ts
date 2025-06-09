import * as Keychain from 'react-native-keychain';
import { logger } from '@/utils/logger';
import { Buffer } from 'buffer';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';
import { Base58PrivateKey } from './cryptoUtils'; // Import the branded type

export const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';

// Helper to store credentials safely
export const storeCredentials = async (privateKey: Base58PrivateKey, mnemonic: string): Promise<void> => {
	logger.breadcrumb({ category: 'wallet_setup', message: 'Storing wallet credentials' });
	logger.info('Storing wallet credentials...');

	try {
		// First clear any existing credentials
		await Keychain.resetGenericPassword({
			service: KEYCHAIN_SERVICE
		});

		// Store credentials with a fixed username and JSON string as password
		const credentials = JSON.stringify({
			privateKey,
			mnemonic
		});

		await Keychain.setGenericPassword('dankfolio_wallet', credentials, {
			service: KEYCHAIN_SERVICE,
			accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
		});

		// Verify the stored credentials
		const storedCredentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE
		});

		if (!storedCredentials) {
			throw new Error('Failed to verify stored credentials - no data found');
		}

		try {
			const parsedCredentials = JSON.parse(storedCredentials.password);
			const retrievedPrivateKey = parsedCredentials.privateKey as Base58PrivateKey; // Cast to branded type
			const retrievedMnemonic = parsedCredentials.mnemonic;

			if (!retrievedPrivateKey || retrievedPrivateKey !== privateKey) {
				throw new Error('Failed to verify stored private key - mismatch in retrieved value');
			}

			// Verify we can create a valid keypair from the stored key
			const keypairBytes = Buffer.from(bs58.decode(retrievedPrivateKey));
			if (keypairBytes.length !== 64) {
				throw new Error(`Retrieved key has invalid length: ${keypairBytes.length} bytes`);
			}
			const keypair = Keypair.fromSecretKey(keypairBytes); // Keypair is valid if no error

			if (!retrievedMnemonic || retrievedMnemonic !== mnemonic) {
				throw new Error('Failed to verify stored mnemonic');
			}

			logger.info('Wallet credentials stored and verified', { publicKey: keypair.publicKey.toBase58() });
		} catch (error) {
			logger.exception(error, { functionName: 'storeCredentials', context: 'VerificationStep' });
			throw error; // Re-throw to be caught by the outer try-catch
		}
	} catch (error) {
		logger.exception(error, { functionName: 'storeCredentials' });
		// Clean up on failure
		await Keychain.resetGenericPassword({
			service: KEYCHAIN_SERVICE
		});
		throw error; // Re-throw original error
	}
};

export const retrieveWalletFromStorage = async (): Promise<string | null> => {
	try {
		const credentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE
		});

		if (!credentials) {
			logger.info('No wallet found in storage.');
			return null;
		}

		try {
			const parsedCredentials = JSON.parse(credentials.password);
			const privateKey = parsedCredentials.privateKey as Base58PrivateKey; // Cast to branded type

			// Verify the Base58 private key is valid
			const keypairBytes = Buffer.from(bs58.decode(privateKey));
			if (keypairBytes.length !== 64) {
				throw new Error(`Invalid private key length: ${keypairBytes.length} bytes`);
			}
			// Verify the keypair is valid by reconstructing it
			const keypair = Keypair.fromSecretKey(keypairBytes);
			logger.info('Wallet retrieved from storage.', { publicKey: keypair.publicKey.toBase58() });
			return keypair.publicKey.toBase58();
		} catch (error) {
			logger.warn('Invalid wallet data in storage, clearing credentials.', { errorMessage: error.message });
			await Keychain.resetGenericPassword({
				service: KEYCHAIN_SERVICE
			});
			return null;
		}
	} catch (error) {
		logger.error('Error accessing storage during wallet retrieval.', { errorMessage: error.message });
		return null;
	}
};
