// Simple API mocking for React Native E2E tests
import { env } from './env';

// Mock data matching the test assertions in our Maestro flows
const mockCoins = [
  {
    mintAddress: 'coin1_mint',
    name: 'Coin One',
    symbol: 'ONE',
    imageUrl: 'https://example.com/one.png',
    resolvedIconUrl: 'https://example.com/one.png',
    price: 10,
    decimals: 9,
    dailyVolume: 1000,
    marketCap: 100000,
    description: 'Test coin one',
    tags: ['test'],
    jupiterListedAt: new Date().toISOString(),
    coingeckoId: 'coin-one',
    change24h: 5.5,
    website: 'https://example.com',
    twitter: 'https://twitter.com/coinone',
    telegram: '',
    createdAt: new Date(),
  },
  {
    mintAddress: 'coin2_mint',
    name: 'Coin Two', 
    symbol: 'TWO',
    imageUrl: 'https://example.com/two.png',
    resolvedIconUrl: 'https://example.com/two.png',
    price: 20,
    decimals: 6,
    dailyVolume: 2000,
    marketCap: 200000,
    description: 'Test coin two',
    tags: ['test'],
    jupiterListedAt: new Date().toISOString(),
    coingeckoId: 'coin-two',
    change24h: -2.1,
    website: 'https://example.com',
    twitter: 'https://twitter.com/cointwo',
    telegram: '',
    createdAt: new Date(),
  },
  {
    mintAddress: 'So11111111111111111111111111111111111111112',
    name: 'Solana',
    symbol: 'SOL',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    price: 150.0,
    decimals: 9,
    dailyVolume: 1000000,
    marketCap: 70000000000,
    description: 'Solana is a fast, secure, and censorship resistant blockchain.',
    tags: ['platform', 'native'],
    jupiterListedAt: new Date('2020-03-23T00:00:00Z').toISOString(),
    coingeckoId: 'solana',
    change24h: 8.5,
    website: 'https://solana.com',
    twitter: 'https://twitter.com/solana',
    telegram: '',
    createdAt: new Date('2020-03-23T00:00:00Z'),
  },
  {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt',
    name: 'USD Coin',
    symbol: 'USDC',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt/logo.png',
    resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt/logo.png',
    price: 1.0,
    decimals: 6,
    dailyVolume: 500000000,
    marketCap: 25000000000,
    description: 'USD Coin (USDC) is a stablecoin redeemable on a 1:1 basis for US dollars.',
    tags: ['stablecoin', 'usd'],
    jupiterListedAt: new Date('2020-09-29T00:00:00Z').toISOString(),
    coingeckoId: 'usd-coin',
    change24h: 0.1,
    website: 'https://centre.io',
    twitter: 'https://twitter.com/centre_io',
    telegram: '',
    createdAt: new Date('2020-09-29T00:00:00Z'),
  },
];

const mockResponses: { [key: string]: any } = {
  // Wallet balances - matches portfolio assertions
  'dankfolio.v1.WalletService/GetWalletBalances': {
    balances: [
      { mintAddress: 'coin1_mint', amount: '100.0' },
      { mintAddress: 'coin2_mint', amount: '200.0' },
      { mintAddress: 'So11111111111111111111111111111111111111112', amount: '10.5' },
      { mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt', amount: '500.75' },
    ],
  },
  
  // Available coins - matches coin list assertions
  'dankfolio.v1.CoinService/GetAvailableCoins': {
    coins: mockCoins,
  },
  
  // Search coins - for newly listed coins
  'dankfolio.v1.CoinService/Search': {
    coins: mockCoins,
    totalCount: mockCoins.length,
  },
  
  // Coin by ID - for individual coin details
  'dankfolio.v1.CoinService/GetCoinByID': (mintAddress: string) => {
    const coin = mockCoins.find(coin => coin.mintAddress === mintAddress) || mockCoins[0];
    return { coin };
  },
  
  // Swap quote - matches trading flow assertions
  'dankfolio.v1.TradeService/GetSwapQuote': {
    estimatedAmountOut: '150.5',
    exchangeRate: '15.05',
    fee: '0.1',
    priceImpact: '0.01',
    routePlan: [{ fromCoinSymbol: 'SOL', toCoinSymbol: 'USDC', protocolName: 'MockSwapProtocol' }],
    inputMint: mockCoins[2].mintAddress,
    outputMint: mockCoins[3].mintAddress,
  },
  
  // Submit swap - matches complete trade flow
  'dankfolio.v1.TradeService/SubmitSwap': {
    transactionHash: `mock_tx_hash_${Date.now()}`,
    tradeId: `mock_trade_id_${Date.now()}`,
  },

  // Swap status - for transaction monitoring
  'dankfolio.v1.TradeService/GetSwapStatus': {
    status: 'completed',
    transactionHash: 'mock_tx_hash',
    timestamp: new Date().toISOString(),
    fromAmount: '1.0',
    toAmount: '150.5'
  },

  // Send transaction
  'dankfolio.v1.WalletService/SendTransaction': {
    transactionHash: `mock_send_tx_${Date.now()}`,
    status: 'pending'
  },

  // Transaction status
  'dankfolio.v1.WalletService/GetTransactionStatus': {
    status: 'finalized',
    confirmations: 32,
    timestamp: new Date().toISOString()
  }
};

// Original fetch function
const originalFetch = global.fetch;

// Mock fetch function
const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  
  // Check if this is an API call we should mock
  if (url.includes(env.apiUrl)) {
    console.log('[Mock API] Intercepting request to:', url);
    
    // Extract the service/method from the URL
    const urlParts = url.split('/');
    const serviceMethod = urlParts.slice(-2).join('/'); // e.g., "dankfolio.v1.CoinService/GetAvailableCoins"
    
    if (mockResponses[serviceMethod]) {
      console.log('[Mock API] Returning mock response for:', serviceMethod);
      
      const response = mockResponses[serviceMethod];
      
      // Handle function responses (like GetCoinByID)
      if (typeof response === 'function') {
        // Extract parameters from request body if needed
        const body = init?.body ? JSON.parse(init.body as string) : {};
        const result = response(body.mintAddress || body.id);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Fall back to original fetch for non-mocked requests
  return originalFetch(input, init);
};

// Enable/disable mocking
export const enableApiMocking = () => {
  console.log('[Mock API] Enabling API mocking for E2E tests');
  global.fetch = mockFetch;
  
  // Set global flag for debug wallet
  if (typeof global !== 'undefined') {
    (global as any).__E2E_FORCE_DEBUG_WALLET__ = true;
  }
  
  // Also set process.env for immediate effect
  process.env.E2E_MOCKING_ENABLED = 'true';
};

export const disableApiMocking = () => {
  console.log('[Mock API] Disabling API mocking');
  global.fetch = originalFetch;
};

// Check if mocking should be enabled
export const shouldEnableMocking = () => {
  return process.env.E2E_MOCKING_ENABLED === 'true' || 
         process.env.LOAD_DEBUG_WALLET === 'true' || 
         env.debugMode;
}; 