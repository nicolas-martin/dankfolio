import './load-env.js';
import { generateWallet, buildAndSignSwapTransaction } from '../src/utils/solanaWallet.js';
import { PublicKey } from '@solana/web3.js';

// Test constants
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TEST_AMOUNT = 1000000; // 0.001 SOL in lamports
const SLIPPAGE = 1; // 1% slippage

async function testJupiterSwap() {
    try {
        console.log('🚀 Starting Jupiter Swap Test');
        console.log('Using Jupiter API URL:', process.env.REACT_APP_JUPITER_API_URL);
        
        // Generate a test wallet
        console.log('Generating test wallet...');
        const { keypair } = generateWallet();
        console.log('Test wallet public key:', keypair.publicKey.toString());

        // Test swap from SOL to USDC
        console.log('\nTesting SOL -> USDC swap...');
        console.log('Amount:', TEST_AMOUNT, 'SOL');
        console.log('Slippage:', SLIPPAGE, '%');

        const signedTx = await buildAndSignSwapTransaction(
            keypair,
            SOL_MINT,
            USDC_MINT,
            TEST_AMOUNT,
            SLIPPAGE,
            null, // For SOL, we don't need input token account
            null  // Output token account will be created in the swap
        );

        console.log('\n✅ Successfully built and signed swap transaction');
        console.log('Transaction:', signedTx);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response?.data) {
            console.error('API Response:', error.response.data);
        }
    }
}

// Run the test
testJupiterSwap(); 