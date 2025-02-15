import { 
  Connection, 
  Keypair, 
  PublicKey,
  Transaction
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

// Import Raydium SDK as a CommonJS module
import pkg from '@raydium-io/raydium-sdk-v2';
const { 
  Token,
  TokenAmount,
  Percent,
  Currency,
  API_URLS
} = pkg;

// Types from Raydium SDK
interface LiquidityPoolKeys {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  programId: string;
  authority: string;
  openOrders: string;
  targetOrders: string;
  baseVault: string;
  quoteVault: string;
  marketVersion: number;
  marketProgramId: string;
  marketId: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Connection Configuration
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
  confirmTransactionInitialTimeout: 60000, // 60 seconds
  wsEndpoint: 'wss://api.mainnet-beta.solana.com/',
});

// Raydium API Configuration
const RAYDIUM_API_URL = API_URLS.SWAP_HOST;

// Types
interface SwapConfig {
  tokenAAmount: number;
  tokenAAddress: string;
  tokenBAddress: string;
  direction: 'in' | 'out';  // 'in' for base-in (exact input), 'out' for base-out (exact output)
  slippage: number;
  maxRetries: number;
  liquidityFile: string;
}

interface PoolInfo extends Omit<LiquidityPoolKeys, 'version' | 'marketVersion'> {
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  version: number;
  marketVersion: number;
}

// 2. Wallet Setup
const WALLET_PATH = join(__dirname, '../../../../backend/keys/mainnet-wallet-1.json');
const walletKeyString = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
const walletKeyBuffer = Buffer.from(walletKeyString, 'base64');
const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeyBuffer));

// 3. Swap Configuration
const SWAP_CONFIG: SwapConfig = {
  tokenAAmount: 0.1,     // Minimal amount of WIF to swap
  tokenAAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF (base token)
  tokenBAddress: 'So11111111111111111111111111111111111111112',  // SOL (quote token)
  direction: 'in',      // Testing with 'in' direction
  slippage: 2.0,       // 2% slippage
  maxRetries: 3,
  liquidityFile: join(__dirname, '../../trim-mainnet/trimmed_mainnet.json')
};

// 4. Load Pool Data
let poolKeys: PoolInfo[];
try {
  const poolData = JSON.parse(fs.readFileSync(SWAP_CONFIG.liquidityFile, 'utf-8'));
  if (!Array.isArray(poolData)) throw new Error('Invalid pool data');
  
  // Filter for WIF/SOL pool
  poolKeys = poolData.filter(pool => 
    pool.baseMint === SWAP_CONFIG.tokenAAddress && // WIF is base token
    pool.quoteMint === SWAP_CONFIG.tokenBAddress    // SOL is quote token
  );
  
  if (poolKeys.length === 0) {
    throw new Error('WIF/SOL pool not found in liquidity file');
  }

  // Get decimals from pool data
  const baseDecimals = poolKeys[0].baseDecimals;  // WIF decimals
  const quoteDecimals = poolKeys[0].quoteDecimals; // SOL decimals

  console.log(`ℹ️  Using decimals from pool: WIF=${baseDecimals}, SOL=${quoteDecimals}`);
} catch (error) {
  console.error('Failed to load liquidity file:');
  console.error(error);
  process.exit(1);
}

