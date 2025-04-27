import * as Keychain from 'react-native-keychain';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer'; // Import Buffer for hex conversion
import grpcApi from '@/services/grpcApi'; // Import grpcApi

const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';
const KEYCHAIN_USERNAME_PRIVATE_KEY = 'userPrivateKeyHex'; // Store 64-byte keypair hex
const KEYCHAIN_USERNAME_MNEMONIC = 'userMnemonic';

// Helper to store credentials safely
export const storeCredentials = async (privateKeyHex: string, mnemonic: string): Promise<void> => {
	// Store the 64-byte keypair hex
	await Keychain.setGenericPassword(KEYCHAIN_USERNAME_PRIVATE_KEY, privateKeyHex, { service: KEYCHAIN_SERVICE });
	await Keychain.setGenericPassword(KEYCHAIN_USERNAME_MNEMONIC, mnemonic, { service: KEYCHAIN_SERVICE });
	console.log('🔑 Credentials (64-byte keypair hex, mnemonic) stored securely.');
};

export const handleGenerateWallet = async (): Promise<Keypair | null> => {
	try {
		console.log("📞 Calling grpcApi.createWallet...");
		const newWalletData = await grpcApi.createWallet();
		if (!newWalletData || !newWalletData.secret_key || !newWalletData.mnemonic) {
			console.error('❌ Failed to generate wallet from API or missing data');
			throw new Error('Failed to generate wallet from API.');
		}

		let keypairBytes: Buffer;
		try {
			// Remove potential surrounding quotes from the secret_key string
			let base64Key = newWalletData.secret_key;
			if (base64Key.startsWith('"') && base64Key.endsWith('"')) {
				base64Key = base64Key.substring(1, base64Key.length - 1);
				console.log('✂️ Removed surrounding quotes from secretKey string.');
			}

			// Now decode the cleaned Base64 string
			keypairBytes = Buffer.from(base64Key, 'base64');
			if (keypairBytes.length !== 64) {
				throw new Error(`Decoded keypair has incorrect length: ${keypairBytes.length}, expected 64`);
			}
			console.log('🔑 Decoded 64-byte keypair from Base64 secret_key.');
		} catch (e) {
			console.error('❌ Error decoding Base64 secret_key from API:', e);
			console.error('Raw secret_key received:', newWalletData.secret_key);
			throw new Error('Could not decode secret key from API response.');
		}

		const privateKeyHex = keypairBytes.toString('hex');
		const mnemonic = newWalletData.mnemonic;

		await storeCredentials(privateKeyHex, mnemonic);

		const keypair = Keypair.fromSecretKey(keypairBytes);

		if (keypair.publicKey.toBase58() !== newWalletData.public_key) {
			console.warn('⚠️ WARNING: Reconstructed public key does not match public key from API!');
		}

		console.log('✅ New wallet generated, stored, and Keypair created.');
		return keypair;
	} catch (error) {
		console.error('❌ Error in handleGenerateWallet:', error);
		throw error;
	}
};

export const handleImportWallet = async (mnemonic: string): Promise<Keypair | null> => {
	try {
		console.log(' Importing wallet with mnemonic...');
		if (!bip39.validateMnemonic(mnemonic)) {
			console.error('❌ Invalid mnemonic phrase provided.');
			throw new Error('Invalid mnemonic phrase.');
		}
		const seed = await bip39.mnemonicToSeed(mnemonic);
		// Derive the keypair using the Solana path (first 32 bytes of seed)
		const derivedSeed = seed.slice(0, 32);
		const keypair = Keypair.fromSeed(derivedSeed);

		// Convert the 64-byte keypair (secret + public) to hex for storage consistency
		// keypair.secretKey contains the 64-byte keypair data for seeded keypairs
		const privateKeyHex = Buffer.from(keypair.secretKey).toString('hex');

		// Store securely FIRST
		await storeCredentials(privateKeyHex, mnemonic);

		console.log('✅ Wallet imported from mnemonic, stored, and Keypair created.');
		return keypair; // Return keypair only after successful storage
	} catch (error) {
		console.error('❌ Error in handleImportWallet:', error);
		// Re-throw the error so the calling UI component can handle it
		throw error;
	}
};

export const retrieveWalletFromStorage = async (): Promise<Keypair | null> => {
	try {
		// Retrieve the 64-byte keypair hex using its specific identifier
		const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE, username: KEYCHAIN_USERNAME_PRIVATE_KEY } as Keychain.GetOptions);

		if (credentials && credentials.password) {
			console.log('🔑 Retrieved 64-byte keypair hex from secure storage.');
			const keypairBytes = Buffer.from(credentials.password, 'hex');
			if (keypairBytes.length !== 64) {
				console.warn(`⚠️ Retrieved keypair hex has incorrect length: ${keypairBytes.length}, expected 64. Clearing invalid data.`);
				// Clear ALL credentials for this service to force re-setup
				await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
				return null; // Treat as no wallet found
			}
			const keypair = Keypair.fromSecretKey(keypairBytes);
			console.log('✅ Keypair reconstructed from stored 64-byte keypair.');
			return keypair;
		} else {
			console.log('❓ No wallet private key found in secure storage.');
			return null;
		}
	} catch (error) {
		console.error('❌ Error retrieving wallet from storage:', error);
		return null;
	}
};

// Optional: Function to retrieve mnemonic if needed elsewhere
export const retrieveMnemonicFromStorage = async (): Promise<string | null> => {
	try {
		const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE, username: KEYCHAIN_USERNAME_MNEMONIC } as Keychain.GetOptions);
		if (credentials && credentials.password) {
			console.log('🔑 Retrieved mnemonic from secure storage.');
			return credentials.password;
		} else {
			console.log('❓ No mnemonic found in secure storage.');
			return null;
		}
	} catch (error) {
		console.error('❌ Error retrieving mnemonic from storage:', error);
		return null;
	}
}; 