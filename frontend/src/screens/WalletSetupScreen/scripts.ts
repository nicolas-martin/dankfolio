import * as Keychain from 'react-native-keychain';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer'; // Import Buffer for hex conversion
import { grpcApi } from '@/services/grpcApi'; // Import grpcApi
import { usePortfolioStore } from '@store/portfolio';
import bs58 from 'bs58';

// Branded type for Base58 private keys to ensure type safety
type Base58PrivateKey = string & { readonly __brand: unique symbol };

const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';
const KEYCHAIN_USERNAME_PRIVATE_KEY = 'userPrivateKey';
const KEYCHAIN_USERNAME_MNEMONIC = 'userMnemonic';

// Helper function to convert Base64 to Base58PrivateKey
export const base64ToBase58PrivateKey = (base64Key: string): Base58PrivateKey => {
	// Decode Base64 to bytes
	const bytes = Buffer.from(base64Key, 'base64');
	console.log('🔄 Converting Base64 to Base58:', {
		base64Length: base64Key.length,
		bytesLength: bytes.length,
		isValidLength: bytes.length === 64
	});

	if (bytes.length !== 64) {
		throw new Error(`Invalid private key length: ${bytes.length} bytes. Expected 64 bytes.`);
	}

	// Convert to Base58
	const base58Key = bs58.encode(bytes) as Base58PrivateKey;
	console.log('✅ Converted to Base58:', {
		base58Length: base58Key.length,
		base58Preview: base58Key.substring(0, 10) + '...'
	});

	return base58Key;
};

// Helper function to convert Buffer to Base58PrivateKey safely
export const toBase58PrivateKey = (bytes: Uint8Array): Base58PrivateKey => {
	if (bytes.length !== 64) {
		throw new Error(`Invalid private key length: ${bytes.length} bytes. Expected 64 bytes.`);
	}
	return bs58.encode(bytes) as Base58PrivateKey;
};

// Helper to store credentials safely
export const storeCredentials = async (privateKey: Base58PrivateKey, mnemonic: string): Promise<void> => {
	console.log('🔐 Storing credentials:', {
		privateKeyFormat: 'Base58',
		privateKeyLength: privateKey.length,
		privateKeyPreview: privateKey.substring(0, 10) + '...',
		privateKeyFullHex: Buffer.from(bs58.decode(privateKey)).toString('hex'),
		mnemonicLength: mnemonic.length,
		mnemonicPreview: mnemonic.substring(0, 10) + '...',
		service: KEYCHAIN_SERVICE
	});

	try {
		// First clear any existing credentials
		await Keychain.resetGenericPassword({
			service: KEYCHAIN_SERVICE
		});
		console.log('🧹 Cleared existing credentials');

		// Store credentials with a fixed username and JSON string as password
		const credentials = JSON.stringify({
			privateKey,
			mnemonic
		});

		await Keychain.setGenericPassword('dankfolio_wallet', credentials, {
			service: KEYCHAIN_SERVICE,
			accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED
		});
		console.log('✅ Credentials stored in keychain');

		// Verify the stored credentials
		const storedCredentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE
		});

		if (!storedCredentials) {
			throw new Error('Failed to verify stored credentials - no data found');
		}

		try {
			const parsedCredentials = JSON.parse(storedCredentials.password);
			const retrievedPrivateKey = parsedCredentials.privateKey;
			const retrievedMnemonic = parsedCredentials.mnemonic;

			console.log('🔍 Stored vs Retrieved:', {
				original: {
					privateKey: privateKey.substring(0, 10) + '...',
					privateKeyLength: privateKey.length,
					privateKeyHex: Buffer.from(bs58.decode(privateKey)).toString('hex').substring(0, 10) + '...',
				},
				retrieved: {
					privateKey: retrievedPrivateKey ? retrievedPrivateKey.substring(0, 10) + '...' : 'null',
					privateKeyLength: retrievedPrivateKey?.length || 0,
					privateKeyHex: retrievedPrivateKey ?
						Buffer.from(bs58.decode(retrievedPrivateKey)).toString('hex').substring(0, 10) + '...' :
						'null',
				}
			});

			if (!retrievedPrivateKey || retrievedPrivateKey !== privateKey) {
				throw new Error('Failed to verify stored private key - mismatch in retrieved value');
			}

			// Verify we can create a valid keypair from the stored key
			const keypairBytes = Buffer.from(bs58.decode(retrievedPrivateKey));
			if (keypairBytes.length !== 64) {
				throw new Error(`Retrieved key has invalid length: ${keypairBytes.length} bytes`);
			}
			const keypair = Keypair.fromSecretKey(keypairBytes);
			console.log('✅ Successfully verified keypair creation from stored key');

			if (!retrievedMnemonic || retrievedMnemonic !== mnemonic) {
				throw new Error('Failed to verify stored mnemonic');
			}

			console.log('✅ All credentials verified successfully');
		} catch (error) {
			console.error('❌ Error verifying stored credentials:', error);
			throw error;
		}
	} catch (error) {
		console.error('❌ Error storing or verifying credentials:', error);
		// Clean up on failure
		await Keychain.resetGenericPassword({
			service: KEYCHAIN_SERVICE
		});
		throw error;
	}
};

