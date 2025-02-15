import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount, } from '@solana/spl-token';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
// Import Raydium SDK as a CommonJS module
import pkg from '@raydium-io/raydium-sdk-v2';
const { Token, TokenAmount, Percent, Currency, API_URLS } = pkg;
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
// 3. Parse Command Line Arguments
const argv = yargs(hideBin(process.argv))
    .option('symbol', {
    alias: 's',
    description: 'Token symbol to swap (e.g., GIGA, WIF)',
    type: 'string',
    demandOption: true
})
    .option('amount', {
    alias: 'a',
    description: 'Amount of tokens to swap',
    type: 'number',
    default: 0.1
})
    .option('direction', {
    alias: 'd',
    description: 'Swap direction (in/out)',
    choices: ['in', 'out'],
    default: 'in'
})
    .option('slippage', {
    description: 'Slippage percentage',
    type: 'number',
    default: 2.0
})
    .option('simulate', {
    description: 'Run in simulation mode',
    type: 'boolean',
    default: false
})
    .help()
    .parseSync(); // Use parseSync() instead of argv to get proper typing
// 3. Swap Configuration
const SWAP_CONFIG = {
    tokenAAmount: argv.amount,
    tokenAAddress: '', // Will be set after loading pool data
    tokenBAddress: 'So11111111111111111111111111111111111111112', // SOL (quote token)
    direction: argv.direction,
    slippage: argv.slippage,
    maxRetries: 3,
    liquidityFile: join(__dirname, '../../trim-mainnet/trimmed_mainnet.json')
};
// 4. Load Pool Data
let poolKeys;
let selectedToken;
try {
    const poolData = JSON.parse(fs.readFileSync(SWAP_CONFIG.liquidityFile, 'utf-8'));
    // Find the requested token
    const tokenData = poolData.tokens.find(t => t.token.symbol.toUpperCase() === argv.symbol.toUpperCase());
    if (!tokenData) {
        throw new Error(`Token ${argv.symbol} not found in liquidity file`);
    }
    selectedToken = tokenData.token;
    console.log(`🪙 Found token: ${selectedToken.name} (${selectedToken.symbol})`);
    // Set the token addresses based on direction
    if (SWAP_CONFIG.direction === 'in') {
        // Token -> SOL: Token is input
        SWAP_CONFIG.tokenAAddress = selectedToken.mint;
    }
    else {
        // SOL -> Token: SOL is input
        SWAP_CONFIG.tokenAAddress = SWAP_CONFIG.tokenBAddress; // SOL
        SWAP_CONFIG.tokenBAddress = selectedToken.mint; // Token
    }
    // Get the pool for SOL pair
    poolKeys = tokenData.pools.filter(pool => {
        const isBaseSol = pool.baseMint === 'So11111111111111111111111111111111111111112';
        const isQuoteSol = pool.quoteMint === 'So11111111111111111111111111111111111111112';
        return isBaseSol || isQuoteSol;
    });
    if (poolKeys.length === 0) {
        throw new Error(`No valid pool found for ${selectedToken.symbol}/SOL pair`);
    }
    // Get decimals from pool data
    const baseDecimals = poolKeys[0].baseDecimals;
    const quoteDecimals = poolKeys[0].quoteDecimals;
    console.log(`ℹ️  Using decimals from pool: base=${baseDecimals}, quote=${quoteDecimals}`);
    console.log(`🏊 Using ${selectedToken.symbol}/SOL pool: ${poolKeys[0].id}`);
}
catch (error) {
    console.error('Failed to load liquidity file:');
    console.error(error);
    process.exit(1);
}
async function getOrCreateTokenAccount(mint) {
    try {
        const ata = await getAssociatedTokenAddress(mint, walletKeypair.publicKey, false, TOKEN_PROGRAM_ID);
        try {
            await getAccount(connection, ata);
            console.log(`✅ Found existing token account: ${ata.toBase58()}`);
        }
        catch (error) {
            if (error.name === 'TokenAccountNotFoundError') {
                console.log(`ℹ️  Token account not found, it will be created during swap`);
            }
        }
        return ata.toBase58();
    }
    catch (error) {
        console.error('❌ Failed to get token account:');
        console.error(error);
        process.exit(1);
    }
}
async function getPriorityFee() {
    try {
        const response = await axios.get('https://api.helius.xyz/v0/priority-fee-estimate');
        const { data } = response;
        // Use a more reasonable priority fee - 1M microLamports
        const priorityFee = 1000000;
        console.log(`💸 Priority fee (high): ${priorityFee} microLamports`);
        return priorityFee;
    }
    catch (error) {
        console.warn('⚠️  Failed to fetch priority fee, using default');
        return 500000; // Default to 500k microLamports if API fails
    }
}
async function createSwapTransaction() {
    console.log('\n🔍 Creating swap transaction...');
    // Get token accounts for both tokens
    console.log('🔑 Getting token accounts...');
    const tokenAMint = new PublicKey(SWAP_CONFIG.tokenAAddress);
    const tokenBMint = new PublicKey(SWAP_CONFIG.tokenBAddress);
    const tokenAAccount = await getAssociatedTokenAddress(tokenAMint, walletKeypair.publicKey, false, TOKEN_PROGRAM_ID);
    const tokenBAccount = await getAssociatedTokenAddress(tokenBMint, walletKeypair.publicKey, false, TOKEN_PROGRAM_ID);
    // Create token accounts if they don't exist
    let shouldCreateTokenA = false;
    let shouldCreateTokenB = false;
    try {
        await getAccount(connection, tokenAAccount);
        console.log('✅ Token A account exists');
    }
    catch (error) {
        if (error.name === 'TokenAccountNotFoundError') {
            console.log('ℹ️  Token A account needs to be created');
            shouldCreateTokenA = true;
        }
    }
    try {
        await getAccount(connection, tokenBAccount);
        console.log('✅ Token B account exists');
    }
    catch (error) {
        if (error.name === 'TokenAccountNotFoundError') {
            console.log('ℹ️  Token B account needs to be created');
            shouldCreateTokenB = true;
        }
    }
    // Define tokens based on pool data and direction
    const tokenA = new Token({
        mint: tokenAMint,
        decimals: SWAP_CONFIG.direction === 'in' ? poolKeys[0].baseDecimals : poolKeys[0].quoteDecimals,
        symbol: SWAP_CONFIG.direction === 'in' ? selectedToken.symbol : 'SOL'
    });
    const tokenB = new Token({
        mint: tokenBMint,
        decimals: SWAP_CONFIG.direction === 'in' ? poolKeys[0].quoteDecimals : poolKeys[0].baseDecimals,
        symbol: SWAP_CONFIG.direction === 'in' ? 'SOL' : selectedToken.symbol
    });
    // Convert amount using the correct decimals
    const amount = SWAP_CONFIG.tokenAAmount * (SWAP_CONFIG.direction === 'in'
        ? 10 ** poolKeys[0].baseDecimals
        : 10 ** poolKeys[0].quoteDecimals);
    const slippage = SWAP_CONFIG.slippage;
    // Log appropriate direction and amount
    const directionSymbol = SWAP_CONFIG.direction === 'in' ? '→' : '←';
    console.log(`💰 ${SWAP_CONFIG.direction === 'in' ? 'Input' : 'Output'}: ${SWAP_CONFIG.tokenAAmount} ${tokenA.symbol}`);
    console.log(`🔄 Direction: ${tokenA.symbol} ${directionSymbol} ${tokenB.symbol}`);
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
        computeUnitPriceMicroLamports: priorityFee.toString()
    });
    // Use appropriate endpoint based on direction
    const swapMode = SWAP_CONFIG.direction === 'in' ? 'swap-base-in' : 'swap-base-out';
    const { data: swapResponse } = await axios.get(`${API_URLS.SWAP_HOST}/compute/${swapMode}?${quoteParams}`);
    if (!swapResponse.success) {
        console.error('❌ Failed to compute swap quote');
        console.error('Response:', JSON.stringify(swapResponse, null, 2));
        process.exit(1);
    }
    console.log('✅ Swap quote computed successfully');
    if (swapResponse.data) {
        // Convert output amount based on direction
        const outputAmount = SWAP_CONFIG.direction === 'in'
            ? swapResponse.data.outputAmount / (10 ** poolKeys[0].quoteDecimals)
            : swapResponse.data.outputAmount / (10 ** poolKeys[0].baseDecimals);
        console.log(`📊 Expected ${SWAP_CONFIG.direction === 'in' ? 'output' : 'input'}: ${outputAmount} ${SWAP_CONFIG.direction === 'in' ? tokenB.symbol : tokenA.symbol}`);
        console.log(`📈 Price impact: ${swapResponse.data.priceImpactPct}%`);
        // Safety check: Prevent swaps with high price impact
        const MAX_PRICE_IMPACT = 5.0; // 5%
        if (swapResponse.data.priceImpactPct > MAX_PRICE_IMPACT) {
            console.error('❌ Price impact too high!');
            console.error(`Expected price impact (${swapResponse.data.priceImpactPct}%) exceeds maximum allowed (${MAX_PRICE_IMPACT}%)`);
            console.error('This could result in significant losses. Aborting for safety.');
            process.exit(1);
        }
    }
    // Step 3: Create swap transaction
    console.log('🏗️ Creating swap transaction...');
    const { data: swapTransactions } = await axios.post(`${API_URLS.SWAP_HOST}/transaction/${swapMode}`, {
        computeUnitPriceMicroLamports: priorityFee.toString(),
        swapResponse,
        txVersion: 'LEGACY',
        wallet: walletKeypair.publicKey.toBase58(),
        wrapSol: SWAP_CONFIG.direction === 'out',
        unwrapSol: SWAP_CONFIG.direction === 'in',
        inputAccount: tokenAAccount.toBase58(),
        outputAccount: tokenBAccount.toBase58(),
        createTokenAccounts: shouldCreateTokenA || shouldCreateTokenB
    });
    if (!swapTransactions.success) {
        console.error('❌ Failed to create swap transaction');
        console.error('Response:', JSON.stringify(swapTransactions, null, 2));
        process.exit(1);
    }
    console.log('✅ Swap transaction created successfully');
    // Step 4: Process transaction(s)
    const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
    const allTransactions = allTxBuf.map((txBuf) => Transaction.from(txBuf));
    if (allTransactions.length === 0) {
        console.error('❌ No transactions returned from API');
        console.error('Response:', JSON.stringify(swapTransactions, null, 2));
        process.exit(1);
    }
    console.log(`📦 Received ${allTransactions.length} transaction(s)`);
    return allTransactions[0];
}
async function executeSwap() {
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
            const txid = await connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                maxRetries: 3,
                preflightCommitment: 'processed'
            });
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
                    }
                    else {
                        const tokenBAccount = await getAssociatedTokenAddress(new PublicKey(SWAP_CONFIG.tokenBAddress), walletKeypair.publicKey, false, TOKEN_PROGRAM_ID);
                        try {
                            const account = await getAccount(connection, tokenBAccount);
                            console.log(`💰 New TOKEN_B balance: ${Number(account.amount) / (10 ** poolKeys[0].quoteDecimals)} TOKEN_B`);
                        }
                        catch (error) {
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
        }
        catch (error) {
            const errorMessage = error.message || 'Unknown error occurred';
            // Only retry if we haven't sent the transaction yet
            if (errorMessage.includes('Transaction confirmation timeout') ||
                errorMessage.includes('Transaction failed')) {
                console.error('❌ Swap failed:');
                console.error('Error:', errorMessage);
                process.exit(1);
            }
            // Check for retriable errors (only before sending transaction)
            const isExpired = errorMessage.includes('expired') ||
                errorMessage.includes('block height exceeded') ||
                errorMessage.includes('blockhash not found');
            const isThrottled = errorMessage.includes('429') ||
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
async function preflightChecks() {
    try {
        console.log('\n🚀 Starting preflight checks...');
        if (!argv.simulate) {
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
            // Check token balance based on direction
            if (SWAP_CONFIG.direction === 'in') {
                // For token -> SOL swaps, check token balance
                console.log('🔍 Checking input token balance...');
                const tokenAAccount = await getAssociatedTokenAddress(new PublicKey(SWAP_CONFIG.tokenAAddress), walletKeypair.publicKey, false, TOKEN_PROGRAM_ID);
                try {
                    const tokenAccount = await getAccount(connection, tokenAAccount);
                    const tokenABalance = Number(tokenAccount.amount) / (10 ** poolKeys[0].baseDecimals);
                    console.log(`💰 Input token balance: ${tokenABalance}`);
                    // Get swap quote to check required input amount
                    console.log('🧮 Computing swap quote...');
                    const quoteParams = new URLSearchParams({
                        inputMint: SWAP_CONFIG.tokenAAddress,
                        outputMint: SWAP_CONFIG.tokenBAddress,
                        amount: (SWAP_CONFIG.tokenAAmount * (10 ** poolKeys[0].baseDecimals)).toString(),
                        slippageBps: (SWAP_CONFIG.slippage * 100).toString(),
                        txVersion: 'LEGACY'
                    });
                    const swapMode = SWAP_CONFIG.direction === 'in' ? 'swap-base-in' : 'swap-base-out';
                    const { data: swapResponse } = await axios.get(`${API_URLS.SWAP_HOST}/compute/${swapMode}?${quoteParams}`);
                    if (!swapResponse.success) {
                        console.error('❌ Failed to compute swap quote');
                        console.error('Response:', JSON.stringify(swapResponse, null, 2));
                        process.exit(1);
                    }
                    const requiredAmount = swapResponse.data.inputAmount / (10 ** poolKeys[0].baseDecimals);
                    console.log(`📊 Required input amount: ${requiredAmount}`);
                    if (tokenABalance < requiredAmount) {
                        throw new Error(`Insufficient balance. Have ${tokenABalance}, need ${requiredAmount}`);
                    }
                    console.log('✅ Has sufficient balance');
                }
                catch (error) {
                    if (error.name === 'TokenAccountNotFoundError') {
                        console.error('❌ No token account found');
                        throw new Error(`No token account found for ${SWAP_CONFIG.tokenAAddress}`);
                    }
                    throw error;
                }
            }
            else {
                // For SOL -> token swaps, check SOL balance
                const requiredSol = SWAP_CONFIG.tokenAAmount; // Amount in SOL
                if (balance / 1e9 < requiredSol) {
                    throw new Error(`Insufficient SOL balance. Have ${balance / 1e9}, need ${requiredSol}`);
                }
                console.log('✅ Has sufficient SOL balance');
            }
        }
        else {
            console.log('💡 Running in simulation mode - skipping balance checks');
        }
        console.log('🏊 Checking liquidity pool...');
        if (!poolKeys || poolKeys.length === 0) {
            console.error('❌ No valid pool found');
            throw new Error('No valid pool found');
        }
        console.log(`✅ Using ${selectedToken.symbol}/SOL pool: ${poolKeys[0].id}`);
        console.log('✅ All preflight checks passed!\n');
    }
    catch (error) {
        if (argv.simulate) {
            // In simulation mode, only fail on pool-related errors
            if (error instanceof Error && error.message.includes('No valid pool found')) {
                console.error('❌ Preflight check failed:');
                console.error(error);
                process.exit(1);
            }
            // Otherwise continue with simulation
            console.log('✅ All preflight checks passed!\n');
        }
        else {
            console.error('❌ Preflight check failed:');
            console.error(error);
            process.exit(1);
        }
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
