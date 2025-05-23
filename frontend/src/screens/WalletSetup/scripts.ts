import * as Keychain from 'react-native-keychain';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer'; // Import Buffer for hex conversion
import { grpcApi } from '@/services/grpcApi'; // Import grpcApi
import { usePortfolioStore } from '@store/portfolio';
import bs58 from 'bs58';
import { useState } from 'react';
import { WalletSetupStep, WalletSetupState, WalletSetupScreenProps, WalletInfo } from './types';
import { logger } from '@/utils/logger';

// Branded type for Base58 private keys to ensure type safety
type Base58PrivateKey = string & { readonly __brand: unique symbol };

const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';
const KEYCHAIN_USERNAME_PRIVATE_KEY = 'userPrivateKey';
const KEYCHAIN_USERNAME_MNEMONIC = 'userMnemonic';

// Helper function to convert Base64 to Base58PrivateKey
export const base64ToBase58PrivateKey = (base64Key: string): Base58PrivateKey => {
	// Decode Base64 to bytes
	const bytes = Buffer.from(base64Key, 'base64');
	logger.log('Converting Base64 to Base58', {
		base64Length: base64Key.length,
		bytesLength: bytes.length,
		isValidLength: bytes.length === 64  // This will be logged as part of the object
	});

	if (bytes.length !== 64) {
		// This error will be caught by the calling function, so no need to log separately here
		throw new Error(`Invalid private key length: ${bytes.length} bytes. Expected 64 bytes.`);
	}

	// Convert to Base58
	const base58Key = bs58.encode(bytes) as Base58PrivateKey;
	logger.log('Converted to Base58', {
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
			const retrievedPrivateKey = parsedCredentials.privateKey;
			const retrievedMnemonic = parsedCredentials.mnemonic;

			if (!retrievedPrivateKey || retrievedPrivateKey !== privateKey) {
				throw new Error('Failed to verify stored private key - mismatch in retrieved value');
			}

			// Verify we can create a valid keypair from the stored key
			const keypairBytes = Buffer.from(bs58.decode(retrievedPrivateKey));
			if (keypairBytes.length !== 64) {
				throw new Error(`Retrieved key has invalid length: ${keypairBytes.length} bytes`);
			}
			const keypair = Keypair.fromSecretKey(keypairBytes);

			if (!retrievedMnemonic || retrievedMnemonic !== mnemonic) {
				throw new Error('Failed to verify stored mnemonic');
			}

			logger.info('Wallet credentials stored and verified');
		} catch (error) {
			logger.exception(error, { functionName: 'storeCredentials', context: 'VerificationStep' });
			throw error;
		}
	} catch (error) {
		logger.exception(error, { functionName: 'storeCredentials' });
		// Clean up on failure
		await Keychain.resetGenericPassword({
			service: KEYCHAIN_SERVICE
		});
		throw error;
	}
};

export const handleGenerateWallet = async (): Promise<Keypair> => {
	logger.breadcrumb({ category: 'wallet_setup', message: 'Wallet generation started' });
	try {
		logger.info("Generating new wallet...");
		const newWalletData = await grpcApi.createWallet();
		if (!newWalletData || !newWalletData.secret_key || !newWalletData.mnemonic) {
			throw new Error('Failed to generate wallet from API.');
		}

		let base64Key = newWalletData.secret_key;
		if (base64Key.startsWith('"') && base64Key.endsWith('"')) {
			base64Key = base64Key.substring(1, base64Key.length - 1);
		}

		const keypairBytes = Buffer.from(base64Key, 'base64');
		if (keypairBytes.length !== 64) {
			throw new Error(`Decoded keypair has incorrect length: ${keypairBytes.length}, expected 64`);
		}

		// Create keypair and convert to Base58
		const keypair = Keypair.fromSecretKey(keypairBytes);
		const base58PrivateKey = toBase58PrivateKey(keypairBytes);

		// Store securely in Base58 format
		await storeCredentials(base58PrivateKey, newWalletData.mnemonic);

		// Verify public key matches
		if (keypair.publicKey.toBase58() !== newWalletData.public_key) {
			logger.warn('Public key mismatch detected during wallet generation.', { generatedPubKey: keypair.publicKey.toBase58(), expectedPubKey: newWalletData.public_key });
		}

		// Store in portfolio store
		await usePortfolioStore.getState().setWallet(keypair.publicKey.toBase58());

		logger.info('New wallet generated and stored');
		logger.breadcrumb({ category: 'wallet_setup', message: 'Wallet generated successfully', data: { publicKey: keypair.publicKey.toBase58() } });
		return keypair;
	} catch (error) {
		logger.exception(error, { functionName: 'handleGenerateWallet' });
		throw error;
	}
};

