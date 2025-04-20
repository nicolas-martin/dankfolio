import { Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Wallet } from '@/types';
import { REACT_APP_SOLANA_RPC_ENDPOINT, REACT_APP_JUPITER_API_URL } from '@env';
import grpcApi from '@/services/grpcApi';

if (!REACT_APP_SOLANA_RPC_ENDPOINT) {
	throw new Error('REACT_APP_SOLANA_RPC_ENDPOINT environment variable is required');
}

if (!REACT_APP_JUPITER_API_URL) {
	throw new Error('REACT_APP_JUPITER_API_URL environment variable is required');
}

const SOLANA_RPC_ENDPOINT: string = REACT_APP_SOLANA_RPC_ENDPOINT;
const JUPITER_API_URL: string = REACT_APP_JUPITER_API_URL;

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

export const getKeypairFromPrivateKey = (privateKey: string): Keypair => {
	// Handle Base64 private key
	//   const secretKey = new Uint8Array(Buffer.from(privateKey, 'base64'));
	// Handle Base58 private key
	const secretKey = bs58.decode(privateKey);
	return Keypair.fromSecretKey(secretKey);
};

export const buildAndSignSwapTransaction = async (
	fromCoinId: string,
	toCoinId: string,
	amount: number,
	slippage: number,
	wallet: Wallet
): Promise<string> => {
	try {
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

		// Check if wallet has enough SOL for rent (about 0.003 SOL to be safe)
		// const walletBalance = await connection.getBalance(wallet.publicKey);
		// const minBalanceForRent = 3000000; // 0.003 SOL in lamports

		// if (walletBalance < minBalanceForRent) {
		// 	throw new Error(
		// 		`Insufficient SOL for rent. Need at least 0.003 SOL for account creation. Current balance: ${walletBalance / LAMPORTS_PER_SOL
		// 		} SOL`
		// 	);
		// }

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
			userPublicKey: wallet.publicKey.toString(),
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
	tokenMint: string,
	amount: number,
	wallet: Wallet
): Promise<string> => {
	try {
		console.log('🔐 Building transfer transaction:', {
			toAddress,
			tokenMint: tokenMint || 'SOL',
			amount,
			fromAddress: wallet.address
		});

		const keypair = getKeypairFromPrivateKey(wallet.privateKey);
		console.log('🔑 Generated keypair:', {
			publicKey: keypair.publicKey.toString(),
			addressMatch: keypair.publicKey.toString() === wallet.address
		});

		// Prepare the transfer transaction using our gRPC API
		const prepareResponse = await grpcApi.prepareTokenTransfer({
			fromAddress: wallet.address,
			toAddress,
			tokenMint,
			amount
		});

		if (!prepareResponse.unsignedTransaction) {
			throw new Error('No unsigned transaction received');
		}

		// Decode and deserialize the transaction
		const transactionBuf = Buffer.from(prepareResponse.unsignedTransaction, 'base64');
		const transaction = VersionedTransaction.deserialize(transactionBuf);

		// Sign the transaction
		transaction.sign([keypair]);

		// Serialize and encode the signed transaction
		const serializedTransaction = transaction.serialize();
		const signedTransactionBase64 = Buffer.from(serializedTransaction).toString('base64');

		return signedTransactionBase64;
	} catch (error) {
		console.error('❌ Error in buildAndSignTransferTransaction:', error);
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
