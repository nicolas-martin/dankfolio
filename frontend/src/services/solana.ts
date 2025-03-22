import {
	Keypair,
	Connection,
	PublicKey,
	LAMPORTS_PER_SOL,
	VersionedTransaction
} from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import { REACT_APP_SOLANA_RPC_ENDPOINT } from '@env';
import { Wallet } from '../types';

// Use environment variable for Solana RPC endpoint with fallback
const rpcEndpoint = REACT_APP_SOLANA_RPC_ENDPOINT
if (!rpcEndpoint) {
	console.error('🚨 No Solana RPC endpoint provided');
	throw new Error('No Solana RPC endpoint provided');
}
console.log('🔧 Using Solana RPC endpoint:', rpcEndpoint);

// Initialize Solana connection
const connection = new Connection(rpcEndpoint, 'confirmed');

// Constants for Raydium API
// const API_SWAP_HOST = 'https://transaction-v1.raydium.io';
// const API_BASE_HOST = 'https://api.raydium.io';

// Raydium API URLs
// const API_URLS = {
//     SWAP_HOST: API_SWAP_HOST,
//     BASE_HOST: API_BASE_HOST,
//     SWAP_QUOTE: '/compute/swap-base-in',
//     SWAP_TRANSACTION: '/transaction/swap-base-in'
// };

// Hardcoded compute unit prices (in microLamports)
// const COMPUTE_UNIT_PRICES = {
//     VERY_HIGH: '1000', // vh
//     HIGH: '500',       // h
//     MEDIUM: '250'      // m
// };

const jupiterApi = axios.create({
	baseURL: process.env.REACT_APP_JUPITER_API_URL || 'https://api.jup.ag/swap/v1',
	headers: {
		Accept: 'application/json',
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization'
	}
});

// Add response interceptor for better error handling
jupiterApi.interceptors.response.use(
	response => response,
	error => {
		console.error('Jupiter API Error:', {
			message: error.message,
			config: error.config,
			status: error.response?.status,
			data: error.response?.data
		});
		throw error;
	}
);

const handleError = (error: unknown) => {
	console.error('Error:', error);
	throw error;
};

/**
 * Generate a new random Solana keypair.
 * Returns an object with the keypair, public key (as string), and private key (base58 encoded).
 */
export const generateWallet = () => {
	const keypair = Keypair.generate();
	return {
		keypair,
		publicKey: keypair.publicKey.toString(),
		privateKey: bs58.encode(keypair.secretKey)
	};
};

const isBase64 = (privateKey: string) => {
	// Basic check for Base64 format (may not be 100% accurate)
	return privateKey.match(/^[A-Za-z0-9+/]*={0,2}$/) !== null && privateKey.length % 4 === 0;
};

/**
 * Get a Solana keypair from a private key (supports Base58 and Base64 formats).
 */
export const getKeypairFromPrivateKey = (privateKey: string) => {
	let secretKey;

	if (isBase64(privateKey)) {
		// Handle Base64 private key
		secretKey = new Uint8Array(Buffer.from(privateKey, 'base64'));
	} else {
		// Handle Base58 private key
		secretKey = bs58.decode(privateKey);
	}

	return Keypair.fromSecretKey(secretKey);
};

/**
 * Check the balance of a Solana account.
 * Returns the balance in SOL.
 */
export const getBalance = async (publicKeyString: string) => {
	try {
		const publicKey = new PublicKey(publicKeyString);
		const balance = await connection.getBalance(publicKey);
		return balance / LAMPORTS_PER_SOL;
	} catch (error) {
		return handleError(error);
	}
};

/**
 * Create and sign a swap transaction using Jupiter.
 * Returns a Base64 encoded signed transaction.
 */
export const buildAndSignSwapTransaction = async (
	inputMint: string,
	outputMint: string,
	amount: number,
	slippage: number,
	wallet: Wallet
) => {
	try {
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
		const quoteResponse = await jupiterApi.get('/quote', {
			params: {
				inputMint,
				outputMint,
				amount,
				slippageBps: slippage * 100, // Convert percentage to basis points
			},
		});

		if (!quoteResponse.data) {
			throw new Error('No quote data received');
		}

		console.log('Quote response:', quoteResponse.data);

		// Request swap transaction with the correct body structure
		const swapRequestBody = {
			quoteResponse: quoteResponse.data,
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

		const swapResponse = await jupiterApi.post('/swap', swapRequestBody);

		if (!swapResponse.data || !swapResponse.data.swapTransaction) {
			throw new Error('No swap transaction received');
		}

		const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');

		const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

		const keypair = getKeypairFromPrivateKey(wallet.privateKey);
		transaction.sign([keypair]);

		const serializedTransaction = transaction.serialize();
		const transactionBase64 = Buffer.from(serializedTransaction).toString('base64');

		return transactionBase64;
	} catch (error) {
		console.error('Error in buildAndSignSwapTransaction:', error);
		if (error.response) {
			console.error('API Error Response:', error.response.data);
		}
		throw error;
	}
};

/**
 * Secure storage functions for the wallet.
 * In a real app, use a secure storage solution like react-native-keychain.
 */
export const secureStorage = {
	saveWallet: async (wallet: Wallet) => {
		try {
			localStorage.setItem('wallet', JSON.stringify({
				address: wallet.address,
				privateKey: wallet.privateKey,
			}));
			return true;
		} catch (error) {
			console.error('Error saving wallet:', error);
			return false;
		}
	},

	getWallet: async () => {
		try {
			const walletData = localStorage.getItem('wallet');
			if (!walletData) return null;
			return JSON.parse(walletData);
		} catch (error) {
			console.error('Error getting wallet:', error);
			return null;
		}
	},

	deleteWallet: async () => {
		try {
			localStorage.removeItem('wallet');
			return true;
		} catch (error) {
			console.error('Error deleting wallet:', error);
			return false;
		}
	}
};
