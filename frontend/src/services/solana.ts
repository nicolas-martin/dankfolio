import { Keypair, VersionedTransaction, PublicKey, Transaction, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { Base58PrivateKey } from '@/types';
import { env } from '@utils/env';
import { grpcApi } from '@/services/grpcApi';
import { logger as log } from '@/utils/logger';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
global.Buffer = Buffer;

const _KEYCHAIN_SERVICE = 'com.dankfolio.wallet'; // Prefixed unused variable

// Log the environment variable for debugging
log.log('🔧 SOLANA_RPC_ENDPOINT from environment:', env.solanaRpcEndpoint);

if (!env.solanaRpcEndpoint) {
	const errorMsg = 'SOLANA_RPC_ENDPOINT environment variable is required but not set. Please check your environment configuration.';
	log.error('❌ Environment Error:', errorMsg);
	throw new Error(errorMsg);
}


const SOLANA_RPC_ENDPOINT: string = env.solanaRpcEndpoint;

const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

export const getKeypairFromPrivateKey = (privateKey: Base58PrivateKey): Keypair => {
	try {
		const secretKey = bs58.decode(privateKey);
		if (secretKey.length !== 64) {
			throw new Error(`Invalid private key length: ${secretKey.length} bytes. Expected 64 bytes.`);
		}
		const keypair = Keypair.fromSecretKey(secretKey);
		// console.log('🔐 Created keypair from Base58 private key:', { // Sensitive data removed
		// 	publicKey: keypair.publicKey.toString(),
		// 	secretKeyLength: keypair.secretKey.length
		// });
		return keypair;
	} catch (error: unknown) {
		// console.error('❌ Error creating keypair:', error); // Sensitive data removed
		if (error instanceof Error) {
			throw error;
		} else {
			console.error("An unknown error occurred in getKeypairFromPrivateKey:", error);
			throw new Error(`An unknown error occurred in getKeypairFromPrivateKey: ${error}`);
		}
	}
};

export const prepareSwapRequest = async (
	fromCoinId: string,
	toCoinId: string,
	amount: number,
	slippage: number,
	userPublicKey: string
): Promise<string> => {
	try {
		if (!userPublicKey) {
			throw new Error('No userPublicKey provided for prepareSwapRequest');
		}

		log.log('Building swap transaction with:', {
			fromCoinId,
			toCoinId,
			amount,
			slippage,
			userPublicKeyLength: userPublicKey.length
		});

		// Prepare the swap transaction using our gRPC API
		const prepareSwapRequest = {
			fromCoinId,
			toCoinId,
			amount: amount.toString(),
			slippageBps: (slippage * 100).toString(),
			userPublicKey: userPublicKey
		};
		const prepareResponse = await grpcApi.prepareSwap(prepareSwapRequest);

		if (!prepareResponse.unsignedTransaction) {
			throw new Error('No unsigned transaction received');
		}
		return prepareResponse.unsignedTransaction;
	}
	catch (error: unknown) {
		if (error instanceof Error) {
			log.error('❌ Error in prepareSwapRequest:', error.message);
			throw error;
		} else {
			log.error("An unknown error occurred in prepareSwapRequest:", error);
			throw new Error(`An unknown error occurred in prepareSwapRequest: ${error}`);
		}
	}
}

export const signSwapTransaction = async (
	unsignedTransaction: string,
	userPublicKey: string,
	privateKey: Base58PrivateKey
): Promise<string> => {
	try {
		if (!userPublicKey) {
			throw new Error('No userPublicKey provided for signSwapTransaction');
		}
		if (!privateKey) {
			throw new Error('No privateKey provided for signSwapTransaction');
		}

		const keypair = getKeypairFromPrivateKey(privateKey);

		if (keypair.publicKey.toString() !== userPublicKey) {
			throw new Error('Derived public key does not match userPublicKey for signSwapTransaction.');
		}

		// Decode and deserialize the transaction
		log.log('📥 Decoding transaction...');
		const transactionBuf = Buffer.from(unsignedTransaction, 'base64');
		log.log('📦 Transaction buffer length:', transactionBuf.length);

		// Sign the transaction
		log.log('✍️ Signing transaction...');
		const transaction = VersionedTransaction.deserialize(transactionBuf);
		transaction.sign([keypair]);

		// Serialize the signed transaction
		const serializedTransaction = transaction.serialize();
		const transactionBase64 = Buffer.from(serializedTransaction).toString('base64');
		log.log('Swap transaction signed and serialized');

		return transactionBase64;
	} catch (error: unknown) {
		if (error instanceof Error) {
			log.error('❌ Error in buildAndSignSwapTransaction:', error.message);
			throw error;
		} else {
			log.error("An unknown error occurred in signSwapTransaction:", error);
			throw new Error(`An unknown error occurred in signSwapTransaction: ${error}`);
		}
	}
};

export const prepareCoinTransfer = async (
	toAddress: string,
	coinMint: string,
	amount: number,
	userPublicKey: string
): Promise<string> => {

	try {
		if (!userPublicKey) {
			throw new Error('No userPublicKey provided for prepareCoinTransfer');
		}

		log.log('Building transfer transaction:', {
			toAddress,
			coinMint: coinMint || 'SOL',
			amount,
			fromAddress: userPublicKey
		});

		// Prepare the transfer transaction using our gRPC API
		const prepareResponse = await grpcApi.prepareCoinTransfer({
			fromAddress: userPublicKey,
			toAddress,
			coinMint,
			amount
		});

		if (!prepareResponse.unsignedTransaction) {
			throw new Error('No unsigned transaction received');
		}

		if (env.appEnv === "development") {
			// 🔍 LOG TRANSACTION PREPARATION FOR TESTING
			console.log('🔍 TRANSACTION PREPARED BY BACKEND:');
			console.log('📋 Raw Response:', prepareResponse);
			console.log('📋 Unsigned Transaction:', prepareResponse.unsignedTransaction);
			console.log('📋 Transaction Type: Transfer');
			console.log('📋 From:', userPublicKey);
			console.log('📋 To:', toAddress);
			console.log('📋 Mint:', coinMint);
			console.log('📋 Amount:', amount);
		}

		return prepareResponse.unsignedTransaction;
	}
	catch (error: unknown) {
		if (error instanceof Error) {
			log.error('❌ Error in prepareCoinTransfer:', error.message);
			throw error;
		} else {
			log.error("An unknown error occurred in prepareCoinTransfer:", error);
			throw new Error(`An unknown error occurred in prepareCoinTransfer: ${error}`);
		}
	};
};

export const signTransferTransaction = async (
	unsignedTransaction: string,
	userPublicKey: string,
	privateKey: Base58PrivateKey
): Promise<string> => {
	try {
		if (!userPublicKey) {
			throw new Error('No userPublicKey provided for signTransferTransaction');
		}
		if (!privateKey) {
			throw new Error('No privateKey provided for signTransferTransaction');
		}

		const keypair = getKeypairFromPrivateKey(privateKey);

		if (keypair.publicKey.toString() !== userPublicKey) {
			throw new Error('Derived public key does not match userPublicKey for signTransferTransaction.');
		}

		// Decode and deserialize the transaction
		log.log('📥 Decoding transaction...');
		const transactionBuf = Buffer.from(unsignedTransaction, 'base64');
		log.log('📦 Transaction buffer length:', transactionBuf.length);

		if (env.appEnv === "development") {
			// 🔍 LOG TRANSACTION DETAILS FOR TESTING
			console.log('🔍 TRANSACTION SIGNING DETAILS:');
			console.log('📋 Input Transaction:', unsignedTransaction);
			console.log('📋 Buffer Length:', transactionBuf.length);
			console.log('📋 User Public Key:', userPublicKey);
			console.log('📋 Keypair Public Key:', keypair.publicKey.toString());

			// ⚠️ TESTING ONLY - LOG PRIVATE KEY (REMOVE IN PRODUCTION!)
			console.log('🔐 PRIVATE KEY FOR TESTING (REMOVE IN PRODUCTION!):', privateKey);
			console.log('🔐 Secret Key Length:', keypair.secretKey.length);
			console.log('🔐 Copy for tests: const CAPTURED_PRIVATE_KEY = \'' + privateKey + '\' as Base58PrivateKey;');
		}

		// Sign the transaction
		log.log('✍️ Signing transaction...');
		const transaction = Transaction.from(transactionBuf);

		// 🔍 LOG TRANSACTION STRUCTURE
		console.log('📋 Transaction Instructions Count:', transaction.instructions.length);
		console.log('📋 Transaction Fee Payer:', transaction.feePayer?.toString());
		console.log('📋 Transaction Recent Blockhash (before):', transaction.recentBlockhash);

		// Always get a fresh blockhash to ensure transaction is recent
		const { blockhash } = await connection.getLatestBlockhash('confirmed');
		log.log('🔑 Setting fresh blockhash:', blockhash);
		transaction.recentBlockhash = blockhash;

		console.log('📋 Transaction Recent Blockhash (after):', transaction.recentBlockhash);

		// Sign with our keypair
		transaction.sign(keypair);

		// Serialize the signed transaction
		log.log('📦 Serializing signed transaction...');
		const serializedTransaction = transaction.serialize().toString('base64');
		log.log('Transfer transaction signed and serialized');

		// 🔍 LOG FINAL SIGNED TRANSACTION
		console.log('🔍 FINAL SIGNED TRANSACTION:');
		console.log('📋 Serialized Transaction:', serializedTransaction);
		console.log('📋 Final Length:', serializedTransaction.length);

		return serializedTransaction;
	} catch (error: unknown) {
		if (error instanceof Error) {
			log.error('Failed to build and sign transaction:', error.message);
			throw error;
		} else {
			log.error("An unknown error occurred in signTransferTransaction:", error);
			throw new Error(`An unknown error occurred in signTransferTransaction: ${error}`);
		}
	}
};

export const validateSolanaAddress = async (address: string): Promise<boolean> => {
	try {
		const publicKey = new PublicKey(address);
		return PublicKey.isOnCurve(publicKey.toBytes());
	} catch (error: unknown) {
		if (error instanceof Error) {
			// Log or handle the error message if needed
			// console.error(error.message);
		} else {
			// Handle cases where the thrown value is not an Error object
			// console.error("An unknown error occurred:", error);
		}
		return false;
	}
};
