import { Keypair, Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import axios from 'axios';

// Default connection to Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Constants for Raydium API
const API_SWAP_HOST = 'https://transaction-v1.raydium.io';
const API_BASE_HOST = 'https://api.raydium.io/v2';

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
 * @param {string} fromCoinId - Source token mint address
 * @param {string} toCoinId - Destination token mint address
 * @param {number} amount - Amount to swap
 * @param {string} privateKey - Private key (Base58 or Base64)
 * @returns {Promise<string>} Base64 encoded signed transaction
 */
export const createAndSignSwapTransaction = async (fromCoinId, toCoinId, amount, privateKey) => {
  try {
    // Get keypair from private key (now supports both Base58 and Base64)
    const keypair = getKeypairFromPrivateKey(privateKey);
    
    // Convert amount to lamports/smallest units (assuming SOL by default)
    const amountInSmallestUnits = Math.floor(amount * LAMPORTS_PER_SOL);
    
    // Determine if input or output is SOL
    const isInputSol = fromCoinId === 'So11111111111111111111111111111111111111112';
    const isOutputSol = toCoinId === 'So11111111111111111111111111111111111111112';
    
    // Set slippage (1% by default)
    const slippage = 1;
    
    // Fetch priority fee information
    const { data: feeData } = await axios.get(
      `${API_BASE_HOST}/info/priority-fee`
    );
    
    const priorityFee = feeData.data.default.h; // Use high priority fee
    
    // Fetch swap quote
    const { data: swapResponse } = await axios.get(
      `${API_SWAP_HOST}/compute/swap-base-in?` +
      `inputMint=${fromCoinId}&` +
      `outputMint=${toCoinId}&` +
      `amount=${amountInSmallestUnits}&` +
      `slippageBps=${slippage * 100}&` +
      `txVersion=V0`
    );
    
    // Get transaction details
    const { data: swapTransactions } = await axios.post(
      `${API_SWAP_HOST}/transaction/swap-base-in`,
      {
        computeUnitPriceMicroLamports: String(priorityFee),
        swapResponse,
        txVersion: 'V0',
        wallet: keypair.publicKey.toString(),
        wrapSol: isInputSol,
        unwrapSol: isOutputSol,
      }
    );
    
    // Handle the received transaction
    if (!swapTransactions.success || !swapTransactions.data || swapTransactions.data.length === 0) {
      throw new Error('Failed to generate swap transaction');
    }
    
    // Get the transaction buffer
    const txBuffer = Buffer.from(swapTransactions.data[0].transaction, 'base64');
    
    // Deserialize as a versioned transaction
    const transaction = VersionedTransaction.deserialize(txBuffer);
    
    // Sign the transaction (note: this doesn't use the signTransaction method
    // because VersionedTransaction has a different signing method)
    transaction.sign([keypair]);
    
    // Return the serialized and encoded transaction
    return Buffer.from(transaction.serialize()).toString('base64');
    
  } catch (error) {
    console.error('Error creating swap transaction:', error);
    throw error;
  }
};

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