import { Keypair, VersionedTransaction, PublicKey, Transaction, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { Wallet, Base58PrivateKey } from '@/types';
import { REACT_APP_SOLANA_RPC_ENDPOINT, REACT_APP_JUPITER_API_URL } from '@env';
import { grpcApi } from '@/services/grpcApi';
import { usePortfolioStore } from '@/store/portfolio';
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Ensure Buffer is available globally
global.Buffer = Buffer;

if (!REACT_APP_SOLANA_RPC_ENDPOINT) {
	throw new Error('REACT_APP_SOLANA_RPC_ENDPOINT environment variable is required');
}

if (!REACT_APP_JUPITER_API_URL) {
	throw new Error('REACT_APP_JUPITER_API_URL environment variable is required');
}

const SOLANA_RPC_ENDPOINT: string = REACT_APP_SOLANA_RPC_ENDPOINT;
const JUPITER_API_URL: string = REACT_APP_JUPITER_API_URL;

const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

console.log('🔧 Using Solana RPC endpoint:', SOLANA_RPC_ENDPOINT);

const defaultHeaders = {
	Accept: 'application/json',
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const handleFetchError = async (response: Response): Promise<any> => {
	const errorDetails: any = {
		message: response.statusText || 'Unknown error',
		status: response.status,
	};

	try {
		errorDetails.data = await response.json();
	} catch (e) {
		errorDetails.data = await response.text();
	}

	console.error('API Error:', JSON.stringify(errorDetails, null, 2));
	throw errorDetails;
};

const jupiterApiFetch = async (url: string, method: string = 'GET', data: any = null, params: any = null, customHeaders: any = {}) => {
	const headers = { ...defaultHeaders, ...customHeaders };
	const fullURL = (JUPITER_API_URL || 'https://api.jup.ag/swap/v1') + url;

	console.log('🔍 Request:', {
		method,
		url,
		baseURL: JUPITER_API_URL || 'https://api.jup.ag/swap/v1',
		data,
		params,
		headers
	});

	let queryString = '';
	if (params && method === 'GET') {
		queryString = '?' + new URLSearchParams(params).toString();
	}

	const options: RequestInit = {
		method,
		headers,
		body: data ? JSON.stringify(data) : null,
	};

	try {
		const response = await fetch(fullURL + queryString, options);

		console.log('✅ Response:', {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers
		});

		if (!response.ok) {
			return handleFetchError(response);
		}

		try {
			const responseData = await response.json();
			return responseData;
		} catch (e) {
			return response.text();
		}

	} catch (error: any) {
		console.error('❌ Response Error:', error.message);
		throw { message: error.message };
	}
};

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

export const buildAndSignSwapTransaction = async (
	fromCoinId: string,
	toCoinId: string,
	amount: number,
	slippage: number
): Promise<string> => {
	try {
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

		const keypair = getKeypairFromPrivateKey(wallet.privateKey);
		console.log('🔑 Generated keypair:', {
			publicKey: keypair.publicKey.toString(),
			addressMatch: keypair.publicKey.toString() === wallet.address
		});

		// Get quote
		const quoteResponse = await jupiterApiFetch('/quote', 'GET', null, {
			inputMint: fromCoinId,
			outputMint: toCoinId,
			amount,
			slippageBps: slippage * 100, // Convert percentage to basis points
		});

		if (!quoteResponse) {
			throw new Error('No quote data received');
		}

		console.log('Quote response:', quoteResponse);

		// Request swap transaction with the correct body structure
		const swapRequestBody = {
			quoteResponse: quoteResponse,
			userPublicKey: wallet.address,
			wrapUnwrapSOL: true,
			dynamicComputeUnitLimit: true,
			dynamicSlippage: true,
			prioritizationFeeLamports: {
				priorityLevelWithMaxLamports: {
					maxLamports: 1000000,
					priorityLevel: "veryHigh"
				}
			}
		};

		const swapResponse = await jupiterApiFetch('/swap', 'POST', swapRequestBody);

		if (!swapResponse || !swapResponse.swapTransaction) {
			throw new Error('No swap transaction received');
		}

		const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');

		const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

		transaction.sign([keypair]);

		const serializedTransaction = transaction.serialize();
		const transactionBase64 = Buffer.from(serializedTransaction).toString('base64');

		return transactionBase64;
	} catch (error) {
		console.error('❌ Error in buildAndSignSwapTransaction:', error);
		throw error;
	}
};

export const buildAndSignTransferTransaction = async (
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

		const keypair = getKeypairFromPrivateKey(wallet.privateKey);
		console.log('🔑 Using keypair with public key:', keypair.publicKey.toString());

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

		// Decode and deserialize the transaction
		console.log('📥 Decoding transaction...');
		const transactionBuf = Buffer.from(prepareResponse.unsignedTransaction, 'base64');
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
