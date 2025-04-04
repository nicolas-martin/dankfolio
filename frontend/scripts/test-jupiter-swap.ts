require('./load-env.js');
import { getKeypairFromPrivateKey, buildAndSignSwapTransaction } from '@/src/services/solana';

// Test constants
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TEST_AMOUNT = 100000; // 0.0001 SOL in lamports (1 SOL = 1e9 lamports)
const SLIPPAGE = 1; // 1% slippage

async function testJupiterSwap() {
	try {
		console.log('🚀 Starting Jupiter Swap Test');
		console.log('🌐 Using Jupiter API URL:', process.env.REACT_APP_JUPITER_API_URL);

		// Get private key from env
		const privateKey = process.env.TEST_PRIVATE_KEY;
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
			privateKey: keypair.secretKey.toString(),
			balance: 0,
			publicKey: keypair.publicKey.toString()
		};

		// Test swap from SOL to USDC
		console.log('\n💱 Testing SOL -> USDC swap...');
		console.log('💰 Amount:', TEST_AMOUNT, 'lamports');
		console.log('📊 Slippage:', SLIPPAGE, '%');

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

	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		console.error('🔍 Error details:', {
			name: error.name,
			stack: error.stack
		});
		if (error.response?.data) {
			console.error('🌐 API Response:', JSON.stringify(error.response.data, null, 2));
		}
		if (error.config) {
			console.error('🔧 API Config:', {
				url: error.config.url,
				method: error.config.method,
				headers: error.config.headers
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
