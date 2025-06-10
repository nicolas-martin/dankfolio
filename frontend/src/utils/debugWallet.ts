import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import { storeCredentials } from './keychainService';
import { base64ToBase58PrivateKey, Base58PrivateKey } from './cryptoUtils';
import { usePortfolioStore } from '@/store/portfolio';

export async function initializeDebugWallet(): Promise<Keypair | null> {
	try {
		logger.log('Attempting to load debug wallet via initializeDebugWallet...');
		if (!env.testPrivateKey) {
			throw new Error('TEST_PRIVATE_KEY is not set in the environment variables.');
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
