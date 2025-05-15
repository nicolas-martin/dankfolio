import { Keypair, VersionedTransaction, PublicKey, Transaction, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { Wallet, Base58PrivateKey } from '@/types';
import { REACT_APP_SOLANA_RPC_ENDPOINT } from '@env';
import { grpcApi } from '@/services/grpcApi';
import { usePortfolioStore } from '@/store/portfolio';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
global.Buffer = Buffer;

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
		console.log('🔐 Created keypair from Base58 private key:', {
			publicKey: keypair.publicKey.toString(),
			secretKeyLength: keypair.secretKey.length
		});
		return keypair;
	} catch (error) {
		console.error('❌ Error creating keypair:', error);
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
		const wallet = usePortfolioStore.getState().wallet;
		if (!wallet) {
			throw new Error('No wallet found in store');
		}

		console.log('🔐 Building swap transaction with:', {
			fromCoinId,
			toCoinId,
			amount,
			slippage,
			walletType: typeof wallet,
			walletKeys: Object.keys(wallet),
			privateKeyLength: wallet.privateKey?.length,
			addressLength: wallet.address?.length
		});

		// Prepare the swap transaction using our gRPC API
		const prepareSwapRequest = {
			fromCoinId,
			toCoinId,
			amount: amount.toString(),
			slippageBps: (slippage * 100).toString(),
			userPublicKey: wallet.address,
			fromAddress: wallet.address
		};
		const prepareResponse = await grpcApi.prepareSwap(prepareSwapRequest);

		if (!prepareResponse.unsignedTransaction) {
			throw new Error('No unsigned transaction received');
		}
		return prepareResponse.unsignedTransaction;
	}
	catch (error) {
		console.error('❌ Error in prepareSwapRequest:', error);
		throw error;
	}
}

export const signSwapTransaction = async (unsignedTransaction:string): Promise<string> => {
	try {
		const wallet = usePortfolioStore.getState().wallet;
		if (!wallet) {
			throw new Error('No wallet found in store');
		}

		const keypair = getKeypairFromPrivateKey(wallet.privateKey);
		console.log('🔑 Generated keypair:', {
			publicKey: keypair.publicKey.toString(),
			addressMatch: keypair.publicKey.toString() === wallet.address
		});

		// Decode and deserialize the transaction
		console.log('📥 Decoding transaction...');
		const transactionBuf = Buffer.from(unsignedTransaction, 'base64');
		console.log('📦 Transaction buffer length:', transactionBuf.length);

		// Sign the transaction
		console.log('✍️ Signing transaction...');
		const transaction = VersionedTransaction.deserialize(transactionBuf);
		transaction.sign([keypair]);

		// Serialize the signed transaction
		const serializedTransaction = transaction.serialize();
		const transactionBase64 = Buffer.from(serializedTransaction).toString('base64');
		console.log('✅ Transaction signed and serialized');

		return transactionBase64;
	} catch (error) {
		console.error('❌ Error in buildAndSignSwapTransaction:', error);
		throw error;
	}
};

export const prepareCoinTransfer = async (
		toAddress: string,
	coinMint: string,
	amount: number
	): Promise<string> => {

	try {
		const wallet = usePortfolioStore.getState().wallet;
		if (!wallet) {
			throw new Error('No wallet found in store');
		}

		console.log('🔐 Building transfer transaction:', {
			toAddress,
			coinMint: coinMint || 'SOL',
			amount,
			fromAddress: wallet.address
		});

		// Prepare the transfer transaction using our gRPC API
		const prepareResponse = await grpcApi.prepareCoinTransfer({
			fromAddress: wallet.address,
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
		console.error('❌ Error in prepareCoinTransfer:', error);
		throw error;
	};
};

export const signTransferTransaction = async (
	unsignedTransaction: string,
): Promise<string> => {
	try{
		const wallet = usePortfolioStore.getState().wallet;
		if (!wallet) {
			throw new Error('No wallet found in store');
		}
		const keypair = getKeypairFromPrivateKey(wallet.privateKey);
		console.log('🔑 Using keypair with public key:', keypair.publicKey.toString());


		// Decode and deserialize the transaction
		console.log('📥 Decoding transaction...');
		const transactionBuf = Buffer.from(unsignedTransaction, 'base64');
		console.log('📦 Transaction buffer length:', transactionBuf.length);

		// Sign the transaction
		console.log('✍️ Signing transaction...');
		const transaction = Transaction.from(transactionBuf);

		// Always get a fresh blockhash to ensure transaction is recent
		const { blockhash } = await connection.getLatestBlockhash('confirmed');
		console.log('🔑 Setting fresh blockhash:', blockhash);
		transaction.recentBlockhash = blockhash;

		// Sign with our keypair
		transaction.sign(keypair);

		// Serialize the signed transaction
		console.log('📦 Serializing signed transaction...');
		const serializedTransaction = transaction.serialize().toString('base64');
		console.log('✅ Transaction signed and serialized');

		return serializedTransaction;
	} catch (error) {
		console.error('Failed to build and sign transaction:', error);
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
