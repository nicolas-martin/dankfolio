import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Import Raydium SDK types and functions
import { Token, API_URLS } from '@raydium-io/raydium-sdk-v2';
import axios from 'axios';
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
// 2. Wallet Setup
const WALLET_PATH = join(__dirname, '../../../../backend/keys/mainnet-wallet-1.json');
const walletKeyString = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));
const walletKeyBuffer = Buffer.from(walletKeyString, 'base64');
const walletKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeyBuffer));
// 3. Swap Configuration
const SWAP_CONFIG = {
    tokenAAmount: 0.0001, // Minimal amount for testing
    tokenAAddress: 'So11111111111111111111111111111111111111112', // SOL
    tokenBAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
    direction: 'in',
    slippage: 0.5, // 0.5%
    maxRetries: 3,
    liquidityFile: join(__dirname, '../../trim-mainnet/trimmed_mainnet.json')
};
// 4. Load Pool Data
let poolKeys;
try {
    const poolData = JSON.parse(fs.readFileSync(SWAP_CONFIG.liquidityFile, 'utf-8'));
    if (!Array.isArray(poolData))
        throw new Error('Invalid pool data');
    // Filter for WIF/SOL pool
    poolKeys = poolData.filter(pool => pool.baseMint === SWAP_CONFIG.tokenBAddress &&
        pool.quoteMint === SWAP_CONFIG.tokenAAddress);
    if (poolKeys.length === 0) {
        throw new Error('WIF/SOL pool not found in liquidity file');
    }
}
catch (error) {
    console.error('Failed to load liquidity file:');
    console.error(error);
    process.exit(1);
}
async function createSwapTransaction() {
    console.log('\n🔍 Creating swap transaction...');
    console.log(`💰 Input: ${SWAP_CONFIG.tokenAAmount} SOL`);
    console.log(`📊 Slippage: ${SWAP_CONFIG.slippage}%`);
    const tokenA = new Token({
        mint: new PublicKey(SWAP_CONFIG.tokenAAddress),
        decimals: 9,
        symbol: 'SOL'
    });
    const tokenB = new Token({
        mint: new PublicKey(SWAP_CONFIG.tokenBAddress),
        decimals: 6,
        symbol: 'WIF'
    });
    const amountIn = SWAP_CONFIG.tokenAAmount * 10 ** 9; // Convert to lamports
    const slippage = SWAP_CONFIG.slippage; // 0.5%
    console.log('📡 Fetching priority fee...');
    // Get priority fee
    const { data: feeData } = await axios.get(`${API_URLS.BASE_HOST}${API_URLS.PRIORITY_FEE}`);
    console.log(`💸 Priority fee (high): ${feeData.data.default.h} microLamports`);
    console.log('🧮 Computing swap quote...');
    // Get swap quote computation
    const { data: swapResponse } = await axios.get(`${API_URLS.SWAP_HOST}/compute/swap-base-in?` +
        `inputMint=${SWAP_CONFIG.tokenAAddress}&` +
        `outputMint=${SWAP_CONFIG.tokenBAddress}&` +
        `amount=${amountIn}&` +
        `slippageBps=${slippage * 100}&` +
        `txVersion=LEGACY`);
    if (!swapResponse.success) {
        console.error('❌ Failed to compute swap quote');
        throw new Error(`Failed to compute swap: ${swapResponse.msg}`);
    }
    console.log('✅ Swap quote computed successfully');
    if (swapResponse.data) {
        console.log(`📊 Expected output: ${swapResponse.data.outputAmount} WIF`);
        console.log(`📈 Price impact: ${swapResponse.data.priceImpactPct}%`);
    }
    console.log('🏗️ Creating swap transaction...');
    // Create swap transaction
    const { data: swapTransactions } = await axios.post(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
        computeUnitPriceMicroLamports: String(feeData.data.default.h),
        swapResponse,
        txVersion: 'LEGACY',
        wallet: walletKeypair.publicKey.toBase58(),
        wrapSol: true,
        unwrapSol: false,
    });
    if (!swapTransactions.success) {
        console.error('❌ Failed to create swap transaction');
        throw new Error('Failed to create swap transaction');
    }
    console.log('✅ Swap transaction created successfully');
    // Process all transactions in the response
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) => Transaction.from(txBuf));
    if (allTransactions.length === 0) {
        console.error('❌ No transactions returned from API');
        throw new Error('No transactions returned from API');
    }
    console.log(`📦 Received ${allTransactions.length} transaction(s)`);
    return allTransactions[0];
}
async function executeSwap() {
    for (let attempt = 1; attempt <= SWAP_CONFIG.maxRetries; attempt++) {
        try {
            console.log(`\n🔄 Attempt ${attempt}/${SWAP_CONFIG.maxRetries}`);
            console.log('📝 Creating transaction...');
            const transaction = await createSwapTransaction();
            console.log('✍️  Signing transaction...');
            transaction.sign(walletKeypair);
            console.log('📡 Sending transaction...');
            const txid = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false });
            console.log(`🔗 Transaction sent: https://solscan.io/tx/${txid}`);
            console.log('⏳ Getting latest blockhash...');
            const latestBlockhash = await connection.getLatestBlockhash();
            console.log('🔍 Confirming transaction...');
            const confirmation = await connection.confirmTransaction({
                signature: txid,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            }, 'confirmed');
            if (confirmation.value.err) {
                console.error('❌ Transaction failed on-chain');
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }
            console.log('✅ Swap confirmed successfully!');
            return;
        }
        catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`);
            // Check for insufficient funds error
            if (error.logs?.some((log) => log.includes('insufficient lamports'))) {
                const match = error.logs.find((log) => log.includes('insufficient lamports'));
                console.error('💰 Insufficient funds error:');
                console.error(match);
                // Don't retry on insufficient funds
                throw new Error('Insufficient funds for swap');
            }
            console.error(error);
            if (attempt === SWAP_CONFIG.maxRetries) {
                console.error('💔 All swap attempts exhausted');
                throw new Error('All swap attempts failed');
            }
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(`⏰ Waiting ${backoffMs}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }
}
async function preflightChecks() {
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
        console.log('🏊 Checking liquidity pool...');
        if (!poolKeys || poolKeys.length === 0) {
            console.error('❌ No valid pool found');
            throw new Error('No valid WIF/SOL pool found');
        }
        console.log(`✅ Using WIF/SOL pool: ${poolKeys[0].id}`);
        console.log('✅ All preflight checks passed!\n');
    }
    catch (error) {
        console.error('❌ Preflight check failed:');
        console.error(error);
        process.exit(1);
    }
}
async function main() {
    await preflightChecks();
    await executeSwap();
}
main().catch(error => {
    console.error('Fatal error:');
    console.error(error);
    process.exit(1);
});
