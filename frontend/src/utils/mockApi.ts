// Simple API mocking for React Native E2E tests
import { env } from './env';
import { Coin } from '@/types';
import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';

// Import the exact gRPC types and schemas
import type { 
  GetAvailableCoinsResponse,
  SearchResponse,
  SearchCoinByMintResponse 
} from '@/gen/dankfolio/v1/coin_pb';
import { 
  GetAvailableCoinsResponseSchema,
  SearchResponseSchema,
  SearchCoinByMintResponseSchema,
  CoinSchema,
  type Coin as ProtobufCoin
} from '@/gen/dankfolio/v1/coin_pb';
import type { 
  GetWalletBalancesResponse,
  Balance,
  WalletBalance 
} from '@/gen/dankfolio/v1/wallet_pb';
import { 
  GetWalletBalancesResponseSchema,
  BalanceSchema,
  WalletBalanceSchema 
} from '@/gen/dankfolio/v1/wallet_pb';
import type { 
  GetPriceHistoryResponse,
  PriceHistoryData,
  PriceHistoryItem 
} from '@/gen/dankfolio/v1/price_pb';
import { 
  GetPriceHistoryResponseSchema,
  PriceHistoryDataSchema,
  PriceHistoryItemSchema 
} from '@/gen/dankfolio/v1/price_pb';
import type { 
  GetSwapQuoteResponse 
} from '@/gen/dankfolio/v1/trade_pb';
import { 
  GetSwapQuoteResponseSchema 
} from '@/gen/dankfolio/v1/trade_pb';

// Environment flag to enable/disable mocking
let mockingEnabled = false;

// Mock coin data with realistic meme-themed coins (using protobuf-compatible format)
const MOCK_COINS: ProtobufCoin[] = [
  create(CoinSchema, {
    mintAddress: 'DankCoin1111111111111111111111111111111',
    name: 'DankCoin',
    symbol: 'DANK',
    decimals: 9,
    description: 'The dankest meme coin on Solana',
    iconUrl: 'https://example.com/dank.png',
    resolvedIconUrl: 'https://example.com/dank.png',
    tags: ['meme', 'community'],
    price: 0.000042,
    dailyVolume: 1250000,
    website: 'https://dankcoin.meme',
    twitter: 'https://twitter.com/dankcoin',
    coingeckoId: 'dank-coin',
    createdAt: timestampFromDate(new Date('2024-01-15')),
    lastUpdated: timestampFromDate(new Date()),
    isTrending: true,
    jupiterListedAt: timestampFromDate(new Date('2024-01-20')),
  }),
  create(CoinSchema, {
    mintAddress: 'MoonToken111111111111111111111111111111',
    name: 'Moon Token',
    symbol: 'MOON',
    decimals: 6,
    description: 'To the moon and beyond! 🚀',
    iconUrl: 'https://example.com/moon.png',
    resolvedIconUrl: 'https://example.com/moon.png',
    tags: ['meme', 'moon'],
    price: 0.00123,
    dailyVolume: 890000,
    website: 'https://moontoken.space',
    twitter: 'https://twitter.com/moontoken',
    coingeckoId: 'moon-token',
    createdAt: timestampFromDate(new Date('2024-02-01')),
    lastUpdated: timestampFromDate(new Date()),
    isTrending: true,
    jupiterListedAt: timestampFromDate(new Date('2024-02-05')),
  }),
  create(CoinSchema, {
    mintAddress: 'Bonk111111111111111111111111111111111111',
    name: 'Bonk',
    symbol: 'BONK',
    decimals: 5,
    description: 'The first Solana dog coin for the people, by the people',
    iconUrl: 'https://example.com/bonk.png',
    resolvedIconUrl: 'https://example.com/bonk.png',
    tags: ['meme', 'dog', 'community'],
    price: 0.0000089,
    dailyVolume: 2100000,
    website: 'https://bonkcoin.com',
    twitter: 'https://twitter.com/bonk_inu',
    coingeckoId: 'bonk',
    createdAt: timestampFromDate(new Date('2022-12-25')),
    lastUpdated: timestampFromDate(new Date()),
    isTrending: false,
    jupiterListedAt: timestampFromDate(new Date('2023-01-01')),
  }),
  create(CoinSchema, {
    mintAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    name: 'Jupiter',
    symbol: 'JUP',
    decimals: 6,
    description: 'The key infrastructure for Solana trading',
    iconUrl: 'https://example.com/jup.png',
    resolvedIconUrl: 'https://example.com/jup.png',
    tags: ['defi', 'infrastructure'],
    price: 0.87,
    dailyVolume: 15600000,
    website: 'https://jup.ag',
    twitter: 'https://twitter.com/JupiterExchange',
    coingeckoId: 'jupiter-exchange-solana',
    createdAt: timestampFromDate(new Date('2023-10-19')),
    lastUpdated: timestampFromDate(new Date()),
    isTrending: false,
    jupiterListedAt: timestampFromDate(new Date('2023-10-19')),
  }),
  create(CoinSchema, {
    mintAddress: 'So11111111111111111111111111111111111111112',
    name: 'Wrapped SOL',
    symbol: 'SOL',
    decimals: 9,
    description: 'Wrapped Solana',
    iconUrl: 'https://example.com/sol.png',
    resolvedIconUrl: 'https://example.com/sol.png',
    tags: ['native'],
    price: 98.45,
    dailyVolume: 45000000,
    website: 'https://solana.com',
    twitter: 'https://twitter.com/solana',
    coingeckoId: 'solana',
    createdAt: timestampFromDate(new Date('2020-03-16')),
    lastUpdated: timestampFromDate(new Date()),
    isTrending: false,
    jupiterListedAt: timestampFromDate(new Date('2021-09-09')),
  }),
  create(CoinSchema, {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    description: 'USD Coin',
    iconUrl: 'https://example.com/usdc.png',
    resolvedIconUrl: 'https://example.com/usdc.png',
    tags: ['stablecoin'],
    price: 1.0,
    dailyVolume: 125000000,
    website: 'https://centre.io',
    twitter: 'https://twitter.com/centre_io',
    coingeckoId: 'usd-coin',
    createdAt: timestampFromDate(new Date('2018-09-26')),
    lastUpdated: timestampFromDate(new Date()),
    isTrending: false,
    jupiterListedAt: timestampFromDate(new Date('2021-09-09')),
  }),
];

