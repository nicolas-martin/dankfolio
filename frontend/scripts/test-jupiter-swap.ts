// Hardcoded configuration values instead of loading from env file
import { getKeypairFromPrivateKey, buildAndSignSwapTransaction } from '../src/services/solana';
import grpcApi from '../src/services/grpcApi';

// Test constants
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TEST_AMOUNT = 100000; // 0.0001 SOL in lamports (1 SOL = 1e9 lamports)
const SLIPPAGE = 1; // 1% slippage
// DEMO ONLY - Replace with your test wallet private key
const TEST_PRIVATE_KEY = '5GBZXKqC7TRYM9GqkVw8kMAkbYvYrDPVEeEpyzy6yGrPfHcZ9pNGpcvZUdLXyohoLeKGjtKKuRv5ChKRbYjry3Ct';

async function testJupiterSwap() {
	try {
		console.log('🚀 Starting Jupiter Swap Test');

		// Get private key from env
		const privateKey = TEST_PRIVATE_KEY;
		if (!privateKey) {
			throw new Error('No TEST_PRIVATE_KEY found in environment variables');
		}

		// Create keypair from private key
		console.log('🔑 Creating wallet from private key...');
		const keypair = getKeypairFromPrivateKey(privateKey);
		console.log('📝 Wallet details:');
		console.log('   - Public key:', keypair.publicKey.toString());
		console.log('   - Private key (first 10 chars):', privateKey.substring(0, 10) + '...');

		// Convert Keypair to Wallet type
		const wallet = {
			address: keypair.publicKey.toString(),
			privateKey,
			balance: 0,
			publicKey: keypair.publicKey.toString(),
			keypair
		};

		// Test swap from SOL to USDC
		console.log('\n💱 Testing SOL -> USDC swap...');
		console.log('💰 Amount:', TEST_AMOUNT, 'lamports');
		console.log('📊 Slippage:', SLIPPAGE, '%');

		// Step 1: Get trade quote using gRPC client
		console.log('\n📊 Getting trade quote via gRPC...');
		const quoteResponse = await grpcApi.getTradeQuote(SOL_MINT, USDC_MINT, TEST_AMOUNT.toString());

		console.log('\n✅ Successfully received quote:');
		console.log('   - Estimated amount:', quoteResponse.estimatedAmount);
		console.log('   - Exchange rate:', quoteResponse.exchangeRate);
		console.log('   - Fee:', quoteResponse.fee);
		console.log('   - Price impact:', quoteResponse.priceImpact);
		console.log('   - Route plan:', quoteResponse.routePlan);

		// Step 2: Build and sign swap transaction
		console.log('\n🔄 Building and signing swap transaction...');
		const signedTx = await buildAndSignSwapTransaction(
			SOL_MINT,
			USDC_MINT,
			TEST_AMOUNT,
			SLIPPAGE,
			wallet
		);

		console.log('\n✅ Successfully built and signed swap transaction');
		console.log('📜 Transaction (first 100 chars):', signedTx.substring(0, 100) + '...');

		// Step 3: Submit trade via gRPC client
		console.log('\n📤 Submitting trade via gRPC...');
		const submitResponse = await grpcApi.submitSwap({
			from_coin_id: SOL_MINT,
			to_coin_id: USDC_MINT,
			amount: TEST_AMOUNT,
			signed_transaction: signedTx
		});
		
		console.log('\n✅ Successfully submitted trade:');
		console.log('   - Trade ID:', submitResponse.trade_id);
		console.log('   - Transaction hash:', submitResponse.transaction_hash);

		// Step 4: Poll for trade status
		console.log('\n⏳ Polling for trade status...');
		let isFinalized = false;
		let pollCount = 0;
		const MAX_POLLS = 30;

		while (!isFinalized && pollCount < MAX_POLLS) {
			pollCount++;
			
			console.log(`   Polling attempt ${pollCount}...`);
			
			const statusResponse = await grpcApi.getSwapStatus(submitResponse.transaction_hash);

			console.log(`   Status: ${statusResponse.status}, Confirmations: ${statusResponse.confirmations}`);
			
			if (statusResponse.error) {
				console.error('❌ Trade failed:', statusResponse.error);
				break;
			}
			
			if (statusResponse.finalized) {
				console.log('🎉 Transaction finalized!');
				isFinalized = true;
				break;
			}
			
			// Wait before polling again
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		if (!isFinalized) {
			console.warn('⚠️ Polling timed out before transaction was finalized.');
		}

	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		console.error('🔍 Error details:', {
			name: error.name,
			stack: error.stack
		});
		// Check for specific gRPC error structure
		if (error.code !== undefined) {
			console.error('🔧 gRPC Error:', {
				code: error.code,
				message: error.message,
				metadata: error.metadata
			});
		}
	}
}

// Run the test
console.log('🏁 Starting test execution...');
testJupiterSwap().then(() => {
	console.log('\n🎉 Test completed');
}).catch((error) => {
	console.error('\n💥 Unexpected error:', error);
});