export const handleImportWallet = async (mnemonic: string): Promise<Keypair> => {
	logger.breadcrumb({ category: 'wallet_setup', message: 'Wallet import started' });
	try {
		logger.info('Importing wallet from mnemonic...');
		if (!bip39.validateMnemonic(mnemonic)) {
			// This error is caught and handled by the UI, no need to log as exception here
			throw new Error('Invalid mnemonic phrase.');
		}
		const seed = await bip39.mnemonicToSeed(mnemonic);
		const derivedSeed = seed.subarray(0, 32);
		const keypair = Keypair.fromSeed(derivedSeed);

		// Convert to Base58 format
		const base58PrivateKey = toBase58PrivateKey(keypair.secretKey);

		// Store securely
		await storeCredentials(base58PrivateKey, mnemonic);

		// Store in portfolio store
		await usePortfolioStore.getState().setWallet(keypair.publicKey.toBase58());

		logger.info('Wallet imported and stored');
		logger.breadcrumb({ category: 'wallet_setup', message: 'Wallet imported successfully', data: { publicKey: keypair.publicKey.toBase58() } });
		return keypair;
	} catch (error) {
		// Log as exception if it's not the "Invalid mnemonic phrase" error, which is handled.
		if (error.message !== 'Invalid mnemonic phrase.') {
			logger.exception(error, { functionName: 'handleImportWallet' });
		}
		throw error;
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
			const privateKey = parsedCredentials.privateKey;

			// Verify the Base58 private key is valid
			const keypairBytes = Buffer.from(bs58.decode(privateKey));
			if (keypairBytes.length !== 64) {
				throw new Error(`Invalid private key length: ${keypairBytes.length} bytes`);
			}
			// Verify the keypair is valid by reconstructing it
			const keypair = Keypair.fromSecretKey(keypairBytes);
			logger.info('Wallet retrieved from storage.');
			return keypair.publicKey.toBase58();
		} catch (error) {
			logger.warn('Invalid wallet data in storage, clearing credentials.', { error: error.message });
			await Keychain.resetGenericPassword({
				service: KEYCHAIN_SERVICE
			});
			return null;
		}
	} catch (error) {
		logger.error('Error accessing storage during wallet retrieval.', { error: error.message });
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
			logger.info('No mnemonic found in storage.');
			return null;
		}

		try {
			const parsedCredentials = JSON.parse(credentials.password);
			return parsedCredentials.mnemonic;
		} catch (error) {
			logger.error('Error parsing stored mnemonic.', { error: error.message });
			return null;
		}
	} catch (error) {
		logger.error('Error accessing storage during mnemonic retrieval.', { error: error.message });
		return null;
	}
};

// --- Dankfolio WalletSetup Business Logic ---
export const WELCOME_TITLE = 'Welcome to the future of finance';
export const WELCOME_DESC = 'Your gateway to the decentralized world. Manage your digital assets with ease and security.';
export const CREATE_WALLET_TITLE = 'Create a new wallet';
export const CREATE_WALLET_DESC = 'This will be your new wallet. You can use it to store, send, and receive digital assets.';
export const IMPORT_WALLET_TITLE = 'Recovery phrase';
export const IMPORT_WALLET_DESC = 'Enter your 12-word recovery phrase';
export const TERMS_TEXT = 'By proceeding, you agree to our Terms of Service and Privacy Policy.';
export const DEFAULT_SOL_AMOUNT = 0.000000001;
export const CREATING_WALLET_TITLE = 'Creating your wallet';
export const CREATING_WALLET_DESC = 'Please wait while we set up your wallet...';
export const WALLET_CREATED_TITLE = 'Wallet successfully created!';
export const WALLET_CREATED_DESC = 'Your wallet has been created. Here is your recovery phrase. Make sure to save it in a secure place.';

export function useWalletSetupLogic(props: WalletSetupScreenProps) {
	const [step, setStep] = useState<WalletSetupStep>('welcome');
	const [recoveryPhrase, setRecoveryPhrase] = useState('');
	const [walletInfo, setWalletInfo] = useState<WalletInfo>({
		publicKey: '',
		mnemonic: '',
		isLoading: false
	});

	const goToCreate = () => setStep('create');
	const goToImport = () => setStep('import');
	const goToWelcome = () => setStep('welcome');

	const handleCreateWallet = async () => {
		logger.breadcrumb({ category: 'wallet_setup', message: 'Create wallet process started' });
		setStep('creating');
		setWalletInfo((prev: WalletInfo) => ({ ...prev, isLoading: true }));
		
		try {
			const keypair = await handleGenerateWallet();
			setWalletInfo({
				publicKey: keypair.publicKey.toBase58(),
				mnemonic: await retrieveMnemonicFromStorage() || '',
				isLoading: false
			});
			
			// Delay the call to onWalletSetupComplete to allow showing the success screen
			setTimeout(() => {
				props.onWalletSetupComplete(keypair);
			}, 5000);
		} catch (error) {
			logger.exception(error, { functionName: 'handleCreateWallet', context: 'useWalletSetupLogic' });
			setWalletInfo((prev: WalletInfo) => ({ ...prev, isLoading: false }));
			setStep('create'); // Go back to create screen on error
		}
	};

	const handleImportWalletClick = async () => {
		if (!isRecoveryPhraseValid()) return;
		logger.breadcrumb({ category: 'wallet_setup', message: 'Import wallet process started' });
		setStep('creating');
		setWalletInfo((prev: WalletInfo) => ({ ...prev, isLoading: true }));
		
		try {
			const keypair = await handleImportWallet(recoveryPhrase);
			props.onWalletSetupComplete(keypair);
		} catch (error) {
			// The error from handleImportWallet (e.g. invalid mnemonic) is already potentially logged there
			// or is an expected error for the UI.
			// Only log as a new exception if it's something unexpected here.
			if (error.message !== 'Invalid mnemonic phrase.') {
				logger.exception(error, { functionName: 'handleImportWalletClick', context: 'useWalletSetupLogic' });
			}
			setWalletInfo((prev: WalletInfo) => ({ ...prev, isLoading: false }));
			setStep('import'); // Go back to import screen on error
		}
	};

	const handleRecoveryPhraseChange = (value: string) => {
		setRecoveryPhrase(value);
	};

	const isRecoveryPhraseValid = () => {
		// Simple validation: 12 words, separated by spaces
		return recoveryPhrase.trim().split(/\s+/).length === 12;
	};

	return {
		step,
		goToCreate,
		goToImport,
		goToWelcome,
		handleCreateWallet,
		handleImportWallet: handleImportWalletClick,
		recoveryPhrase,
		handleRecoveryPhraseChange,
		isRecoveryPhraseValid,
		walletInfo
	};
} 
