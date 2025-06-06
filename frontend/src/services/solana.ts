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

const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';

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
	} catch (error) {
		// console.error('❌ Error creating keypair:', error); // Sensitive data removed
		throw error;
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
	catch (error) {
		log.error('❌ Error in prepareSwapRequest:', error);
		throw error;
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
	} catch (error) {
		log.error('❌ Error in buildAndSignSwapTransaction:', error);
		throw error;
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
		return prepareResponse.unsignedTransaction;
	}
	catch (error) {
		log.error('❌ Error in prepareCoinTransfer:', error);
		throw error;
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

		// Sign the transaction
		log.log('✍️ Signing transaction...');
		const transaction = Transaction.from(transactionBuf);

		// Always get a fresh blockhash to ensure transaction is recent
		const { blockhash } = await connection.getLatestBlockhash('confirmed');
		log.log('🔑 Setting fresh blockhash:', blockhash);
		transaction.recentBlockhash = blockhash;

		// Sign with our keypair
		transaction.sign(keypair);

		// Serialize the signed transaction
		log.log('📦 Serializing signed transaction...');
		const serializedTransaction = transaction.serialize().toString('base64');
		log.log('Transfer transaction signed and serialized');

		return serializedTransaction;
	} catch (error) {
		log.error('Failed to build and sign transaction:', error);
		throw error;
	}
};

export const validateSolanaAddress = async (address: string): Promise<boolean> => {
	try {
		const publicKey = new PublicKey(address);
		return PublicKey.isOnCurve(publicKey.toBytes());
	} catch (error) {
		return false;
	}
};
