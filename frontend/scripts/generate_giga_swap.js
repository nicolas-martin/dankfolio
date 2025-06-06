import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Constants
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const GIGA_MINT = '28B63oRCS2K83EUqTRbe7qYEvQFFTPbntiUnJNKLpump';
const LAMPORTS_PER_SOL = 1000000000;
const amount = 0.0001 * LAMPORTS_PER_SOL; // Reduced to 0.0001 SOL
const SLIPPAGE_BPS = 100; // 1%


// API endpoints
const API_URLS = {
    QUOTE: 'https://transaction-v1.raydium.io/compute/swap-base-in',
    SWAP: 'https://transaction-v1.raydium.io/transaction/swap-base-in',
    BACKEND: 'http://localhost:8080/api/trades/execute',
    SOLANA_RPC: 'https://api.mainnet-beta.solana.com',
};

// Hardcoded priority fees since the API is not working
const PRIORITY_FEES = {
    vh: 1000, // very high
    h: 500,   // high
    m: 250    // medium
};

// Helper function to get keypair from Base64 private key
function getKeypairFromPrivateKey(privateKey) {
    // Handle Base64 private key
    const secretKey = new Uint8Array(Buffer.from(privateKey, 'base64'));
    return Keypair.fromSecretKey(secretKey);
}

async function generateSwapTransaction() {
    try {
        // Create connection (only needed for recent blockhash)
        const connection = new Connection('https://api.mainnet-beta.solana.com', {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000 // 60 seconds
        });
        
        // Load and parse the wallet from mainnet-wallet-1.json
        const walletPath = path.join(process.cwd(), 'backend', 'keys', 'mainnet-wallet-1.json');
        const privateKeyBase64 = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
        const wallet = getKeypairFromPrivateKey(privateKeyBase64);
        
        console.log('Using wallet:', wallet.publicKey.toString());

        // Check wallet balance
        const balance = await connection.getBalance(wallet.publicKey);
        console.log(`Wallet balance: ${balance / 1e9} SOL`);

        // 1. Get swap quote
        console.log('Getting swap quote...');
        const quoteUrl = `${API_URLS.QUOTE}?inputMint=${SOL_MINT}&outputMint=${GIGA_MINT}&amount=${amount}&slippageBps=${SLIPPAGE_BPS}&txVersion=V0`;
        const quoteResponse = await fetch(quoteUrl);
        if (!quoteResponse.ok) {
            const error = await quoteResponse.text();
            throw new Error(`Failed to get swap quote: ${error}`);
        }
        const swapResponse = await quoteResponse.json();
        if (!swapResponse.success) {
            throw new Error(`Failed to get swap quote: ${swapResponse.msg || 'Unknown error'}`);
        }
        console.log('Quote received:', swapResponse.data);

        // 2. Create swap transaction
        console.log('Creating swap transaction...');
        const requestBody = {
            computeUnitPriceMicroLamports: PRIORITY_FEES.h.toString(), // Using high priority fee
            swapResponse,
            txVersion: "V0",
            wallet: wallet.publicKey.toString(),
            wrapSol: true,
            unwrapSol: false,
            network: "mainnet-beta"
        };
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const swapTxResponse = await fetch(API_URLS.SWAP, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!swapTxResponse.ok) {
            const error = await swapTxResponse.text();
            throw new Error(`Failed to create swap transaction: ${error}`);
        }

        const swapTxData = await swapTxResponse.json();
        if (!swapTxData.success) {
            throw new Error(`Failed to create swap transaction: ${swapTxData.msg || 'Unknown error'}`);
        }
        console.log('Swap transaction response:', swapTxData);

        const { data: swapTransactions } = swapTxData;
        
        if (!swapTransactions?.length) {
            throw new Error('No transactions returned');
        }

        console.log(`Total ${swapTransactions.length} transactions to process`);

        // 3. Process and sign transactions
        const allTxBuf = swapTransactions.map(tx => Buffer.from(tx.transaction, 'base64'));
        const allTransactions = allTxBuf.map(txBuf => VersionedTransaction.deserialize(txBuf));
        const signedTransactions = [];

        for (let idx = 0; idx < allTransactions.length; idx++) {
            console.log(`Signing transaction ${idx + 1}...`);
            const transaction = allTransactions[idx];
            
            // Sign the transaction
            transaction.sign([wallet]);

            // Serialize the signed transaction
            const serializedTx = Buffer.from(transaction.serialize()).toString('base64');
            signedTransactions.push(serializedTx);
        }

        // 4. Send signed transactions to backend
        for (let idx = 0; idx < signedTransactions.length; idx++) {
            console.log(`Sending transaction ${idx + 1} to backend...`);
            
            const backendPayload = {
                from_coin_id: SOL_MINT,
                to_coin_id: GIGA_MINT,
                amount: amount / 1e9, // Convert lamports to SOL
                signed_transaction: signedTransactions[idx]
            };

            console.log('Backend payload:', JSON.stringify(backendPayload, null, 2));

            const backendResponse = await fetch(`${API_URLS.BACKEND}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(backendPayload)
            });

            if (!backendResponse.ok) {
                const errorText = await backendResponse.text();
                throw new Error(`Backend error (${backendResponse.status}): ${errorText}`);
            }

            const result = await backendResponse.json();
            console.log(`Backend response for transaction ${idx + 1}:`, result);

            if (result.transaction_hash) {
                console.log(`\n🔍 Verifying transaction on Solana blockchain...`);
                
                // Try to get transaction details
                try {
                    const txStatus = await connection.getSignatureStatus(result.transaction_hash, {
                        searchTransactionHistory: true
                    });
                    
                    if (!txStatus?.value) {
                        console.log(`❌ Transaction not found on-chain. This usually means:`);
                        console.log(`   1. The wallet has insufficient funds (${wallet.publicKey.toString()})`);
                        console.log(`   2. The transaction was dropped by the network`);
                        console.log(`   3. The transaction failed preflight checks`);
                        throw new Error('Transaction not found on-chain');
                    }

                    if (txStatus.value.err) {
                        console.log(`❌ Transaction failed with error:`, txStatus.value.err);
                        throw new Error('Transaction failed: ' + JSON.stringify(txStatus.value.err));
                    }

                    const confirmationStatus = txStatus.value.confirmationStatus;
                    console.log(`\n✨ Transaction Status: ${confirmationStatus}`);
                    console.log(`🔍 View on Solscan: https://solscan.io/tx/${result.transaction_hash}`);
                    
                    if (confirmationStatus === 'finalized') {
                        console.log(`✅ Transaction finalized on Solana blockchain!`);
                    } else {
                        console.log(`⏳ Transaction submitted, awaiting finalization...`);
                        // Wait for finalization
                        await connection.confirmTransaction(result.transaction_hash, 'finalized');
                        console.log(`✅ Transaction now finalized!`);
                    }
                } catch (verifyError) {
                    console.error(`\n❌ Transaction verification failed:`, verifyError.message);
                    throw verifyError;
                }
            }

            if (result.signature) {
                console.log(`🔍 Alternative transaction link: http://solscan.io/tx/${result.signature}`);
            }
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