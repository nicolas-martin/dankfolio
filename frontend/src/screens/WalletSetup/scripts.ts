import * as Keychain from 'react-native-keychain';
import * as bip39 from 'bip39';
import { grpcApi } from '@/services/grpcApi';
// bs58 might still be used by other functions, if not, it can be removed.
// For now, assume it might be needed by other functions not touched in this refactor.
import { useState } from 'react';
// Import newly created/moved utility functions
import Clipboard from '@react-native-clipboard/clipboard';
import { WalletSetupStep, WalletSetupScreenProps, WalletInfo } from './types';
import { ToastProps } from '@/components/Common/Toast/toast_types';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import { usePortfolioStore } from '@/store/portfolio'; // Corrected path

// Note: Base58PrivateKey type is now imported from @/utils/cryptoUtils
// Note: KEYCHAIN_SERVICE constant is now defined in @/utils/keychainService.ts
//       If it were used by other functions in this file, it would need to be imported or redefined.
//       For this refactor, assuming it's not needed by remaining functions here.

export type Base58PrivateKey = string & { readonly __brand: unique symbol };
export const handleGenerateWallet = async (): Promise<{ keypair: Keypair; walletData: { publicKey: string; privateKey: Base58PrivateKey; mnemonic: string } }> => {
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
		const base58PrivateKeyOutput = toBase58PrivateKey(keypairBytes);

		// Store securely in Base58 format
		await storeCredentials(base58PrivateKeyOutput, newWalletData.mnemonic);

		// Verify public key matches
		if (keypair.publicKey.toBase58() !== newWalletData.public_key) {
			logger.warn('Public key mismatch detected during wallet generation.', { generatedPubKey: keypair.publicKey.toBase58(), expectedPubKey: newWalletData.public_key });
		}

		// Store in portfolio store
		await usePortfolioStore.getState().setWallet(keypair.publicKey.toBase58());

		logger.info('New wallet generated and stored');
		logger.breadcrumb({ category: 'wallet_setup', message: 'Wallet generated successfully', data: { publicKey: keypair.publicKey.toBase58() } });

		return {
			keypair,
			walletData: {
				publicKey: newWalletData.public_key,
				privateKey: base58PrivateKeyOutput, // Ensure this is the Base58 string
				mnemonic: newWalletData.mnemonic
			}
		};
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
		const base58PrivateKeyOutput = toBase58PrivateKey(keypair.secretKey);

		// Store securely
		await storeCredentials(base58PrivateKeyOutput, mnemonic);

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

// Optional: Function to retrieve mnemonic if needed elsewhere
// This function was not part of the move, so it remains here.
// It will need access to KEYCHAIN_SERVICE if it's to function.
// For now, let's assume it might be used and keep it, but it might need adjustment
// if KEYCHAIN_SERVICE was only defined locally before.
// For the purpose of this refactor, we will assume KEYCHAIN_SERVICE needs to be
// accessible here if this function is to remain functional.
// We can redefine it here or import it if made available from keychainService.ts
// const KEYCHAIN_SERVICE_LOCAL = 'com.dankfolio.wallet'; // Remove local definition

export const retrieveMnemonicFromStorage = async (): Promise<string | null> => {
	try {
		const credentials = await Keychain.getGenericPassword({
			service: KEYCHAIN_SERVICE // Use imported constant
		});

		if (!credentials) {
			logger.info('No mnemonic found in storage.');
			return null;
		}

		try {
			const parsedCredentials = JSON.parse(credentials.password);
			return parsedCredentials.mnemonic;
		} catch (error) {
			logger.error('Error parsing stored mnemonic.', { errorMessage: error.message }); // Use errorMessage for consistency
			return null;
		}
	} catch (error) {
		logger.error('Error accessing storage during mnemonic retrieval.', { errorMessage: error.message }); // Use errorMessage
		return null;
	}
};

// --- Dankfolio WalletSetup Business Logic ---
export const WELCOME_TITLE = 'Welcome to DankFolio';
export const WELCOME_DESC = 'Your gateway to the meme economy. Trade, hodl, and laugh your way to the moon with the dankest portfolio in crypto.';
export const CREATE_WALLET_TITLE = 'Create a new wallet';
export const CREATE_WALLET_DESC = 'This will be your new wallet. You can use it to store, send, and receive digital assets.';
export const IMPORT_WALLET_TITLE = 'Recovery phrase';
export const IMPORT_WALLET_DESC = 'Enter your 12-word recovery phrase';
export const TERMS_TEXT = 'By proceeding, you agree to our Terms & Conditions';
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
		privateKey: '',
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
			const { keypair, walletData } = await handleGenerateWallet(); // This now uses the imported storeCredentials
			setWalletInfo({
				publicKey: walletData.publicKey,
				privateKey: walletData.privateKey, // This is Base58PrivateKey from handleGenerateWallet
				mnemonic: walletData.mnemonic,
				isLoading: false
			});

			// Don't automatically navigate - wait for user confirmation
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
			const keypair = await handleImportWallet(recoveryPhrase); // This now uses the imported storeCredentials
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

	const confirmWalletSaved = () => {
		// User confirms they have saved the wallet information
		logger.breadcrumb({ category: 'wallet_setup', message: 'User confirmed wallet information saved' });

		// Find the keypair from the stored wallet info
		if (walletInfo.privateKey) {
			try {
				const keypairBytes = Buffer.from(bs58.decode(walletInfo.privateKey));
				const keypair = Keypair.fromSecretKey(keypairBytes);
				props.onWalletSetupComplete(keypair);
			} catch (error) {
				logger.exception(error, { functionName: 'confirmWalletSaved', context: 'useWalletSetupLogic' });
			}
		}
	};

	const copyToClipboard = async (text: string, label: string, showToast: (options: Partial<ToastProps>) => void) => {
		try {
			Clipboard.setString(text);
			logger.breadcrumb({ category: 'wallet_setup', message: `Copied ${label} to clipboard` });
			showToast({
				message: `${label} copied to clipboard`,
				type: 'success'
			});
		} catch (error) {
			logger.exception(error, { functionName: 'copyToClipboard', context: 'useWalletSetupLogic' });
			showToast({
				message: `Failed to copy ${label}`,
				type: 'error'
			});
		}
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
		walletInfo,
		confirmWalletSaved,
		copyToClipboard
	};
}
// Helper function to convert Base64 to Base58PrivateKey
const base64ToBase58PrivateKey = (base64Key: string): Base58PrivateKey => {
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
const toBase58PrivateKey = (bytes: Uint8Array): Base58PrivateKey => {
	if (bytes.length !== 64) {
		throw new Error(`Invalid private key length: ${bytes.length} bytes. Expected 64 bytes.`);
	}
	return bs58.encode(bytes) as Base58PrivateKey;
};

export async function initializeDebugWallet(): Promise<Keypair | null> {
	try {
		logger.log('Attempting to load debug wallet via initializeDebugWallet...');
		if (!env.testPrivateKey) {
			logger.error('TEST_PRIVATE_KEY not found in environment for debug wallet setup.');
			return null;
		}

		logger.log('Decoding TEST_PRIVATE_KEY as Base64 for debug wallet...');
		// base64ToBase58PrivateKey already logs success/failure details
		const base58PrivateKey: Base58PrivateKey = base64ToBase58PrivateKey(env.testPrivateKey);

		// Store the credentials for the debug wallet
		// Using a fixed mnemonic for debug purposes
		// storeCredentials also logs success/failure
		await storeCredentials(base58PrivateKey, 'TEST_MNEMONIC_DEBUG_WALLET');

		const keypairBytes = Buffer.from(bs58.decode(base58PrivateKey));
		// Keypair.fromSecretKey will throw if key is invalid
		const keypair = Keypair.fromSecretKey(keypairBytes);

		logger.log('Created keypair from debug wallet', { publicKey: keypair.publicKey.toBase58() });

		// Set wallet in portfolio store
		usePortfolioStore.getState().setWallet(keypair.publicKey.toBase58());
		// We won't call fetchPortfolioBalance here, App.tsx can do that after this resolves.

		logger.info('Debug wallet initialized and set in store successfully.');
		return keypair;
	} catch (error: unknown) {
		if (error instanceof Error) {
			logger.error('initializeDebugWallet Error', { errorMessage: error.message, stack: error.stack });
		} else {
			logger.error('An unknown error occurred during initializeDebugWallet', { error });
		}
		return null;
	}
}
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