// Mock wallet balances using exact gRPC types
const MOCK_WALLET_BALANCES: Balance[] = [
  create(BalanceSchema, { id: 'So11111111111111111111111111111111111111112', amount: 2.5 }), // SOL
  create(BalanceSchema, { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 1000.0 }), // USDC
  create(BalanceSchema, { id: 'DankCoin1111111111111111111111111111111', amount: 5000000.0 }), // DANK
  create(BalanceSchema, { id: 'MoonToken111111111111111111111111111111', amount: 250000.0 }), // MOON
  create(BalanceSchema, { id: 'Bonk111111111111111111111111111111111111', amount: 10000000.0 }), // BONK
  create(BalanceSchema, { id: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', amount: 150.0 }), // JUP
];

// Generate realistic price history with random walk
function generatePriceHistory(basePrice: number, isStablecoin = false): PriceHistoryItem[] {
  const items: PriceHistoryItem[] = [];
  const now = Date.now();
  const fourHoursAgo = now - (4 * 60 * 60 * 1000); // 4 hours ago
  const interval = (4 * 60 * 60 * 1000) / 24; // 24 data points over 4 hours
  
  let currentPrice = basePrice;
  const volatility = isStablecoin ? 0.001 : 0.05; // 0.1% for stablecoins, 5% for others
  const meanReversion = 0.1; // Tendency to revert to base price
  
  for (let i = 0; i < 24; i++) {
    const timestamp = fourHoursAgo + (i * interval);
    
    // Random walk with mean reversion
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const meanReversionForce = (basePrice - currentPrice) * meanReversion * volatility;
    const priceChange = randomChange + meanReversionForce;
    
    currentPrice = Math.max(currentPrice * (1 + priceChange), basePrice * 0.5); // Prevent going below 50% of base
    currentPrice = Math.min(currentPrice, basePrice * 2); // Prevent going above 200% of base
    
    items.push(create(PriceHistoryItemSchema, {
      unixTime: BigInt(Math.floor(timestamp / 1000)), // Convert to seconds and BigInt as per protobuf
      value: currentPrice,
    }));
  }
  
  return items;
}

// Original fetch function reference
const originalFetch = global.fetch;

// Mock fetch implementation
const mockFetch = async (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  const urlString = url.toString();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000'; // Use 9000 as default for E2E
  
  // Only intercept calls to our API
  if (!urlString.startsWith(apiUrl)) {
    return originalFetch(url, options);
  }
  
  // Parse the gRPC service and method from URL
  const path = urlString.replace(apiUrl, '');
  
  console.log('🎭 Mock API intercepting request:', { url: urlString, path, apiUrl });
  
  try {
    let mockResponse: any;
    
    switch (path) {
      case '/dankfolio.v1.CoinService/GetAvailableCoins': {
        console.log('🎭 Returning mock GetAvailableCoins response');
        const response = create(GetAvailableCoinsResponseSchema, {
          coins: MOCK_COINS,
        });
        mockResponse = response;
        break;
      }
      
      case '/dankfolio.v1.CoinService/Search': {
        console.log('🎭 Returning mock Search response');
        // For search, return a subset of coins
        const response = create(SearchResponseSchema, {
          coins: MOCK_COINS.slice(0, 3), // Return first 3 coins for search
          totalCount: 3,
        });
        mockResponse = response;
        break;
      }
      
      case '/dankfolio.v1.CoinService/SearchCoinByMint': {
        console.log('🎭 Returning mock SearchCoinByMint response');
        // Return the first coin as a mock result
        const response = create(SearchCoinByMintResponseSchema, {
          coin: MOCK_COINS[0],
        });
        mockResponse = response;
        break;
      }
      
      case '/dankfolio.v1.WalletService/GetWalletBalances': {
        console.log('🎭 Returning mock GetWalletBalances response');
        const walletBalance = create(WalletBalanceSchema, {
          balances: MOCK_WALLET_BALANCES,
        });
        const response = create(GetWalletBalancesResponseSchema, {
          walletBalance,
        });
        mockResponse = response;
        break;
      }
      
      case '/dankfolio.v1.PriceService/GetPriceHistory': {
        console.log('🎭 Returning mock GetPriceHistory response');
        // Parse request to get the coin address
        let coinAddress = 'So11111111111111111111111111111111111111112'; // Default to SOL
        if (options?.body) {
          try {
            const requestData = JSON.parse(options.body as string);
            if (requestData.address) {
              coinAddress = requestData.address;
            }
          } catch (e) {
            // Ignore parsing errors, use default
          }
        }
        
        // Find the coin to get its price
        const coin = MOCK_COINS.find(c => c.mintAddress === coinAddress) || MOCK_COINS[4]; // Default to SOL
        const isStablecoin = coin.tags.includes('stablecoin');
        
        const data = create(PriceHistoryDataSchema, {
          items: generatePriceHistory(coin.price, isStablecoin),
        });
        
        const response = create(GetPriceHistoryResponseSchema, {
          data,
          success: true,
        });
        mockResponse = response;
        break;
      }
      
      case '/dankfolio.v1.TradeService/GetSwapQuote': {
        console.log('🎭 Returning mock GetSwapQuote response');
        const response = create(GetSwapQuoteResponseSchema, {
          estimatedAmount: '0.95',
          exchangeRate: '0.95',
          fee: '0.0025',
          priceImpact: '0.1',
          routePlan: ['Direct'],
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        });
        mockResponse = response;
        break;
      }
      
      default:
        console.log('🎭 Unhandled endpoint, falling back to original fetch:', path);
        // For unhandled endpoints, call the original fetch
        return originalFetch(url, options);
    }
    
    console.log('🎭 Mock API returning response for:', path);
    
    // Create a mock Response object
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('🎭 Mock API error:', error);
    // Fall back to original fetch on error
    return originalFetch(url, options);
  }
};

// Function to enable API mocking
export function enableApiMocking(): void {
  if (mockingEnabled) return;
  
  console.log('🎭 Enabling API mocking with gRPC-compatible responses');
  
  // Replace global fetch with our mock
  global.fetch = mockFetch;
  mockingEnabled = true;
  
  // Set global flag for debug wallet
  (global as any).__E2E_MOCKING_ENABLED__ = true;
}

// Function to disable API mocking
export function disableApiMocking(): void {
  if (!mockingEnabled) return;
  
  console.log('🎭 Disabling API mocking');
  
  // Restore original fetch
  global.fetch = originalFetch;
  mockingEnabled = false;
  
  // Clear global flag
  (global as any).__E2E_MOCKING_ENABLED__ = false;
}

// Check environment and auto-enable if needed
if (process.env.E2E_MOCKING_ENABLED === 'true') {
  enableApiMocking();
}

// Check if mocking should be enabled
export const shouldEnableMocking = () => {
  return process.env.E2E_MOCKING_ENABLED === 'true' || 
         process.env.LOAD_DEBUG_WALLET === 'true' || 
         env.debugMode;
}; 