async function getOrCreateTokenAccount(mint: PublicKey): Promise<string> {
  try {
    const ata = await getAssociatedTokenAddress(
      mint,
      walletKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    try {
      await getAccount(connection, ata);
      console.log(`✅ Found existing token account: ${ata.toBase58()}`);
    } catch (error: any) {
      if (error.name === 'TokenAccountNotFoundError') {
        console.log(`ℹ️  Token account not found, it will be created during swap`);
      }
    }

    return ata.toBase58();
  } catch (error) {
    console.error('❌ Failed to get token account:');
    console.error(error);
    process.exit(1);
  }
}

async function getPriorityFee(): Promise<number> {
  try {
    const response = await axios.get('https://api.helius.xyz/v0/priority-fee-estimate');
    const { data } = response;
    
    // Use a more reasonable priority fee - 1M microLamports
    const priorityFee = 1_000_000;
    console.log(`💸 Priority fee (high): ${priorityFee} microLamports`);
    return priorityFee;
  } catch (error) {
    console.warn('⚠️  Failed to fetch priority fee, using default');
    return 500_000; // Default to 500k microLamports if API fails
  }
}

async function createSwapTransaction(): Promise<Transaction> {
  console.log('\n🔍 Creating swap transaction...');
  
  // Get token A account
  console.log('🔑 Getting input token account...');
  const tokenAAccount = await getOrCreateTokenAccount(new PublicKey(SWAP_CONFIG.tokenAAddress));
  
  // Define tokens based on pool data
  const tokenA = new Token({
    mint: new PublicKey(SWAP_CONFIG.tokenAAddress),
    decimals: poolKeys[0].baseDecimals,
    symbol: 'TOKEN_A'  // Generic symbol since we don't have token metadata
  });
  
  const tokenB = new Token({
    mint: new PublicKey(SWAP_CONFIG.tokenBAddress),
    decimals: poolKeys[0].quoteDecimals,
    symbol: 'TOKEN_B'  // Generic symbol since we don't have token metadata
  });

  // Convert amount using the correct decimals from pool data
  const amount = SWAP_CONFIG.tokenAAmount * (
    SWAP_CONFIG.direction === 'in' 
      ? 10 ** poolKeys[0].baseDecimals  // TOKEN_A -> TOKEN_B: use base decimals
      : 10 ** poolKeys[0].quoteDecimals // TOKEN_B -> TOKEN_A: use quote decimals
  );
  const slippage = SWAP_CONFIG.slippage;

  // Log appropriate direction and amount
  const directionSymbol = SWAP_CONFIG.direction === 'in' ? '→' : '←';
  console.log(`💰 ${SWAP_CONFIG.direction === 'in' ? 'Input' : 'Output'}: ${SWAP_CONFIG.tokenAAmount} TOKEN_A`);
  console.log(`🔄 Direction: TOKEN_A ${directionSymbol} TOKEN_B`);
  console.log(`📊 Slippage: ${SWAP_CONFIG.slippage}%`);
  
  // Step 1: Get priority fee
  console.log('📡 Fetching priority fee...');
  const priorityFee = await getPriorityFee();

  // Step 2: Get swap quote
  console.log('🧮 Computing swap quote...');
  const quoteParams = new URLSearchParams({
    inputMint: SWAP_CONFIG.tokenAAddress,
    outputMint: SWAP_CONFIG.tokenBAddress,
    amount: amount.toString(),
    slippageBps: (slippage * 100).toString(),
    txVersion: 'LEGACY',
    computeUnitPriceMicroLamports: priorityFee.toString()  // Add priority fee to quote
  });
  
  // Use appropriate endpoint based on direction
  const swapMode = SWAP_CONFIG.direction === 'in' ? 'swap-base-in' : 'swap-base-out';
  const { data: swapResponse } = await axios.get(
    `${API_URLS.SWAP_HOST}/compute/${swapMode}?${quoteParams}`
  );

  if (!swapResponse.success) {
    console.error('❌ Failed to compute swap quote');
    console.error('Response:', JSON.stringify(swapResponse, null, 2));
    process.exit(1);
  }
  console.log('✅ Swap quote computed successfully');
  
  if (swapResponse.data) {
    // Convert output amount based on direction
    const outputAmount = SWAP_CONFIG.direction === 'in'
      ? swapResponse.data.outputAmount / (10 ** poolKeys[0].quoteDecimals)  // TOKEN_A -> TOKEN_B
      : swapResponse.data.outputAmount / (10 ** poolKeys[0].baseDecimals);  // TOKEN_B -> TOKEN_A
      
    console.log(`📊 Expected ${SWAP_CONFIG.direction === 'in' ? 'output' : 'input'}: ${outputAmount} ${SWAP_CONFIG.direction === 'in' ? 'TOKEN_B' : 'TOKEN_A'}`);
    console.log(`📈 Price impact: ${swapResponse.data.priceImpactPct}%`);
  }

  // Step 3: Create swap transaction
  console.log('🏗️ Creating swap transaction...');
  const { data: swapTransactions } = await axios.post(
    `${API_URLS.SWAP_HOST}/transaction/${swapMode}`,
    {
      computeUnitPriceMicroLamports: priorityFee.toString(),
      swapResponse,
      txVersion: 'LEGACY',
      wallet: walletKeypair.publicKey.toBase58(),
      wrapSol: SWAP_CONFIG.tokenBAddress === 'So11111111111111111111111111111111111111112' && SWAP_CONFIG.direction === 'out',
      unwrapSol: SWAP_CONFIG.tokenBAddress === 'So11111111111111111111111111111111111111112' && SWAP_CONFIG.direction === 'in',
      inputAccount: tokenAAccount,
    }
  );

  if (!swapTransactions.success) {
    console.error('❌ Failed to create swap transaction');
    console.error('Response:', JSON.stringify(swapTransactions, null, 2));
    process.exit(1);
  }
  console.log('✅ Swap transaction created successfully');

  // Step 4: Process transaction(s)
  const allTxBuf = swapTransactions.data.map(
    (tx: { transaction: string }) => Buffer.from(tx.transaction, 'base64')
  );
  
  const allTransactions = allTxBuf.map(
    (txBuf: Buffer) => Transaction.from(txBuf)
  );

  if (allTransactions.length === 0) {
    console.error('❌ No transactions returned from API');
    console.error('Response:', JSON.stringify(swapTransactions, null, 2));
    process.exit(1);
  }
  console.log(`📦 Received ${allTransactions.length} transaction(s)`);

  return allTransactions[0];
}

async function executeSwap(): Promise<void> {
  for (let attempt = 1; attempt <= SWAP_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`\n🔄 Attempt ${attempt}/${SWAP_CONFIG.maxRetries}`);
      
      // Step 5: Create and sign transaction
      console.log('📝 Creating transaction...');
      const transaction = await createSwapTransaction();
      
      // Get latest blockhash BEFORE sending
      console.log('⏳ Getting latest blockhash...');
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({
        commitment: 'finalized'
      });
      
      // Set the transaction's blockhash
      transaction.recentBlockhash = blockhash;
      
      console.log('✍️  Signing transaction...');
      transaction.sign(walletKeypair);
      
      // Step 6: Send and confirm transaction
      console.log('📡 Sending transaction...');
      const txid = await connection.sendRawTransaction(
        transaction.serialize(),
        { 
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'processed'
        }
      );
      
      console.log(`🔗 Transaction sent: https://solscan.io/tx/${txid}`);
      
      // Once we're here, the transaction is sent - no more retries
      console.log('🔍 Confirming transaction...');
      
      // Poll for transaction status
      let status = null;
      const startTime = Date.now();
      const timeout = 30000; // 30 seconds timeout
      
      while (Date.now() - startTime < timeout) {
        status = await connection.getSignatureStatus(txid);
        
        if (status?.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }
        
        if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
          // Quick balance check to verify the swap
          if (SWAP_CONFIG.tokenBAddress === 'So11111111111111111111111111111111111111112') {
            const newBalance = await connection.getBalance(walletKeypair.publicKey);
            console.log(`💰 New TOKEN_B balance: ${newBalance / 1e9} SOL`);
          } else {
            const tokenBAccount = await getAssociatedTokenAddress(
              new PublicKey(SWAP_CONFIG.tokenBAddress),
              walletKeypair.publicKey,
              false,
              TOKEN_PROGRAM_ID
            );
            try {
              const account = await getAccount(connection, tokenBAccount);
              console.log(`💰 New TOKEN_B balance: ${Number(account.amount) / (10 ** poolKeys[0].quoteDecimals)} TOKEN_B`);
            } catch (error) {
              console.log('⚠️ Could not fetch new token balance');
            }
          }
          console.log('✅ Swap confirmed successfully!');
          return;
        }
        
        // Wait a bit before polling again
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      throw new Error('Transaction confirmation timeout');
      
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Only retry if we haven't sent the transaction yet
      if (errorMessage.includes('Transaction confirmation timeout') || 
          errorMessage.includes('Transaction failed')) {
        console.error('❌ Swap failed:');
        console.error('Error:', errorMessage);
        process.exit(1);
      }

      // Check for retriable errors (only before sending transaction)
      const isExpired = 
        errorMessage.includes('expired') || 
        errorMessage.includes('block height exceeded') ||
        errorMessage.includes('blockhash not found');

      const isThrottled = 
        errorMessage.includes('429') || 
        errorMessage.includes('rate limit') ||
        errorMessage.includes('throttle') ||
        errorMessage.toLowerCase().includes('too many requests');

      if (!isExpired && !isThrottled) {
        console.error('❌ Swap failed with non-retriable error:');
        console.error('Error:', errorMessage);
        if (error.response?.data) {
          console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
      }

      if (attempt === SWAP_CONFIG.maxRetries) {
        console.error('💔 Max retries reached');
        console.error('Last error:', errorMessage);
        if (error.response?.data) {
          console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
      }
      
      // Use exponential backoff for retries
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
      const reason = isExpired ? 'transaction expired' : 'rate limited';
      console.log(`⏰ Retry after ${backoffMs}ms (${reason})...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

async function preflightChecks(): Promise<void> {
  try {
    console.log('\n🚀 Starting preflight checks...');
    
    console.log('🌐 Checking Solana connection...');
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana ${version['solana-core']}`);
    
    console.log('💰 Checking wallet balance...');
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`💳 Wallet balance: ${balance / 1e9} SOL`);
    
    // Just check if we have any balance at all
    if (balance === 0) {
      console.error('❌ No SOL balance');
      throw new Error('Wallet has no SOL balance');
    }
    console.log('✅ Has SOL balance');

    // Check WIF balance
    console.log('🔍 Checking WIF balance...');
    const wifTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(SWAP_CONFIG.tokenAAddress),
      walletKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    try {
      const tokenAccount = await getAccount(connection, wifTokenAccount);
      const wifBalance = Number(tokenAccount.amount) / (10 ** poolKeys[0].baseDecimals); // Use pool decimals
      console.log(`💰 WIF balance: ${wifBalance} WIF`);

      // Get swap quote to check required input amount
      console.log('🧮 Computing swap quote...');
      const quoteParams = new URLSearchParams({
        inputMint: SWAP_CONFIG.tokenAAddress,
        outputMint: SWAP_CONFIG.tokenBAddress,
        amount: (SWAP_CONFIG.tokenAAmount * (10 ** poolKeys[0].baseDecimals)).toString(), // Convert using pool decimals
        slippageBps: (SWAP_CONFIG.slippage * 100).toString(),
        txVersion: 'LEGACY'
      });
      
      const swapMode = SWAP_CONFIG.direction === 'in' ? 'swap-base-in' : 'swap-base-out';
      const { data: swapResponse } = await axios.get(
        `${API_URLS.SWAP_HOST}/compute/${swapMode}?${quoteParams}`
      );

      if (!swapResponse.success) {
        console.error('❌ Failed to compute swap quote');
        console.error('Response:', JSON.stringify(swapResponse, null, 2));
        process.exit(1);
      }

      const requiredWIF = swapResponse.data.inputAmount / (10 ** poolKeys[0].baseDecimals); // Convert using pool decimals
      console.log(`📊 Required WIF: ${requiredWIF} WIF`);
      
      if (wifBalance < requiredWIF) {
        throw new Error(`Insufficient WIF balance. Have ${wifBalance} WIF, need ${requiredWIF} WIF`);
      }
      console.log('✅ Has sufficient WIF balance');
    } catch (error: any) {
      if (error.name === 'TokenAccountNotFoundError') {
        console.error('❌ No WIF token account found');
        throw new Error('No WIF token account found');
      }
      throw error;
    }

    console.log('🏊 Checking liquidity pool...');
    if (!poolKeys || poolKeys.length === 0) {
      console.error('❌ No valid pool found');
      throw new Error('No valid WIF/SOL pool found');
    }
    console.log(`✅ Using WIF/SOL pool: ${poolKeys[0].id}`);
    console.log('✅ All preflight checks passed!\n');
  } catch (error) {
    console.error('❌ Preflight check failed:');
    console.error(error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await preflightChecks();
  await executeSwap();
}

main().catch(error => {
  console.error('Fatal error:');
  console.error(error);
  process.exit(1);
});