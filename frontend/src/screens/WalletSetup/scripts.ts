import * as Keychain from 'react-native-keychain';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer'; // Keep Buffer if still used by other functions in this file
import { grpcApi } from '@/services/grpcApi';
import { usePortfolioStore } from '@store/portfolio';
// bs58 might still be used by other functions, if not, it can be removed.
// For now, assume it might be needed by other functions not touched in this refactor.
import bs58 from 'bs58';
import { useState } from 'react';
// Import newly created/moved utility functions
import { toBase58PrivateKey, Base58PrivateKey } from '@/utils/cryptoUtils';
import { storeCredentials, KEYCHAIN_SERVICE } from '@/utils/keychainService'; // Import KEYCHAIN_SERVICE
// Removed Clipboard import - now using CopyToClipboard component
import { WalletSetupStep, WalletSetupScreenProps, WalletInfo } from './types';
import { logger } from '@/utils/logger';

// Note: Base58PrivateKey type is now imported from @/utils/cryptoUtils
// Note: KEYCHAIN_SERVICE constant is now defined in @/utils/keychainService.ts
//       If it were used by other functions in this file, it would need to be imported or redefined.
//       For this refactor, assuming it's not needed by remaining functions here.

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
			const { keypair: _keypair, walletData } = await handleGenerateWallet(); // Prefixed unused keypair
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
	};
} 
