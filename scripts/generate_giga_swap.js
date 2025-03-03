import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';

// Constants
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const GIGA_MINT = '28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump';
const AMOUNT = 1000000; // 0.001 SOL in lamports
const SLIPPAGE_BPS = 100; // 1%

// Raydium API endpoints
const API_URLS = {
    SWAP_HOST: 'https://transaction-v1.raydium.io',
};

// Hardcoded priority fees since the API is not working
const PRIORITY_FEES = {
    vh: 1000, // very high
    h: 500,   // high
    m: 250    // medium
};

async function generateSwapTransaction() {
    try {
        // Create connection
        const connection = new Connection('https://api.mainnet-beta.solana.com', {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000 // 60 seconds
        });
        
        // Generate a random keypair for testing
        const wallet = Keypair.generate();
        console.log('Using wallet:', wallet.publicKey.toString());

        // 1. Get swap quote
        console.log('Getting swap quote...');
        const quoteUrl = `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${SOL_MINT}&outputMint=${GIGA_MINT}&amount=${AMOUNT}&slippageBps=${SLIPPAGE_BPS}&txVersion=V0`;
        const quoteResponse = await fetch(quoteUrl);
        const swapResponse = await quoteResponse.json();

        if (!swapResponse.success) {
            throw new Error('Failed to get swap quote');
        }

        console.log('Quote received:', swapResponse.data);

        // 2. Get swap transaction
        console.log('Creating swap transaction...');
        const requestBody = {
            computeUnitPriceMicroLamports: String(PRIORITY_FEES.h),
            swapResponse,
            txVersion: 'V0',
            wallet: wallet.publicKey.toString(),
            wrapSol: true,
            unwrapSol: false
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const swapTxResponse = await fetch(`${API_URLS.SWAP_HOST}/transaction/swap-base-in`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const swapTxData = await swapTxResponse.json();
        console.log('Swap transaction response:', JSON.stringify(swapTxData, null, 2));

        if (!swapTxData.success) {
            throw new Error(`Failed to create swap transaction: ${JSON.stringify(swapTxData)}`);
        }

        const { data: swapTransactions } = swapTxData;
        
        if (!swapTransactions?.length) {
            throw new Error('No transactions returned');
        }

        console.log(`Total ${swapTransactions.length} transactions to process`);

        // 3. Process transactions
        const allTxBuf = swapTransactions.map(tx => Buffer.from(tx.transaction, 'base64'));
        const allTransactions = allTxBuf.map(txBuf => VersionedTransaction.deserialize(txBuf));

        // 4. Sign and send each transaction
        for (let idx = 0; idx < allTransactions.length; idx++) {
            console.log(`Processing transaction ${idx + 1}...`);
            const transaction = allTransactions[idx];
            
            // Sign the transaction
            transaction.sign([wallet]);

            // Send the transaction
            const txId = await connection.sendTransaction(transaction, { skipPreflight: true });
            console.log(`Transaction ${idx + 1} sent, signature:`, txId);
            console.log("🔍http://solscan.io/tx/" + txId);
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Execute the function
generateSwapTransaction().then(() => {
    console.log('Done');
}).catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
}); 