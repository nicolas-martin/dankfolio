import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import { storeCredentials } from './keychainService';
import { base64ToBase58PrivateKey, Base58PrivateKey } from './cryptoUtils';

/**
 * Initializes a debug wallet for testing purposes.
 * NOTE: This uses environment variables for simplicity in development.
 * For production systems, consider using a secure key management service.
 */
export async function initializeDebugWallet(): Promise<Keypair | null> {
	try {
		logger.log('Attempting to load debug wallet via initializeDebugWallet...');
		
		// Check if we should load a debug wallet
		if (!env.loadDebugWallet) {
			logger.log('Debug wallet loading is disabled');
			return null;
		}
		
		if (!env.testPrivateKey) {
			// For unit tests that don't need funded wallets, generate ephemeral
			if (env.appEnv === 'test') {
				logger.log('Generating ephemeral test wallet for unit tests');
				const keypair = Keypair.generate();
				
				// Store with dummy mnemonic for consistency
				const base58PrivateKey = bs58.encode(keypair.secretKey) as any; // Cast needed for branded type
				await storeCredentials(base58PrivateKey, 'EPHEMERAL_TEST_WALLET');
				
				logger.info('Ephemeral test wallet initialized', { 
					publicKey: keypair.publicKey.toBase58() 
				});
				return keypair;
			}
			
			logger.warn('TEST_PRIVATE_KEY is not set in the environment variables.');
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

		// Don't set wallet in portfolio store here - let the caller handle it
		// This prevents duplicate setWallet calls when App.tsx calls handleWalletSetupComplete

		logger.info('Debug wallet initialized successfully.');
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
