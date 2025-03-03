import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import axios from 'axios';

// Default connection to Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Constants for Raydium API
const API_SWAP_HOST = 'https://transaction-v1.raydium.io';
const API_BASE_HOST = 'https://api.raydium.io';

// Raydium API URLs
const API_URLS = {
        SWAP_HOST: API_SWAP_HOST,
        BASE_HOST: API_BASE_HOST,
        SWAP_QUOTE: '/compute/swap-base-in',
        SWAP_TRANSACTION: '/transaction/swap-base-in',
};

// Hardcoded compute unit prices (in microLamports)
const COMPUTE_UNIT_PRICES = {
        VERY_HIGH: '1000',  // vh
        HIGH: '500',        // h
        MEDIUM: '250'       // m
};

/**
 * Generate a new random Solana keypair
 * @returns {Object} Object containing the keypair, public key as string, and private key as base58 string
 */
export const generateWallet = () => {
        const keypair = Keypair.generate();
        return {
                keypair,
                publicKey: keypair.publicKey.toString(),
                privateKey: bs58.encode(keypair.secretKey),
        };
};

/**
 * Detect if a private key is in Base64 format
 * @param {string} privateKey - Private key string
 * @returns {boolean} True if it appears to be Base64
 */
const isBase64 = (privateKey) => {
        // Basic check for Base64 format (may not be 100% accurate)
        return privateKey.match(/^[A-Za-z0-9+/]*={0,2}$/) !== null && privateKey.length % 4 === 0;
};

/**
 * Get a Solana keypair from a private key (supports both Base58 and Base64 formats)
 * @param {string} privateKey - Private key string (Base58 or Base64)
 * @returns {Keypair} Solana keypair
 */
export const getKeypairFromPrivateKey = (privateKey) => {
        let secretKey;

        if (isBase64(privateKey)) {
                // Handle Base64 private key
                secretKey = new Uint8Array(Buffer.from(privateKey, 'base64'));
        } else {
                // Handle Base58 private key (original implementation)
                secretKey = bs58.decode(privateKey);
        }

        return Keypair.fromSecretKey(secretKey);
};

/**
 * Check the balance of a Solana account
 * @param {string} publicKeyString - Public key as string
 * @returns {Promise<number>} Balance in SOL
 */
export const getBalance = async (publicKeyString) => {
        try {
                const publicKey = new PublicKey(publicKeyString);
                const balance = await connection.getBalance(publicKey);
                return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
        } catch (error) {
                console.error('Error getting balance:', error);
                throw error;
        }
};

/**
 * Sign a transaction with a private key
 * @param {Transaction} transaction - Unsigned transaction
 * @param {string} privateKey - Private key (Base58 or Base64)
 * @returns {string} Base64 encoded signed transaction
 */
export const signTransaction = (transaction, privateKey) => {
        try {
                const keypair = getKeypairFromPrivateKey(privateKey);

                // Add the signer to the transaction
                transaction.feePayer = keypair.publicKey;

                // Sign the transaction
                const signData = transaction.serializeMessage();
                const signature = nacl.sign.detached(signData, keypair.secretKey);
                transaction.addSignature(keypair.publicKey, Buffer.from(signature));

                // Return base64 encoded transaction
                return transaction.serialize().toString('base64');
        } catch (error) {
                console.error('Error signing transaction:', error);
                throw error;
        }
};

/**
 * Create and sign a swap transaction using Raydium
 * @param {Connection} connection - Solana connection
 * @param {Keypair} wallet - Solana keypair
 * @param {string} inputMint - Source token mint address
 * @param {string} outputMint - Destination token mint address
 * @param {number} amount - Amount to swap in lamports
 * @param {number} slippage - Slippage percentage
 * @param {boolean} isInputSol - Whether input is SOL
 * @param {boolean} isOutputSol - Whether output is SOL
 * @param {PublicKey} inputTokenAcc - Input token account
 * @param {PublicKey} outputTokenAcc - Output token account
 * @param {string} txVersion - Transaction version
 * @returns {Promise<string>} Base64 encoded signed transaction
 */
export async function createAndSignSwapTransaction(
        connection,
        wallet,
        inputMint,
        outputMint,
        amount,
        slippage,
        isInputSol,
        isOutputSol,
        inputTokenAcc,
        outputTokenAcc,
        txVersion = 'V0'
) {
        try {
                console.log('Getting swap quote...');

                // Always use mainnet for Raydium API calls
                const network = 'mainnet';
                console.log(`Using network: ${network} for Raydium API`);

                // Add network parameter to the API call
                const { data: swapResponse } = await axios.get(
                        `${API_URLS.SWAP_HOST}${API_URLS.SWAP_QUOTE}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 100}&txVersion=${txVersion}&network=${network}`
                );

                if (!swapResponse) {
                        throw new Error('Failed to get swap quote');
                }

                console.log('Creating swap transaction...');
                const { data: swapTransactions } = await axios.post(
                        `${API_URLS.SWAP_HOST}${API_URLS.SWAP_TRANSACTION}`,
                        {
                                computeUnitPriceMicroLamports: COMPUTE_UNIT_PRICES.HIGH, // Using high priority value
                                swapResponse,
                                txVersion,
                                wallet: wallet.publicKey.toBase58(),
                                wrapSol: isInputSol,
                                unwrapSol: isOutputSol,
                                inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58(),
                                outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58(),
                                network: network, // Always use mainnet
                        }
                );

                if (!swapTransactions?.data?.length) {
                        throw new Error('Failed to create swap transaction');
                }

                console.log('Processing transactions...');
                // We currently only support signing the first transaction
                const txBuf = Buffer.from(swapTransactions.data[0].transaction, 'base64');
                const transaction = txVersion === 'V0'
                        ? VersionedTransaction.deserialize(txBuf)
                        : Transaction.from(txBuf);

                console.log(`Total ${swapTransactions.data.length} transactions to process`);

                // Sign the transaction
                if (txVersion === 'V0') {
                        transaction.sign([wallet]);
                } else {
                        transaction.partialSign(wallet);
                }

                // Serialize the signed transaction to base64
                const serializedTx = Buffer.from(transaction.serialize()).toString('base64');
                console.log('Transaction signed successfully, length:', serializedTx.length);

                return serializedTx;
        } catch (error) {
                console.error('Error in createAndSignSwapTransaction:', error);
                throw error;
        }
}

/**
 * Secure storage functions for the wallet
 * In a real app, use a secure storage solution like react-native-keychain
 */
export const secureStorage = {
        saveWallet: async (wallet) => {
                try {
                        // For demo purposes, we're using localStorage, but in a real app use secure storage!
                        localStorage.setItem('wallet', JSON.stringify({
                                publicKey: wallet.publicKey,
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
