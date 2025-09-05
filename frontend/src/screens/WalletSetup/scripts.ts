// Polyfills must be imported first
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

import * as Keychain from 'react-native-keychain';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
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
		logger.info("Generating new wallet locally (secure client-side generation)...");

		// SECURITY: Generate wallet entirely on client side
		// The server will never see the private key or mnemonic

		// 1. Generate mnemonic phrase (12 words)
		const mnemonic = bip39.generateMnemonic(128); // 128 bits = 12 words
		if (!mnemonic) {
			throw new Error('Failed to generate mnemonic phrase');
		}

		// 2. Generate seed from mnemonic
		const seed = await bip39.mnemonicToSeed(mnemonic);
		const derivedSeed = seed.subarray(0, 32);

		// 3. Create keypair from seed
		const keypair = Keypair.fromSeed(derivedSeed);

		// 4. Convert to Base58 format for storage
		const base58PrivateKeyOutput = toBase58PrivateKey(keypair.secretKey);

		// 5. Store securely in device keychain (never sent to server)
		await storeCredentials(base58PrivateKeyOutput, mnemonic);

		// Small delay to ensure keychain write has propagated
		await new Promise(resolve => setTimeout(resolve, 150));

		// 6. Store public key in portfolio store
		const publicKey = keypair.publicKey.toBase58();
		await usePortfolioStore.getState().setWallet(publicKey);

		// 7. Register ONLY the public key with the backend (secure approach)
		try {
			await grpcApi.registerWallet({ publicKey });
			logger.info('Wallet registered with backend (public key only)');
		} catch (regError) {
			// Registration failure is not critical - wallet is still usable
			logger.warn('Failed to register wallet with backend, continuing anyway', { error: regError });
		}

		logger.info('New wallet generated locally and stored securely');
		logger.breadcrumb({ category: 'wallet_setup', message: 'Wallet generated successfully', data: { publicKey } });

		return {
			keypair,
			walletData: {
				publicKey,
				privateKey: base58PrivateKeyOutput,
				mnemonic
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

		// Store securely (never sent to server)
		await storeCredentials(base58PrivateKeyOutput, mnemonic);

		// Small delay to ensure keychain write has propagated before portfolio store reads
		await new Promise(resolve => setTimeout(resolve, 150));

		// Store in portfolio store
		const publicKey = keypair.publicKey.toBase58();
		await usePortfolioStore.getState().setWallet(publicKey);

		// Register ONLY the public key with the backend (secure approach)
		try {
			await grpcApi.registerWallet({ publicKey });
			logger.info('Imported wallet registered with backend (public key only)');
		} catch (regError) {
			// Registration failure is not critical - wallet is still usable
			logger.warn('Failed to register imported wallet with backend, continuing anyway', { error: regError });
		}

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
// const KEYCHAIN_SERVICE_LOCAL = 'com.kaiju.wallet'; // Remove local definition

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

// --- Kaiju WalletSetup Business Logic ---
export const WELCOME_TITLE = 'Welcome';
export const WELCOME_DESC = 'Your gateway to the meme economy';
export const CREATE_WALLET_TITLE = 'Create a new wallet';
export const CREATE_WALLET_DESC = 'This will be your new wallet. You can use it to store, send, and receive digital assets.';
export const IMPORT_WALLET_TITLE = 'Recovery phrase';
export const IMPORT_WALLET_DESC = 'Enter your 12-word recovery phrase';
export const TERMS_TEXT = 'By proceeding, you agree to our Terms & Conditions';
export const DEFAULT_SOL_AMOUNT = 0.000000001;
export const CREATING_WALLET_TITLE = 'Creating your wallet';
export const CREATING_WALLET_DESC = 'Please wait while we set up your wallet...';
export const IMPORTING_WALLET_TITLE = 'Importing your wallet';
export const IMPORTING_WALLET_DESC = 'Please wait while we import your wallet...';
export const WALLET_CREATED_TITLE = 'Wallet successfully created!';
export const WALLET_CREATED_DESC = 'Your wallet has been created. Here is your recovery phrase. Make sure to save it in a secure place.';

export function useWalletSetupLogic(props: WalletSetupScreenProps) {
	const [step, setStep] = useState<WalletSetupStep>('welcome');
	const [recoveryPhrase, setRecoveryPhrase] = useState('');
	const [nextAction, setNextAction] = useState<'create' | 'import' | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [walletInfo, setWalletInfo] = useState<WalletInfo>({
		publicKey: '',
		privateKey: '',
		mnemonic: '',
		isLoading: false
	});

	const goToWelcome = () => setStep('welcome');
	const goToTerms = (action: 'create' | 'import') => {
		setNextAction(action);
		setStep('terms');
	};
	const goToImport = () => setStep('import');


	const handleTermsAccepted = async () => {
		if (nextAction === 'create') {
			// Skip the intermediate create screen and create wallet automatically
			await handleCreateWallet();
		} else if (nextAction === 'import') {
			setStep('import');
		}
	};

	const handleCreateWallet = async () => {
		logger.breadcrumb({ category: 'wallet_setup', message: 'Create wallet process started' });
		setIsImporting(false);
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
		setIsImporting(true);
		setStep('creating');
		setWalletInfo((prev: WalletInfo) => ({ ...prev, isLoading: true }));

		try {
			const keypair = await handleImportWallet(recoveryPhrase.trim()); // This now uses the imported storeCredentials
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
		setRecoveryPhrase(value.trim());
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
		goToWelcome,
		goToTerms,
		goToImport,
		handleTermsAccepted,
		handleCreateWallet,
		handleImportWallet: handleImportWalletClick,
		recoveryPhrase,
		handleRecoveryPhraseChange,
		isRecoveryPhraseValid,
		walletInfo,
		confirmWalletSaved,
		isImporting,
	};
} 