export const handleGenerateWallet = async (): Promise<Keypair> => {
	try {
		console.log("📞 Calling grpcApi.createWallet...");
		const newWalletData = await grpcApi.createWallet();
		if (!newWalletData || !newWalletData.secret_key || !newWalletData.mnemonic) {
			console.error('❌ Failed to generate wallet from API or missing data:', {
				hasWalletData: !!newWalletData,
				hasSecretKey: !!newWalletData?.secret_key,
				hasMnemonic: !!newWalletData?.mnemonic
			});
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

			// Log the Base64 key format
			console.log('🔑 Processing secret key:', {
				base64Length: base64Key.length,
				base64Preview: base64Key.substring(0, 10) + '...'
			});

			// Decode the Base64 key
			keypairBytes = Buffer.from(base64Key, 'base64');
			console.log('📦 Decoded keypair bytes:', {
				length: keypairBytes.length,
				isValidLength: keypairBytes.length === 64
			});

			if (keypairBytes.length !== 64) {
				throw new Error(`Decoded keypair has incorrect length: ${keypairBytes.length}, expected 64`);
			}
		} catch (e) {
			console.error('❌ Error decoding Base64 secret_key from API:', e);
			console.error('Raw secret_key received:', newWalletData.secret_key);
			throw new Error('Could not decode secret key from API response.');
		}

		// Create keypair and convert to Base58
		const keypair = Keypair.fromSecretKey(keypairBytes);
		const base58PrivateKey = toBase58PrivateKey(keypairBytes);

		console.log('🔑 Created keypair:', {
			publicKey: keypair.publicKey.toString(),
			base58PrivateKeyLength: base58PrivateKey.length,
			base58PrivateKeyPreview: base58PrivateKey.substring(0, 10) + '...'
		});

		// Store securely in Base58 format
		await storeCredentials(base58PrivateKey, newWalletData.mnemonic);

		if (keypair.publicKey.toBase58() !== newWalletData.public_key) {
			console.warn('⚠️ WARNING: Public key mismatch:', {
				derived: keypair.publicKey.toBase58(),
				received: newWalletData.public_key
			});
		}

		// Store in portfolio store
		await usePortfolioStore.getState().setWallet(keypair.publicKey.toBase58());

		console.log('✅ New wallet generated, stored, and Keypair created.');
		return keypair;
	} catch (error) {
		console.error('❌ Error in handleGenerateWallet:', error);
		throw error;
	}
};

export const handleImportWallet = async (mnemonic: string): Promise<Keypair> => {
	try {
		console.log('🔑 Importing wallet with mnemonic...');
		if (!bip39.validateMnemonic(mnemonic)) {
			console.error('❌ Invalid mnemonic phrase provided.');
			throw new Error('Invalid mnemonic phrase.');
		}
		const seed = await bip39.mnemonicToSeed(mnemonic);
		// Derive the keypair using the Solana path (first 32 bytes of seed)
		const derivedSeed = seed.subarray(0, 32);
		const keypair = Keypair.fromSeed(derivedSeed);

		// Convert to Base58 format
		const base58PrivateKey = toBase58PrivateKey(keypair.secretKey);

		// Store securely
		await storeCredentials(base58PrivateKey, mnemonic);

		// Store in portfolio store
		await usePortfolioStore.getState().setWallet(keypair.publicKey.toBase58());

		console.log('✅ Wallet imported from mnemonic, stored, and Keypair created.');
		return keypair;
	} catch (error) {
		console.error('❌ Error in handleImportWallet:', error);
		throw error;
	}
};

export const retrieveWalletFromStorage = async (): Promise<string | null> => {
	try {
		const credentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE
		});

		if (!credentials) {
			console.log('❓ No wallet credentials found in secure storage.');
			return null;
		}

		console.log('🔑 Retrieved credentials from secure storage.');
		try {
			const parsedCredentials = JSON.parse(credentials.password);
			const privateKey = parsedCredentials.privateKey;

			// Verify the Base58 private key is valid
			const keypairBytes = Buffer.from(bs58.decode(privateKey));
			if (keypairBytes.length !== 64) {
				throw new Error(`Invalid private key length: ${keypairBytes.length} bytes`);
			}
			// Verify the keypair is valid by reconstructing it
			const keypair = Keypair.fromSecretKey(keypairBytes);
			console.log('✅ Valid keypair found in storage.');
			return keypair.publicKey.toBase58();
		} catch (error) {
			console.warn('⚠️ Invalid private key in storage. Clearing credentials.');
			await Keychain.resetGenericPassword({
				service: KEYCHAIN_SERVICE
			});
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
		const credentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE
		});

		if (!credentials) {
			console.log('❓ No credentials found in secure storage.');
			return null;
		}

		try {
			const parsedCredentials = JSON.parse(credentials.password);
			console.log('🔑 Retrieved mnemonic from secure storage.');
			return parsedCredentials.mnemonic;
		} catch (error) {
			console.error('❌ Error parsing stored credentials:', error);
			return null;
		}
	} catch (error) {
		console.error('❌ Error retrieving mnemonic from storage:', error);
		return null;
	}
}; 