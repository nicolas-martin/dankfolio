import SolscanWalletService from '../src/services/WalletService.js';

async function testWalletService() {
  const walletService = new SolscanWalletService();
  const testWalletAddress = 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R';

  try {
    console.log('Fetching tokens for wallet:', testWalletAddress);
    const tokens = await walletService.getTokens(testWalletAddress);
    
    console.log('\nFound tokens:');
    tokens.forEach((token, index) => {
      console.log(`\nToken #${index + 1}:`);
      console.log('Symbol:', token.symbol);
      console.log('Balance:', token.balance);
      console.log('Price:', token.price);
      console.log('Value:', token.value);
      console.log('Percentage:', token.percentage);
      console.log('Address:', token.address);
    });
  } catch (error) {
    console.error('Error testing wallet service:', error);
  }
}

testWalletService(); 