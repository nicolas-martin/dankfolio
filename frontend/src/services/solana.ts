import { Keypair, VersionedTransaction, PublicKey, Transaction, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { RawWalletData, Wallet, Base58PrivateKey } from '@/types';
import { REACT_APP_SOLANA_RPC_ENDPOINT } from '@env';
import { grpcApi } from '@/services/grpcApi';
import { logger as log } from '@/utils/logger';
import * as Keychain from 'react-native-keychain';
import { usePortfolioStore } from '@/store/portfolio';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
global.Buffer = Buffer;

const KEYCHAIN_SERVICE = 'com.dankfolio.wallet';

if (!REACT_APP_SOLANA_RPC_ENDPOINT) {
	throw new Error('REACT_APP_SOLANA_RPC_ENDPOINT environment variable is required');
}

const SOLANA_RPC_ENDPOINT: string = REACT_APP_SOLANA_RPC_ENDPOINT;

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

export const prepareSwapRequest = async(
	fromCoinId: string,
	toCoinId: string,
	amount: number,
	slippage: number
): Promise<string> => {
	try{
		const walletState = usePortfolioStore.getState().wallet;
		if (!walletState || !walletState.address) {
			throw new Error('No wallet address found in store');
		}
		const walletAddress = walletState.address;

		log.log('Building swap transaction with:', {
			fromCoinId,
			toCoinId,
			amount,
			slippage,
			// walletType: typeof walletState, // Should be 'object' or 'null'
			// walletKeys: walletState ? Object.keys(walletState) : [], // Should be ['address'] or []
			addressLength: walletAddress?.length
		});

		// Prepare the swap transaction using our gRPC API
		const prepareSwapRequest = {
			fromCoinId,
			toCoinId,
			amount: amount.toString(),
			slippageBps: (slippage * 100).toString(),
			userPublicKey: walletAddress,
			fromAddress: walletAddress
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

export const signSwapTransaction = async (unsignedTransaction:string): Promise<string> => {
	try {
		const walletState = usePortfolioStore.getState().wallet;
		if (!walletState || !walletState.address) {
			throw new Error('No wallet address found in store for signing');
		}
		const walletAddress = walletState.address;

		const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
		if (!credentials) {
			throw new Error('No credentials found in keychain for signing');
		}

		let privateKey: Base58PrivateKey;
		try {
			const parsedCredentials = JSON.parse(credentials.password) as Partial<RawWalletData>;
			if (!parsedCredentials.privateKey) {
				throw new Error('Private key not found in stored credentials');
			}
			privateKey = parsedCredentials.privateKey as Base58PrivateKey;
		} catch (parseError) {
			log.error('❌ Error parsing credentials from keychain:', parseError);
			throw new Error('Invalid credentials format in keychain');
		}

		const keypair = getKeypairFromPrivateKey(privateKey);
		// console.log('🔑 Generated keypair:', { // Sensitive data removed
		// 	publicKey: keypair.publicKey.toString(),
		// 	addressMatch: keypair.publicKey.toString() === walletAddress
		// });

		if (keypair.publicKey.toString() !== walletAddress) {
			throw new Error('Keychain private key does not match wallet address in store.');
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
	amount: number
	): Promise<string> => {

	try {
		const walletState = usePortfolioStore.getState().wallet;
		if (!walletState || !walletState.address) {
			throw new Error('No wallet address found in store');
		}
		const walletAddress = walletState.address;

		log.log('Building transfer transaction:', {
			toAddress,
			coinMint: coinMint || 'SOL',
			amount,
			fromAddress: walletAddress
		});

		// Prepare the transfer transaction using our gRPC API
		const prepareResponse = await grpcApi.prepareCoinTransfer({
			fromAddress: walletAddress,
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
): Promise<string> => {
	try{
		const walletState = usePortfolioStore.getState().wallet;
		if (!walletState || !walletState.address) {
			throw new Error('No wallet address found in store for signing');
		}
		const walletAddress = walletState.address;

		const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
		if (!credentials) {
			throw new Error('No credentials found in keychain for signing');
		}

		let privateKey: Base58PrivateKey;
		try {
			const parsedCredentials = JSON.parse(credentials.password) as Partial<RawWalletData>;
			if (!parsedCredentials.privateKey) {
				throw new Error('Private key not found in stored credentials');
			}
			privateKey = parsedCredentials.privateKey as Base58PrivateKey;
		} catch (parseError) {
			log.error('❌ Error parsing credentials from keychain:', parseError);
			throw new Error('Invalid credentials format in keychain');
		}

		const keypair = getKeypairFromPrivateKey(privateKey);
		// console.log('🔑 Using keypair with public key:', keypair.publicKey.toString()); // Sensitive data removed

		if (keypair.publicKey.toString() !== walletAddress) {
			throw new Error('Keychain private key does not match wallet address in store.');
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
